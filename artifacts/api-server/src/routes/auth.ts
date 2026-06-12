import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db, usersTable, businessProfilesTable, licensesTable, premiumRequestsTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { generateLicenseKey, generateReferralCode } from "../lib/utils";
import { sendEmail, templates } from "../lib/notifications";
import { USER_JWT_SECRET } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function signToken(userId: number, email: string, rememberMe = false): string {
  return jwt.sign({ userId, email }, USER_JWT_SECRET, {
    expiresIn: rememberMe ? "30d" : "7d",
  });
}

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    businessName: user.businessName,
    phone: user.phone,
    isPremium: user.isPremium,
    deviceId: user.deviceId,
    premiumExpiryDate: user.premiumExpiryDate,
    createdAt: user.createdAt,
  };
}

async function getActiveLicense(userId: number) {
  const [license] = await db
    .select()
    .from(licensesTable)
    .where(and(eq(licensesTable.userId, userId), eq(licensesTable.status, "active")))
    .limit(1);
  return license ?? null;
}

async function getPremiumRequest(userId: number) {
  const [req] = await db
    .select()
    .from(premiumRequestsTable)
    .where(eq(premiumRequestsTable.userId, userId))
    .orderBy(desc(premiumRequestsTable.id))
    .limit(1);
  return req ?? null;
}

// ─── POST /auth/check-email ──────────────────────────────────────────────────
// Real-time email availability check (no auth required)

