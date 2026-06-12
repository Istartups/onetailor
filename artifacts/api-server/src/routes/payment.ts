import { Router, type IRouter, type Response } from "express";
import { db, paymentSettingsTable, paymentsTable, usersTable, licensesTable, licenseActivationsTable, premiumRequestsTable, businessProfilesTable } from "@workspace/db";
import { eq, desc, and, or, isNotNull } from "drizzle-orm";
import { authenticateAdmin } from "../middlewares/auth";
import axios from "axios";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateLicenseKey, generateReferralCode } from "../lib/utils";
import { sendEmail, templates } from "../lib/notifications";
import crypto from "crypto";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Approve/activate the license for a user. Handles both new and existing licenses. */
async function activateLicenseForUser(userId: number, meta: {
  customerName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  deviceId?: string;
}): Promise<{ licenseKey: string; licenseId: number; isNew: boolean }> {
  const [existingLicense] = await db.select().from(licensesTable)
    .where(eq(licensesTable.userId, userId)).limit(1);

  if (existingLicense) {
    // Activate if not already active (backward compat with old pending licenses)
    if (existingLicense.status !== "active") {
      await db.update(licensesTable).set({
        status: "active",
        activationDate: new Date(),
      }).where(eq(licensesTable.id, existingLicense.id));
    }
    return { licenseKey: existingLicense.key, licenseId: existingLicense.id, isNew: false };
  }

  // Create fresh active license
  const licenseKey = generateLicenseKey();
  const [newLicense] = await db.insert(licensesTable).values({
    userId,
    key: licenseKey,
    status: "active",
    activationDate: new Date(),
    licenseType: "one_tailor",
    customerName: meta.customerName,
    email: meta.email,
    phone: meta.phone,
    businessName: meta.businessName,
  }).returning();

  // Record activation
  try {
    await db.insert(licenseActivationsTable).values({
      licenseId: newLicense.id,
      deviceId: meta.deviceId || "system",
    });
  } catch { /* activation record is non-critical */ }

  return { licenseKey: newLicense.key, licenseId: newLicense.id, isNew: true };
}

/** Link the premium request to an approved payment and license. */
async function approvePremiumRequest(userId: number, licenseId: number, paymentId?: number) {
  try {
    const [req] = await db.select().from(premiumRequestsTable)
      .where(eq(premiumRequestsTable.userId, userId))
      .orderBy(desc(premiumRequestsTable.id))
      .limit(1);
    if (req) {
      await db.update(premiumRequestsTable).set({
        status: "approved",
        licenseId,
        paymentId: paymentId ?? req.paymentId,
        updatedAt: new Date(),
      }).where(eq(premiumRequestsTable.id, req.id));
    }
  } catch { /* non-critical */ }
}

/** Mark premium request as payment_submitted and link payment record. */
async function markPaymentSubmitted(userId: number, paymentId: number) {
  try {
    const [req] = await db.select().from(premiumRequestsTable)
      .where(and(
        eq(premiumRequestsTable.userId, userId),
        or(eq(premiumRequestsTable.status, "pending"), eq(premiumRequestsTable.status, "rejected")),
      ))
      .orderBy(desc(premiumRequestsTable.id))
      .limit(1);
    if (req) {
      await db.update(premiumRequestsTable).set({
        status: "payment_submitted",
        paymentId,
        updatedAt: new Date(),
      }).where(eq(premiumRequestsTable.id, req.id));
    }
  } catch { /* non-critical */ }
}

/** Mark premium request as rejected so the user sees the correct state and can retry. */
async function resetPremiumRequest(userId: number) {
  try {
    await db.update(premiumRequestsTable).set({
      status: "rejected",
      paymentId: null,
      updatedAt: new Date(),
    }).where(and(
      eq(premiumRequestsTable.userId, userId),
      eq(premiumRequestsTable.status, "payment_submitted")
    ));
  } catch { /* non-critical */ }
}

// ─── Paystack Webhook ─────────────────────────────────────────────────────────

