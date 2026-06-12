import nodemailer from "nodemailer";
import { db, paymentSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── Email Settings ───────────────────────────────────────────────────────────

interface EmailSettings {
  provider: "resend" | "smtp" | "none";
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  fromName?: string;
  fromEmail?: string;
}

let _cachedSettings: EmailSettings | null = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000; // re-read every 60s

async function loadEmailSettings(): Promise<EmailSettings> {
  if (_cachedSettings && Date.now() - _cacheAt < CACHE_TTL) return _cachedSettings;

  try {
    const [row] = await db.select().from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1)).limit(1);

    // DB settings take precedence over env vars when set
    const resendKey  = (row as any)?.resendApiKey  || process.env["RESEND_API_KEY"];
    const smtpHost   = (row as any)?.smtpHost      || process.env["SMTP_HOST"];
    const smtpUser   = (row as any)?.smtpUser      || process.env["SMTP_USER"];
    const smtpPass   = (row as any)?.smtpPass      || process.env["SMTP_PASS"];
    const smtpPort   = (row as any)?.smtpPort      || parseInt(process.env["SMTP_PORT"] || "587");
    const smtpSecure = (row as any)?.smtpSecure    ?? (smtpPort === 465);
    const fromName   = (row as any)?.emailFromName || process.env["EMAIL_FROM_NAME"] || "OneTailor";
    const fromEmail  = (row as any)?.emailFromAddr || process.env["EMAIL_FROM_ADDR"] || (smtpUser || "noreply@onetailor.com");

    let settings: EmailSettings;
    if (resendKey) {
      settings = { provider: "resend", resendApiKey: resendKey, fromName, fromEmail };
    } else if (smtpHost && smtpUser && smtpPass) {
      settings = { provider: "smtp", smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, fromName, fromEmail };
    } else {
      settings = { provider: "none" };
    }

    _cachedSettings = settings;
    _cacheAt = Date.now();
    return settings;
  } catch {
    // Fallback to env vars only
    const resendKey = process.env["RESEND_API_KEY"];
    const smtpUser  = process.env["SMTP_USER"];
    const smtpPass  = process.env["SMTP_PASS"];
    const smtpHost  = process.env["SMTP_HOST"];
    if (resendKey) return { provider: "resend", resendApiKey: resendKey, fromName: "OneTailor", fromEmail: "noreply@onetailor.com" };
    if (smtpHost && smtpUser && smtpPass) return { provider: "smtp", smtpHost, smtpPort: 587, smtpSecure: false, smtpUser, smtpPass, fromName: "OneTailor", fromEmail: smtpUser };
    return { provider: "none" };
  }
}

/** Bust cache after settings update */
export function invalidateEmailSettingsCache() {
  _cachedSettings = null;
}

// ─── Send Email ───────────────────────────────────────────────────────────────

export const sendEmail = async (to: string, subject: string, html: string, _template?: string): Promise<{ success: boolean; error?: unknown }> => {
  const cfg = await loadEmailSettings();

  if (cfg.provider === "resend" && cfg.resendApiKey) {
    try {
      const from = cfg.fromEmail && cfg.fromEmail !== "noreply@onetailor.com"
        ? `${cfg.fromName} <${cfg.fromEmail}>`
        : `${cfg.fromName} <onboarding@resend.dev>`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.resendApiKey}` },
        body: JSON.stringify({ from, to: [to], subject, html }),
      });
      if (response.ok) return { success: true };
      const err = await response.text();
      console.error("Resend Error:", err);
    } catch (e) {
      console.error("Resend Exception:", e);
    }
  }

  if (cfg.provider === "smtp" && cfg.smtpHost && cfg.smtpUser && cfg.smtpPass) {
    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort || 587,
      secure: cfg.smtpSecure ?? false,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
      tls: { rejectUnauthorized: false },
    });

    try {
      await transporter.sendMail({
        from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.smtpUser}>`,
        to, subject, html,
      });
      return { success: true };
    } catch (error) {
      console.error("SMTP send error:", error);
      return { success: false, error };
    }
  }

  console.warn(`[EMAIL] No provider configured — logged only → ${to} | ${subject}`);
  return { success: false, error: "No email provider configured" };
};