router.post("/auth/check-email", async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) {
    return void res.status(400).json({ message: "Email is required" });
  }
  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);
    return void res.json({ available: !existing });
  } catch {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── POST /auth/register ─────────────────────────────────────────────────────
// Creates or upgrades a user account. Links to existing deviceId record when present.

router.post("/auth/register", async (req, res) => {
  const { deviceId, businessName, phone, email, password, city, state, landmark, country } = req.body;

  // Validation
  if (!businessName?.trim() || !phone?.trim() || !email?.trim() || !password) {
    return void res.status(400).json({ message: "Business name, phone, email and password are required" });
  }
  if (password.length < 6) {
    return void res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return void res.status(400).json({ message: "Please enter a valid email address" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. Check email uniqueness across all users
    const [emailUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (emailUser && emailUser.passwordHash) {
      // Email already has a full account — might be on a different device
      if (!deviceId || emailUser.deviceId !== deviceId) {
        return void res.status(409).json({
          message: "This email is already registered. Please login instead.",
          shouldLogin: true,
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    // 2. Find existing user — prefer deviceId match, fall back to email match
    let existingUser = emailUser;
    if (!existingUser && deviceId) {
      const [byDevice] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.deviceId, deviceId))
        .limit(1);
      existingUser = byDevice;
    }

    let user: typeof usersTable.$inferSelect;

    if (existingUser) {
      // Upgrade existing record — preserve usage history, referral data, etc.
      const [updated] = await db
        .update(usersTable)
        .set({
          email: normalizedEmail,
          phone: phone.trim(),
          businessName: businessName.trim(),
          passwordHash,
          lastLoginAt: now,
          lastSeen: now,
        })
        .where(eq(usersTable.id, existingUser.id))
        .returning();
      user = updated;
    } else {
      // Brand-new record (no matching deviceId or email)
      const newDeviceId = deviceId ?? `acc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const referralCode = generateReferralCode();
      const [created] = await db
        .insert(usersTable)
        .values({
          deviceId: newDeviceId,
          email: normalizedEmail,
          phone: phone.trim(),
          businessName: businessName.trim(),
          passwordHash,
          lastLoginAt: now,
          referralCode,
        })
        .returning();
      user = created;
    }

    // 3. Upsert business profile with structured address
    const addressParts = [city, state, landmark, country || "Nigeria"].filter(Boolean);
    const combinedAddress = addressParts.join(", ") || "—";

    const [existingProfile] = await db
      .select()
      .from(businessProfilesTable)
      .where(eq(businessProfilesTable.userId, user.id))
      .limit(1);

    if (existingProfile) {
      await db.update(businessProfilesTable).set({
        name: businessName.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
        address: combinedAddress,
        city: city || existingProfile.city,
        state: state || existingProfile.state,
        landmark: landmark || existingProfile.landmark,
        country: country || existingProfile.country || "Nigeria",
        updatedAt: now,
      }).where(eq(businessProfilesTable.id, existingProfile.id));
    } else {
      await db.insert(businessProfilesTable).values({
        userId: user.id,
        name: businessName.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
        address: combinedAddress,
        city: city ?? null,
        state: state ?? null,
        landmark: landmark ?? null,
        country: country || "Nigeria",
      });
    }

    // 4. Create a premium request (tracks upgrade intent — no license yet!)
    const existingRequest = await getPremiumRequest(user.id);
    if (!existingRequest) {
      await db.insert(premiumRequestsTable).values({
        userId: user.id,
        licenseType: "one_tailor",
        status: "pending",
      });
    }

    // 5. Send welcome email (non-blocking)
    sendEmail(
      normalizedEmail,
      templates.welcome(businessName.trim()).subject,
      templates.welcome(businessName.trim()).html
    ).catch(() => {});

    // 6. Issue JWT
    const token = signToken(user.id, normalizedEmail);

    return void res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error("[AUTH] Register error:", error);
    return void res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

// ─── POST /auth/login ────────────────────────────────────────────────────────

router.post("/auth/login", async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email?.trim() || !password) {
    return void res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.passwordHash) {
      return void res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return void res.status(401).json({ message: "Invalid email or password" });
    }

    const now = new Date();
    await db.update(usersTable).set({ lastLoginAt: now, lastSeen: now }).where(eq(usersTable.id, user.id));

    // Sync premium from active license (restores premium on new devices automatically)
    const activeLicense = await getActiveLicense(user.id);
    const isCurrentlyPremium = activeLicense !== null;

    if (isCurrentlyPremium !== user.isPremium) {
      await db.update(usersTable).set({ isPremium: isCurrentlyPremium }).where(eq(usersTable.id, user.id));
    }

    // Include premium request status for abandoned-payment resume flow
    const premiumRequest = await getPremiumRequest(user.id);

    const token = signToken(user.id, user.email!, !!rememberMe);

    return void res.json({
      token,
      user: sanitizeUser({ ...user, isPremium: isCurrentlyPremium }),
      pendingPremiumRequest: premiumRequest
        ? {
            status: premiumRequest.status,
            licenseType: premiumRequest.licenseType,
            canResume: !isCurrentlyPremium && premiumRequest.status !== "approved",
          }
        : null,
    });
  } catch (error) {
    console.error("[AUTH] Login error:", error);
    return void res.status(500).json({ message: "Login failed. Please try again." });
  }
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────
// Validate session, revalidate premium, return full user state

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return void res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, USER_JWT_SECRET) as { userId: number };
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .limit(1);

    if (!user) return void res.status(404).json({ message: "Account not found" });

    // Re-validate premium status from license (cross-device, no stale cache)
    const activeLicense = await getActiveLicense(user.id);
    const isCurrentlyPremium = activeLicense !== null;

    if (isCurrentlyPremium !== user.isPremium) {
      await db.update(usersTable).set({ isPremium: isCurrentlyPremium }).where(eq(usersTable.id, user.id));
    }

    const [profile] = await db
      .select()
      .from(businessProfilesTable)
      .where(eq(businessProfilesTable.userId, user.id))
      .limit(1);

    const premiumRequest = await getPremiumRequest(user.id);

    return void res.json({
      user: sanitizeUser({ ...user, isPremium: isCurrentlyPremium }),
      profile: profile ?? null,
      license: activeLicense ? { status: activeLicense.status, licenseType: activeLicense.licenseType } : null,
      pendingPremiumRequest: premiumRequest
        ? {
            status: premiumRequest.status,
            licenseType: premiumRequest.licenseType,
            canResume: !isCurrentlyPremium && premiumRequest.status !== "approved",
          }
        : null,
    });
  } catch {
    return void res.status(403).json({ message: "Invalid or expired session" });
  }
});

// ─── POST /auth/forgot-password ──────────────────────────────────────────────

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  // Always respond the same to prevent email enumeration
  const safeResponse = { message: "If an account with that email exists, a reset link has been sent." };

  if (!email?.trim()) return void res.status(400).json({ message: "Email is required" });

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (user?.passwordHash) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.update(usersTable).set({
        passwordResetToken: resetToken,
        passwordResetExpiry: expiry,
      }).where(eq(usersTable.id, user.id));

      const frontendUrl = process.env["FRONTEND_URL"] || "http://localhost:5173";
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
      const tpl = templates.passwordReset(user.businessName || user.email || "User", resetLink);
      sendEmail(user.email!, tpl.subject, tpl.html).catch(() => {});
    }
  } catch (error) {
    console.error("[AUTH] Forgot password error:", error);
  }

  return void res.json(safeResponse);
});

// ─── POST /auth/reset-password ───────────────────────────────────────────────

router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return void res.status(400).json({ message: "Token and password are required" });
  }
  if (password.length < 6) {
    return void res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.passwordResetToken, token),
          gt(usersTable.passwordResetExpiry, new Date())
        )
      )
      .limit(1);

    if (!user) {
      return void res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(usersTable).set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      lastLoginAt: new Date(),
    }).where(eq(usersTable.id, user.id));

    return void res.json({ message: "Password reset successfully. You can now login." });
  } catch (error) {
    console.error("[AUTH] Reset password error:", error);
    return void res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
});

export default router;