router.post("/payment/paystack/webhook", async (req, res) => {
  const event = req.body;

  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    const secret = settings?.paystackSecretKey;

    if (!secret) {
      return void res.status(500).json({ message: "Paystack secret not configured" });
    }

    const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");
    if (hash !== req.headers["x-paystack-signature"]) {
      return void res.status(401).send("Unauthorized");
    }

    if (event.event === "charge.success") {
      const { reference, metadata, amount, customer } = event.data;
      const { userId, deviceId } = metadata;

      // Duplicate protection
      const [existing] = await db.select().from(paymentsTable)
        .where(eq(paymentsTable.reference, reference)).limit(1);
      if (existing?.status === "success") {
        return void res.status(200).send("Already processed");
      }

      // Upsert payment record
      let paymentId: number;
      if (existing) {
        await db.update(paymentsTable).set({ status: "success", verifiedAt: new Date() })
          .where(eq(paymentsTable.id, existing.id));
        paymentId = existing.id;
      } else {
        const [inserted] = await db.insert(paymentsTable).values({
          userId,
          amount: amount / 100,
          method: "paystack",
          status: "success",
          reference,
          verifiedAt: new Date(),
        }).returning();
        paymentId = inserted.id;
      }

      // Activate premium
      await db.update(usersTable).set({ isPremium: true }).where(eq(usersTable.id, userId));

      // Activate/create license
      const { licenseId } = await activateLicenseForUser(userId, {
        customerName: customer.first_name || "Customer",
        email: customer.email,
        deviceId: deviceId || "paystack-webhook",
      });

      // Update premium request pipeline
      await approvePremiumRequest(userId, licenseId, paymentId);

      // Notify user (no license key shown)
      const tpl = templates.premiumActivated(customer.first_name || "Customer");
      sendEmail(customer.email, tpl.subject, tpl.html).catch(() => {});

      res.status(200).send("Webhook handled");
    } else {
      res.status(200).send("Event ignored");
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Internal Error");
  }
});

// ─── File upload for manual payment evidence ──────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/evidence";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + suffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only images (JPG/PNG) and PDFs are allowed."));
  },
});

// ─── Public Routes ─────────────────────────────────────────────────────────────

