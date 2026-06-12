import { Router, type IRouter } from "express";
import { db, businessProfilesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateReferralCode } from "../lib/utils";

const router: IRouter = Router();

// Get or create user by deviceId
router.get("/profile/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  try {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    
    if (!user) {
      console.log(`[USER] Creating new user for device: ${deviceId}`);
      const referralCode = generateReferralCode();
      [user] = await db.insert(usersTable).values({ deviceId, referralCode }).returning();
    } else if (!user.referralCode) {
      const referralCode = generateReferralCode();
      await db.update(usersTable).set({ referralCode }).where(eq(usersTable.id, user.id));
      user.referralCode = referralCode;
    }

    const [profile] = await db.select().from(businessProfilesTable).where(eq(businessProfilesTable.userId, user.id)).limit(1);
    
    res.json({ user, profile });
  } catch (error) {
    console.error(`[USER] Profile fetch error for device ${deviceId}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update business profile
router.post("/profile", async (req, res) => {
  const { deviceId, name, phone, email, address } = req.body;
  
  if (!deviceId || !name || !phone || !email || !address) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) {
      console.log(`[USER] Creating new user for device: ${deviceId}`);
      [user] = await db.insert(usersTable).values({ deviceId }).returning();
    }

    const [existingProfile] = await db.select().from(businessProfilesTable).where(eq(businessProfilesTable.userId, user.id)).limit(1);

    if (existingProfile) {
      await db.update(businessProfilesTable)
        .set({ name, phone, email, address, updatedAt: new Date() })
        .where(eq(businessProfilesTable.id, existingProfile.id));
    } else {
      await db.insert(businessProfilesTable).values({
        userId: user.id,
        name,
        phone,
        email,
        address
      });
    }

    // Also update user table with latest info
    await db.update(usersTable)
      .set({ businessName: name, phone, email, businessAddress: address })
      .where(eq(usersTable.id, user.id));

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(`[USER] Profile update error for device ${deviceId}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