// ─── Email Templates ─────────────────────────────────────────────────────────

const S = {
  wrap: `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#0f1117;color:#e2e8f0;border-radius:12px;`,
  gold: `color:#d4a020;font-weight:800;`,
  card: `background:#1a1f2e;border:1px solid #2a3040;border-radius:10px;padding:20px;margin:16px 0;`,
  btn:  `display:inline-block;background:#d4a020;color:#000;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;`,
  muted:`font-size:12px;color:#64748b;margin-top:20px;`,
};

export const templates = {

  welcome: (businessName: string) => ({
    subject: "Welcome to OneTailor — Account Created",
    html: `<div style="${S.wrap}">
      <h2 style="${S.gold}">Welcome, ${businessName}! 🎉</h2>
      <p>Your OneTailor account has been created. Complete your payment to unlock full premium access.</p>
      <div style="${S.card}">
        <p style="margin:0">✅ Account created<br/>⏳ Payment pending<br/>🔒 Premium activates after approval</p>
      </div>
      <p>Once your payment is approved, premium access is automatic — no license key needed. You can log in from any device to restore access.</p>
      <p style="${S.muted}">Need help? Contact support@onetailor.com</p>
    </div>`,
  }),

  premiumActivated: (businessName: string) => ({
    subject: "🎉 Your OneTailor Premium is Now Active!",
    html: `<div style="${S.wrap}">
      <h2 style="${S.gold}">Premium Activated, ${businessName}!</h2>
      <p>Your payment has been verified and your premium access is now active.</p>
      <div style="${S.card}">
        <p style="margin:0;font-size:15px;font-weight:700;">✅ Premium Access: ACTIVE</p>
        <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">Log in to the OneTailor app to access all premium tools.</p>
      </div>
      <p>Install the app on any device, log in with your email and password, and your premium is restored instantly — no codes needed.</p>
      <p style="${S.muted}">Need help? support@onetailor.com</p>
    </div>`,
  }),

  licenseActivated: (businessName: string, key: string) => ({
    subject: "Your OneTailor Premium Access Details",
    html: `<div style="${S.wrap}">
      <h2 style="${S.gold}">Premium Ready, ${businessName}!</h2>
      <p>Your premium access has been activated.</p>
      <div style="${S.card}">
        <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">Internal Recovery Key</p>
        <p style="font-family:monospace;font-size:18px;color:#10b981;margin:8px 0;">${key}</p>
      </div>
      <p>Log in to the app with your email and password to access all premium features. The key above is for support use only.</p>
      <p style="${S.muted}">support@onetailor.com</p>
    </div>`,
  }),

  manualPaymentReceived: (businessName: string, amount: number) => ({
    subject: "New Manual Payment Evidence Submitted",
    html: `<div style="${S.wrap}">
      <h3 style="${S.gold}">Payment Review Required</h3>
      <div style="${S.card}">
        <p><b>Business:</b> ${businessName}</p>
        <p><b>Amount:</b> ₦${amount.toLocaleString()}</p>
      </div>
      <p>Log in to the Admin Portal to review the evidence and approve or reject the payment.</p>
    </div>`,
  }),

  paymentRejected: (reason: string) => ({
    subject: "Update on Your OneTailor Premium Payment",
    html: `<div style="${S.wrap}">
      <h3 style="color:#ef4444;">Payment Verification Failed</h3>
      <p>We could not verify your payment for the following reason:</p>
      <div style="${S.card};border-left:4px solid #ef4444;">
        <p style="margin:0;">${reason}</p>
      </div>
      <p>Please re-upload the correct proof of payment or contact support.</p>
      <p style="${S.muted}">support@onetailor.com</p>
    </div>`,
  }),

  passwordReset: (name: string, resetLink: string) => ({
    subject: "Reset Your OneTailor Password",
    html: `<div style="${S.wrap}">
      <h2 style="${S.gold}">Password Reset Request</h2>
      <p>Hi ${name}, we received a request to reset your OneTailor account password.</p>
      <p>Click the button below. This link expires in <b>1 hour</b>.</p>
      <a href="${resetLink}" style="${S.btn}">Reset My Password</a>
      <p style="${S.muted}">If you did not request this, you can safely ignore this email.</p>
    </div>`,
  }),
};
