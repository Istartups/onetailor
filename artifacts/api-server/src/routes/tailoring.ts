import { Router, type IRouter } from "express";
import { db, tailoringCustomersTable, tailoringMeasurementsTable, usersTable } from "@workspace/db";
import { eq, and, desc, or, ilike } from "drizzle-orm";

const router: IRouter = Router();

// --- Customer Management ---

// Search/List Customers
router.get("/tailoring/customers", async (req, res) => {
  const { deviceId, search } = req.query;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId as string)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });

    let query = db.select().from(tailoringCustomersTable).where(eq(tailoringCustomersTable.userId, user.id));

    if (search) {
      const searchStr = `%${search}%`;
      query = db.select().from(tailoringCustomersTable).where(
        and(
          eq(tailoringCustomersTable.userId, user.id),
          or(
            ilike(tailoringCustomersTable.name, searchStr),
            ilike(tailoringCustomersTable.phone, searchStr)
          )
        )
      );
    }

    const customers = await query.orderBy(desc(tailoringCustomersTable.updatedAt));
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add/Update Customer
router.post("/tailoring/customers", async (req, res) => {
  const { deviceId, id, name, phone, gender, email, address, notes } = req.body;
  // gender: 'male' | 'female' | 'others'

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });

    if (id) {
      // Update
      const [updated] = await db.update(tailoringCustomersTable)
        .set({ name, phone, gender, email, address, notes, updatedAt: new Date() })
        .where(and(eq(tailoringCustomersTable.id, id), eq(tailoringCustomersTable.userId, user.id)))
        .returning();
      res.json(updated);
    } else {
      // Create
      const [created] = await db.insert(tailoringCustomersTable)
        .values({ userId: user.id, name, phone, gender, email, address, notes })
        .returning();
      res.json(created);
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete Customer
router.delete("/tailoring/customers/:id", async (req, res) => {
  const { id } = req.params;
  const { deviceId } = req.query;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId as string)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });

    // Delete measurements first
    await db.delete(tailoringMeasurementsTable).where(eq(tailoringMeasurementsTable.customerId, parseInt(id)));
    // Delete customer
    await db.delete(tailoringCustomersTable).where(and(eq(tailoringCustomersTable.id, parseInt(id)), eq(tailoringCustomersTable.userId, user.id)));

    res.json({ message: "Customer deleted" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Measurement Management ---

// Recent measurements across all customers for this device (home page widget)
router.get("/tailoring/measurements/recent", async (req, res) => {
  const { deviceId, limit = "8", category } = req.query;
  if (!deviceId) return void res.status(400).json({ message: "deviceId required" });

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId as string)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });

    const whereClause = category
      ? and(eq(tailoringCustomersTable.userId, user.id), eq(tailoringMeasurementsTable.category, category as string))
      : eq(tailoringCustomersTable.userId, user.id);

    const results = await db
      .select({
        id: tailoringMeasurementsTable.id,
        customerId: tailoringMeasurementsTable.customerId,
        customerName: tailoringCustomersTable.name,
        label: tailoringMeasurementsTable.label,
        category: tailoringMeasurementsTable.category,
        createdAt: tailoringMeasurementsTable.createdAt,
      })
      .from(tailoringMeasurementsTable)
      .leftJoin(tailoringCustomersTable, eq(tailoringMeasurementsTable.customerId, tailoringCustomersTable.id))
      .where(whereClause)
      .orderBy(desc(tailoringMeasurementsTable.createdAt))
      .limit(parseInt(limit as string) || 8);

    return void res.json(results);
  } catch (error) {
    console.error("[TAILORING] Recent measurements error:", error);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// List Measurements for a Customer
router.get("/tailoring/measurements/:customerId", async (req, res) => {
  const { customerId } = req.params;

  try {
    const measurements = await db.select().from(tailoringMeasurementsTable)
      .where(eq(tailoringMeasurementsTable.customerId, parseInt(customerId)))
      .orderBy(desc(tailoringMeasurementsTable.createdAt));
    res.json(measurements);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Save Measurement Record
router.post("/tailoring/measurements", async (req, res) => {
  const { id, customerId, label, category, values, isCustom } = req.body;

  try {
    let result;
    if (id) {
      // Update existing record
      [result] = await db.update(tailoringMeasurementsTable)
        .set({
          label,
          category,
          values: typeof values === 'string' ? values : JSON.stringify(values),
          isCustom: isCustom || false,
          updatedAt: new Date()
        })
        .where(eq(tailoringMeasurementsTable.id, id))
        .returning();
    } else {
      // Insert new record
      [result] = await db.insert(tailoringMeasurementsTable)
        .values({
          customerId,
          label,
          category,
          values: typeof values === 'string' ? values : JSON.stringify(values),
          isCustom: isCustom || false
        })
        .returning();
    }

    // Update customer's updatedAt timestamp
    await db.update(tailoringCustomersTable)
      .set({ updatedAt: new Date() })
      .where(eq(tailoringCustomersTable.id, customerId));

    res.json(result);
  } catch (error) {
    console.error("[TAILORING] Save measurement error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete Measurement Record
router.delete("/tailoring/measurements/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(tailoringMeasurementsTable).where(eq(tailoringMeasurementsTable.id, parseInt(id)));
    res.json({ message: "Measurement record deleted" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