router.get("/payment-info", async (req, res) => {
  try {
    let settings = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);

    if (settings.length === 0) {
      const defaultSettings = {
        id: 1, price: 15000, globalUsageLimit: 25, measurementLimit: 25,
        currencyCode: "NGN", currencySymbol: "₦", bankName: "Opay",
        accountNumber: "1234567890", accountName: "OneTailor Technologies",
        instructions: "Pay into the account above and send proof of payment to support.",
        isPaystackEnabled: true, isManualEnabled: true,
        proUpgradeMessage: "Unlock Premium to access more features.",
        proUpgradeButtonText: "⭐ Unlock Premium",
      };
      try { await db.insert(paymentSettingsTable).values(defaultSettings as any).onConflictDoNothing(); } catch {}
      settings = [defaultSettings as any];
    }

    const currentSettings = settings[0];
    const deviceId = req.query.deviceId as string;
    let userInfo = null;

    if (deviceId) {
      let [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);

      if (!user) {
        const referralCode = generateReferralCode();
        const [newUser] = await db.insert(usersTable).values({ deviceId, referralCode, totalUsageCount: 0 }).returning();
        user = newUser;
      } else if (!user.referralCode) {
        const referralCode = generateReferralCode();
        await db.update(usersTable).set({ referralCode }).where(eq(usersTable.id, user.id));
        user.referralCode = referralCode;
      }

      if (user) {
        userInfo = {
          id: user.id, isPremium: user.isPremium,
          totalUsageCount: user.totalUsageCount, bonusUsageLimit: user.bonusUsageLimit ?? 0,
          remainingUsage: Math.max(0, (currentSettings?.globalUsageLimit || 25) + (user.bonusUsageLimit ?? 0) - user.totalUsageCount),
          referralCode: user.referralCode, successfulInvites: user.successfulInvites,
          referredBy: user.referredBy, referralConfirmed: user.referralConfirmed,
          premiumExpiryDate: user.premiumExpiryDate,
        };
      }
    }

    const publicSettings = currentSettings ? { ...currentSettings } : {};
    delete (publicSettings as any).paystackSecretKey;
    delete (publicSettings as any).smtpPass;

    res.json({ ...publicSettings, user: userInfo });
  } catch (error) {
    console.error("Payment info fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Record Tool Usage ────────────────────────────────────────────────────────

router.post("/usage/record", async (req, res) => {
  const { deviceId, toolId } = req.body;
  if (!deviceId) return void res.status(400).json({ message: "deviceId is required" });

  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });

    if (settings && !settings.isUsageLimitEnabled) {
      return void res.json({ success: true, unlimited: true, totalUsageCount: user.totalUsageCount });
    }

    const isPremium = user.isPremium || (user.premiumExpiryDate && user.premiumExpiryDate > new Date());
    if (isPremium) {
      return void res.json({ success: true, isPremium: true, totalUsageCount: user.totalUsageCount });
    }

    const limit = (settings?.globalUsageLimit || 25) + (user.bonusUsageLimit ?? 0);
    if (user.totalUsageCount >= limit) {
      return void res.status(403).json({ message: "Your free uses are finished", totalUsageCount: user.totalUsageCount, limit });
    }

    const newCount = user.totalUsageCount + 1;
    await db.update(usersTable).set({ totalUsageCount: newCount, lastSeen: new Date() }).where(eq(usersTable.id, user.id));

    // Referral reward on first usage
    if (newCount === 1 && user.referredBy && !user.referralConfirmed) {
      await db.update(usersTable).set({ referralConfirmed: true }).where(eq(usersTable.id, user.id));
      const [inviter] = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
      if (inviter) {
        const newInviteCount = (inviter.successfulInvites ?? 0) + 1;
        let bonusUsage = inviter.bonusUsageLimit ?? 0;
        let rewardLevel = inviter.referralRewardLevel ?? 0;
        let premiumExpiry = inviter.premiumExpiryDate || new Date();
        if (premiumExpiry < new Date()) premiumExpiry = new Date();
        if (newInviteCount === 1) { bonusUsage += 5; rewardLevel = 1; }
        else if (newInviteCount === 3) { premiumExpiry.setDate(premiumExpiry.getDate() + 7); rewardLevel = 2; }
        else if (newInviteCount === 10) { premiumExpiry.setDate(premiumExpiry.getDate() + 30); rewardLevel = 3; }
        else if (newInviteCount > 1 && newInviteCount < 3) { bonusUsage += 2; }
        await db.update(usersTable).set({
          successfulInvites: newInviteCount, bonusUsageLimit: bonusUsage,
          referralRewardLevel: rewardLevel, premiumExpiryDate: premiumExpiry,
        }).where(eq(usersTable.id, inviter.id));
      }
    }

    res.json({ success: true, totalUsageCount: newCount, remainingUsage: Math.max(0, limit - newCount) });
  } catch (error) {
    console.error("Usage record error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Apply Referral Code ──────────────────────────────────────────────────────

router.post("/referral/apply", async (req, res) => {
  const { deviceId, code } = req.body;
  if (!deviceId || !code) return void res.status(400).json({ message: "deviceId and code are required" });

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });
    if (user.referredBy) return void res.status(400).json({ message: "Referral code already applied" });
    if (user.referralCode === code) return void res.status(400).json({ message: "Cannot refer yourself" });

    const [inviter] = await db.select().from(usersTable).where(eq(usersTable.referralCode, code)).limit(1);
    if (!inviter) return void res.status(404).json({ message: "Invalid referral code" });

    await db.update(usersTable).set({ referredBy: inviter.id }).where(eq(usersTable.id, user.id));
    res.json({ message: "Referral code applied successfully" });
  } catch (error) {
    console.error("Referral apply error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Paystack: Initialize ─────────────────────────────────────────────────────

router.post("/payment/paystack/initialize", async (req, res) => {
  const { deviceId, email, amount } = req.body;

  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    if (!settings?.isPaystackEnabled || !settings.paystackSecretKey) {
      return void res.status(400).json({ message: "Paystack is currently disabled" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Naira → Kobo
        currency: settings.currencyCode || "NGN",
        callback_url: `${process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : (process.env["API_URL"] || `${req.protocol}://${req.get("host")}`)}/api/payment/paystack/verify`,
        metadata: { deviceId, userId: user.id },
      },
      { headers: { Authorization: `Bearer ${settings.paystackSecretKey}`, "Content-Type": "application/json" } }
    );

    const [inserted] = await db.insert(paymentsTable).values({
      userId: user.id,
      amount,
      method: "paystack",
      status: "pending",
      reference: response.data.data.reference,
    }).returning();

    // Mark premium request as payment submitted
    await markPaymentSubmitted(user.id, inserted.id);

    res.json(response.data);
  } catch (error: any) {
    console.error("Paystack Init Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to initialize payment" });
  }
});

// ─── Paystack: Verify ─────────────────────────────────────────────────────────

router.get("/payment/paystack/verify", async (req, res) => {
  const { trxref, reference } = req.query;
  const ref = (reference || trxref) as string;
  const FRONTEND = process.env["FRONTEND_URL"] || (process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : "http://localhost:5173");

  try {
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { Authorization: `Bearer ${settings.paystackSecretKey}` },
    });

    if (response.data.data.status === "success") {
      const { userId, deviceId } = response.data.data.metadata;
      const customer = response.data.data.customer;

      // Duplicate check
      const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, ref)).limit(1);
      if (existing?.status === "success") {
        return void res.redirect(`${FRONTEND}/pre-unlock/success?ref=${ref}`);
      }

      // Update payment
      let paymentId: number;
      if (existing) {
        await db.update(paymentsTable).set({ status: "success", verifiedAt: new Date() }).where(eq(paymentsTable.id, existing.id));
        paymentId = existing.id;
      } else {
        const [inserted] = await db.insert(paymentsTable).values({
          userId,
          amount: response.data.data.amount / 100,
          method: "paystack",
          status: "success",
          reference: ref,
          verifiedAt: new Date(),
        }).returning();
        paymentId = inserted.id;
      }

      // Activate premium
      await db.update(usersTable).set({ isPremium: true }).where(eq(usersTable.id, userId));

      // Activate/create license
      const { licenseId } = await activateLicenseForUser(userId, {
        customerName: customer.first_name || "Customer",
        email: customer.email,
        deviceId: deviceId || "paystack-verify",
      });

      // Update premium request
      await approvePremiumRequest(userId, licenseId, paymentId);

      // Notify user (no license key)
      const tpl = templates.premiumActivated(customer.first_name || "Customer");
      sendEmail(customer.email, tpl.subject, tpl.html).catch(() => {});

      res.redirect(`${FRONTEND}/pre-unlock/success?ref=${ref}`);
    } else {
      res.redirect(`${FRONTEND}/pre-unlock/failed?ref=${ref}`);
    }
  } catch (error) {
    console.error("Paystack verify error:", error);
    res.status(500).send("Verification failed");
  }
});

