import { Router, type IRouter } from "express";
import { db, licensesTable, usersTable, licenseActivationsTable } from "@workspace/db";
import { eq, and, desc, or } from "drizzle-orm";
import { authenticateAdmin } from "../middlewares/auth";
import { generateLicenseKey } from "../lib/utils";
import { sendEmail, templates } from "../lib/notifications";

const router: IRouter = Router();

router.post("/license/verify", async (req, res) => {
  const { key, deviceId } = req.body as { key?: string; deviceId?: string };

  if (!key || typeof key !== "string") {
    res.status(400).json({ valid: false, message: "License key is required." });
    return;
  }

  try {
    const formattedKey = key.trim().toUpperCase();
    
    // Check master key
    const masterKey = process.env["MASTER_LICENSE_KEY"]?.trim().toUpperCase();
    if (masterKey && formattedKey === masterKey) {
      if (deviceId) {
        await db.update(usersTable).set({ isPremium: true }).where(eq(usersTable.deviceId, deviceId));
      }
      res.json({ valid: true, message: "License activated successfully.", licenseType: "all_apps" });
      return;
    }

    const [license] = await db.select().from(licensesTable)
      .where(and(eq(licensesTable.key, formattedKey), eq(licensesTable.status, "active")))
      .limit(1);

    if (license) {
      if (deviceId) {
        // Record activation
        await db.insert(licenseActivationsTable).values({
          licenseId: license.id,
          deviceId
        });
        // Activate user
        await db.update(usersTable).set({ isPremium: true }).where(eq(usersTable.deviceId, deviceId));
      }
      res.json({ 
        valid: true, 
        message: "License activated successfully.", 
        licenseType: license.licenseType 
      });
    } else {
      res.json({ valid: false, message: "Invalid or disabled license key." });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// License Recovery
router.post("/license/recover", async (req, res) => {
  const { identifier, deviceId } = req.body; // identifier can be email or license key

  try {
    const [license] = await db.select().from(licensesTable)
      .where(or(
        eq(licensesTable.email, identifier),
        eq(licensesTable.key, identifier.toUpperCase())
      ))
      .limit(1);

    if (!license || license.status !== "active") {
      res.status(404).json({ message: "No active license found with this email or key" });
      return;
    }

    if (deviceId) {
      await db.update(usersTable).set({ isPremium: true }).where(eq(usersTable.deviceId, deviceId));
      await db.insert(licenseActivationsTable).values({
        licenseId: license.id,
        deviceId
      });
    }

    res.json({ 
      message: "License recovered successfully", 
      license: {
        key: license.key,
        businessName: license.businessName,
        activationDate: license.activationDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin License Management
router.get("/admin/licenses", authenticateAdmin as any, async (req, res) => {
  try {
    const licenses = await db.select().from(licensesTable).orderBy(desc(licensesTable.createdAt));
    // Enrich licenses that have a userId but missing name/contact fields with user data
    const enriched = await Promise.all(licenses.map(async (lic) => {
      if (lic.userId && (!lic.businessName || !lic.email || !lic.phone)) {
        try {
          const [user] = await db.select().from(usersTable).where(eq(usersTable.id, lic.userId)).limit(1);
          if (user) {
            return {
              ...lic,
              businessName: lic.businessName || user.businessName || null,
              email: lic.email || user.email || null,
              phone: lic.phone || user.phone || null,
            };
          }
        } catch { /* non-critical — return original */ }
      }
      return lic;
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/licenses", authenticateAdmin as any, async (req, res) => {
  const { customerName, businessName, email, phone } = req.body;
  
  try {
    const key = generateLicenseKey();
    await db.insert(licensesTable).values({ 
      key, 
      status: "active",
      customerName,
      businessName,
      email,
      phone
    });

    if (email) {
      const emailTemplate = templates.licenseActivated(businessName || customerName || "Customer", key);
      await sendEmail(email, emailTemplate.subject, emailTemplate.html);
    }

    res.json({ message: "License created successfully", key });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/admin/licenses/:id/status", authenticateAdmin as any, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' | 'suspended' | 'revoked'
  try {
    await db.update(licensesTable).set({ status }).where(eq(licensesTable.id, parseInt(id)));
    res.json({ message: `License status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/licenses/:id/resend", authenticateAdmin as any, async (req, res) => {
  const { id } = req.params;
  try {
    const [license] = await db.select().from(licensesTable).where(eq(licensesTable.id, parseInt(id))).limit(1);
    if (!license) {
      res.status(404).json({ message: "License not found" });
      return;
    }

    if (license.email) {
      const emailTemplate = templates.licenseActivated(license.businessName || license.customerName || "Customer", license.key);
      await sendEmail(license.email, emailTemplate.subject, emailTemplate.html);
    }

    res.json({ 
      message: license.email ? "License details resent via email" : "License details ready (no email on file)",
      details: {
        key: license.key,
        businessName: license.businessName,
        email: license.email,
        phone: license.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
