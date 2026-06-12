import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, html: string) => {
  const resendKey = process.env["RESEND_API_KEY"];
  const brevoKey  = process.env["BREVO_API_KEY"];

  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from: "OneTailor <onboarding@resend.dev>", to: [to], subject, html }),
      });
      if (response.ok) return { success: true };
    } catch (e) { console.error("Resend Error:", e); }
  }

  if (brevoKey) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevoKey },
        body: JSON.stringify({
          sender: { name: "OneTailor", email: "noreply@onetailor.com" },
          to: [{ email: to }], subject, htmlContent: html,
        }),
      });
      if (response.ok) return { success: true };
    } catch (e) { console.error("Brevo Error:", e); }
  }

  if (!process.env["SMTP_USER"] || !process.env["SMTP_PASS"]) {
    console.warn("[EMAIL] No provider configured — logging instead.");
    console.log(`[EMAIL → ${to}] ${subject}`);
    return { success: false, error: "SMTP not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env["SMTP_HOST"] || "smtp.gmail.com",
    port: parseInt(process.env["SMTP_PORT"] || "587"),
    secure: false,
    auth: { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] },
  });

  try {
    await transporter.sendMail({
      from: `"OneTailor Support" <${process.env["SMTP_USER"]}>`,
      to, subject, html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
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

  /** Sent immediately after account creation. */
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

  /** Sent when premium is activated — does NOT show the license key. */
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

  /** Kept for admin "resend details" use — shows recovery key for support purposes. */
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

  /** Sent to admin when manual payment evidence is submitted. */
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

  /** Sent to user when their payment is rejected. */
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

  /** Sent for password reset requests. */
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