// ─── Manual Payment Submission ────────────────────────────────────────────────

router.post("/payment/manual", upload.single("evidence"), async (req, res) => {
  const { deviceId, amount } = req.body;
  const file = req.file;

  if (!deviceId || !amount || !file) {
    return void res.status(400).json({ message: "Missing required fields (deviceId, amount, or evidence file)" });
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });

    const [inserted] = await db.insert(paymentsTable).values({
      userId: user.id,
      amount: parseInt(amount),
      method: "manual",
      status: "pending",
      evidenceUrl: `/uploads/evidence/${file.filename}`,
    }).returning();

    // Link to premium request pipeline
    await markPaymentSubmitted(user.id, inserted.id);

    // Notify admin
    try {
      const tpl = templates.manualPaymentReceived(user.businessName || "New User", parseInt(amount));
      await sendEmail(process.env["ADMIN_EMAIL"] || "admin@onetailor.com", tpl.subject, tpl.html);
    } catch { /* non-critical */ }

    res.json({ message: "Payment submitted for verification" });
  } catch (error) {
    console.error("Manual payment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── PWA Icon / Favicon (dynamic from DB) ─────────────────────────────────────

function serveDataUrl(data: string, res: Response): void {
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) { res.status(400).send("Invalid image data"); return; }
  const [, mimeType, b64] = match;
  const buf = Buffer.from(b64, "base64");
  res.setHeader("Content-Type", mimeType!);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.end(buf);
}

router.get("/pwa-icon", async (req, res) => {
  try {
    const [s] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    const data = (s as any)?.pwaLogoData as string | undefined;
    if (data && data.startsWith("data:")) return void serveDataUrl(data, res as any);
  } catch { /* fall through */ }
  return void res.redirect("/pwa-512x512.png");
});

router.get("/pwa-favicon", async (req, res) => {
  try {
    const [s] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    const data = (s as any)?.pwaFaviconData as string | undefined;
    if (data && data.startsWith("data:")) return void serveDataUrl(data, res as any);
  } catch { /* fall through */ }
  return void res.redirect("/favicon.ico");
});

// ─── PWA Manifest (public) ────────────────────────────────────────────────────

router.get("/pwa-manifest", async (req, res) => {
  try {
    const [s] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    const hasCustomIcon = !!(s as any)?.pwaLogoData;
    const icons = hasCustomIcon
      ? [
          { src: "/api/pwa-icon", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "/api/pwa-icon", sizes: "192x192", type: "image/png" },
        ]
      : [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ];
    const manifest = {
      name: s?.pwaName || "OneTailor Toolkit",
      short_name: s?.pwaShortName || "OneTailor",
      description: s?.pwaDescription || "All the tools a tailor needs, in one place.",
      theme_color: s?.pwaThemeColor || "#6D28D9",
      background_color: s?.pwaBackgroundColor || "#ffffff",
      display: "standalone",
      start_url: "/",
      icons,
    };
    res.setHeader("Content-Type", "application/manifest+json");
    return void res.json(manifest);
  } catch {
    return void res.status(500).json({ message: "Could not load manifest" });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

router.put("/payment-info", authenticateAdmin as any, async (req, res) => {
  const body = req.body;
  try {
    const updateData: any = {};
    const allowedFields = [
      "price", "isPaystackEnabled", "isManualEnabled",
      "paystackPublicKey", "paystackSecretKey",
      "bankName", "accountNumber", "accountName",
      "instructions", "paymentLink", "globalUsageLimit",
      "measurementLimit", "proUpgradeMessage",
      "proUpgradeLink", "proUpgradeButtonText",
      "currencyCode", "currencySymbol",
      "isDebugMode", "isUsageLimitEnabled",
      "pwaName", "pwaShortName", "pwaDescription",
      "pwaThemeColor", "pwaBackgroundColor",
      "price2Device", "price3Device", "price5Device",
      "pwaLogoData", "pwaFaviconData", "pwaSplashData",
      "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpSecure",
      "emailFromName", "emailFromAddr", "resendApiKey",
      "isSmtpEnabled", "isResendEnabled",
    ];

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (["price", "globalUsageLimit", "measurementLimit", "price2Device", "price3Device", "price5Device", "smtpPort"].includes(key)) {
          updateData[key] = parseInt(body[key]) || 0;
        } else if (["paystackSecretKey", "smtpPass", "resendApiKey"].includes(key)) {
          // Never overwrite with empty string — GET strips these fields,
          // so saving without re-entering would otherwise wipe them.
          if (body[key] && typeof body[key] === "string" && body[key].trim() !== "") {
            updateData[key] = body[key].trim();
          }
        } else {
          updateData[key] = body[key];
        }
      }
    }

    await db.update(paymentSettingsTable).set({ ...updateData, updatedAt: new Date() }).where(eq(paymentSettingsTable.id, 1));
    res.json({ message: "Payment settings updated" });
  } catch (error) {
    console.error("Payment settings update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/admin/payments", authenticateAdmin as any, async (req, res) => {
  try {
    const payments = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
    res.json(payments);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/payments/:id/approve", authenticateAdmin as any, async (req, res) => {
  const { id } = req.params;
  try {
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, parseInt(id))).limit(1);
    if (!payment) return void res.status(404).json({ message: "Payment not found" });

    // 1. Update payment status
    await db.update(paymentsTable).set({ status: "success", verifiedAt: new Date() }).where(eq(paymentsTable.id, payment.id));

    // 2. Activate premium
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payment.userId)).limit(1);
    if (!user) return void res.status(404).json({ message: "User not found" });

    await db.update(usersTable).set({ isPremium: true }).where(eq(usersTable.id, user.id));

    // 3. Activate/create license (handles both new and legacy pending licenses)
    const { licenseId } = await activateLicenseForUser(user.id, {
      customerName: user.businessName ?? undefined,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      businessName: user.businessName ?? undefined,
      deviceId: user.deviceId,
    });

    // 4. Update premium request pipeline
    await approvePremiumRequest(user.id, licenseId, payment.id);

    // 5. Notify user — no license key shown
    if (user.email) {
      const tpl = templates.premiumActivated(user.businessName || "Customer");
      sendEmail(user.email, tpl.subject, tpl.html).catch(() => {});
    }

    res.json({ message: "Payment approved and premium activated" });
  } catch (error) {
    console.error("Approve error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/payments/:id/reject", authenticateAdmin as any, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, parseInt(id))).limit(1);
    if (!payment) return void res.status(404).json({ message: "Payment not found" });

    await db.update(paymentsTable).set({ status: "failed", adminNotes: reason }).where(eq(paymentsTable.id, payment.id));

    // Reset premium request so user can retry payment
    await resetPremiumRequest(payment.userId);

    // Notify user
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payment.userId)).limit(1);
    if (user?.email) {
      const tpl = templates.paymentRejected(reason || "Payment could not be verified.");
      sendEmail(user.email, tpl.subject, tpl.html).catch(() => {});
    }

    res.json({ message: "Payment rejected" });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Admin: Accounts List ─────────────────────────────────────────────────────
// Returns all registered accounts (users with a password) with computed status.

router.get("/admin/accounts", authenticateAdmin as any, async (req, res) => {
  try {
    const accounts = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        businessName: usersTable.businessName,
        phone: usersTable.phone,
        isPremium: usersTable.isPremium,
        status: usersTable.status,
        lastLoginAt: usersTable.lastLoginAt,
        createdAt: usersTable.createdAt,
        premiumExpiryDate: usersTable.premiumExpiryDate,
      })
      .from(usersTable)
      .where(isNotNull(usersTable.passwordHash))
      .orderBy(desc(usersTable.createdAt));

    // Enrich with premium request, payment status, profile per account
    const results = await Promise.all(
      accounts.map(async (acc: typeof accounts[number]) => {
        const [premiumRequest] = await db.select().from(premiumRequestsTable)
          .where(eq(premiumRequestsTable.userId, acc.id)).limit(1);

        const [latestPayment] = await db.select().from(paymentsTable)
          .where(eq(paymentsTable.userId, acc.id))
          .orderBy(desc(paymentsTable.createdAt)).limit(1);

        const [profile] = await db.select({
          name: businessProfilesTable.name,
          city: businessProfilesTable.city,
          state: businessProfilesTable.state,
          country: businessProfilesTable.country,
        }).from(businessProfilesTable)
          .where(eq(businessProfilesTable.userId, acc.id)).limit(1);

        // Derive human-readable account status
        let accountStatus: string;
        if (acc.isPremium) {
          accountStatus = "Premium Active";
        } else if (premiumRequest?.status === "payment_submitted") {
          accountStatus = "Payment Submitted";
        } else if (premiumRequest?.status === "approved") {
          accountStatus = "Payment Approved";
        } else if (premiumRequest?.status === "rejected") {
          accountStatus = "Payment Rejected";
        } else if (latestPayment) {
          accountStatus = "Pending Payment";
        } else {
          accountStatus = "Lead";
        }

        return {
          ...acc,
          accountStatus,
          premiumRequestStatus: premiumRequest?.status ?? null,
          latestPaymentStatus: latestPayment?.status ?? null,
          profile: profile ?? null,
        };
      })
    );

    res.json(results);
  } catch (error) {
    console.error("Admin accounts error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
