import app from "./app";
import { logger } from "./lib/logger";
import { validateStartupEnvironment } from "./lib/startupValidation";
import { db, adminsTable, paymentSettingsTable, whatsappTemplatesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

process.on("uncaughtException", (err) => {
  console.error("🔥 CRITICAL: Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 CRITICAL: Unhandled Rejection at:", promise, "reason:", reason);
});

const rawPort = process.env["PORT"] || "3000";

async function startServer() {
  const port = parseInt(rawPort, 10);
  if (isNaN(port)) {
    console.error(`🔥 ERROR: Invalid PORT "${rawPort}"`);
    process.exit(1);
  }

  // ─── Security validation — must pass before any DB/network work ─────────────
  validateStartupEnvironment();

  // Initialize DB before starting server
  try {
    logger.info("Initializing database...");
    await db.execute(sql`SELECT 1`);
    logger.info("Database connection verified.");
  } catch (err) {
    logger.error({ err }, "Database initialization warning (Server will still start in Mock/Fallback mode)");
  }

  // Ensure database tables exist
  try {
    logger.info("Checking database tables...");

    // ─── Core Tables ──────────────────────────────────────────────────────────

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payment_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        price INTEGER NOT NULL DEFAULT 1500000,
        is_paystack_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        is_manual_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        paystack_public_key TEXT,
        paystack_secret_key TEXT,
        bank_name TEXT NOT NULL DEFAULT 'Opay',
        account_number TEXT NOT NULL DEFAULT '1234567890',
        account_name TEXT NOT NULL DEFAULT 'OneTailor Technologies',
        instructions TEXT NOT NULL DEFAULT 'Pay into the account above and send proof of payment to support.',
        payment_link TEXT,
        global_usage_limit INTEGER NOT NULL DEFAULT 25,
        currency_code TEXT NOT NULL DEFAULT 'NGN',
        currency_symbol TEXT NOT NULL DEFAULT '₦',
        measurement_limit INTEGER NOT NULL DEFAULT 25,
        pro_upgrade_message TEXT NOT NULL DEFAULT 'Unlock Premium to access all features.',
        pro_upgrade_link TEXT,
        pro_upgrade_button_text TEXT NOT NULL DEFAULT 'Unlock Premium',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const settingsColumns = [
      { name: "is_paystack_enabled",   type: "BOOLEAN NOT NULL DEFAULT TRUE" },
      { name: "is_manual_enabled",     type: "BOOLEAN NOT NULL DEFAULT TRUE" },
      { name: "paystack_public_key",   type: "TEXT" },
      { name: "paystack_secret_key",   type: "TEXT" },
      { name: "global_usage_limit",    type: "INTEGER NOT NULL DEFAULT 25" },
      { name: "currency_code",         type: "TEXT NOT NULL DEFAULT 'NGN'" },
      { name: "currency_symbol",       type: "TEXT NOT NULL DEFAULT '₦'" },
      { name: "measurement_limit",     type: "INTEGER NOT NULL DEFAULT 25" },
      { name: "pro_upgrade_message",   type: "TEXT" },
      { name: "pro_upgrade_link",      type: "TEXT" },
      { name: "pro_upgrade_button_text", type: "TEXT" },
      { name: "is_debug_mode",         type: "BOOLEAN NOT NULL DEFAULT FALSE" },
      { name: "is_usage_limit_enabled",type: "BOOLEAN NOT NULL DEFAULT TRUE" },
      { name: "pwa_name",              type: "TEXT" },
      { name: "pwa_short_name",        type: "TEXT" },
      { name: "pwa_description",       type: "TEXT" },
      { name: "pwa_theme_color",       type: "TEXT" },
      { name: "pwa_background_color",  type: "TEXT" },
      { name: "price_2_device",        type: "INTEGER" },
      { name: "price_3_device",        type: "INTEGER" },
      { name: "price_5_device",        type: "INTEGER" },
    ];
    for (const col of settingsColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch {}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
        customer_name TEXT,
        business_name TEXT,
        license_type TEXT NOT NULL DEFAULT 'one_tailor',
        phone TEXT,
        email TEXT,
        activation_date TIMESTAMP,
        expiry_date TIMESTAMP,
        user_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const licenseColumns = [
      { name: "customer_name",   type: "TEXT" },
      { name: "business_name",   type: "TEXT" },
      { name: "license_type",    type: "TEXT NOT NULL DEFAULT 'one_tailor'" },
      { name: "phone",           type: "TEXT" },
      { name: "email",           type: "TEXT" },
      { name: "user_id",         type: "INTEGER" },
      { name: "activation_date", type: "TIMESTAMP" },
      { name: "expiry_date",     type: "TIMESTAMP" },
    ];
    for (const col of licenseColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch {}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        device_id TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        phone TEXT,
        business_name TEXT,
        business_address TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        is_premium BOOLEAN NOT NULL DEFAULT FALSE,
        last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const userColumns = [
      { name: "email",                 type: "TEXT UNIQUE" },
      { name: "phone",                 type: "TEXT" },
      { name: "business_name",         type: "TEXT" },
      { name: "business_address",      type: "TEXT" },
      { name: "is_premium",            type: "BOOLEAN NOT NULL DEFAULT FALSE" },
      { name: "total_usage_count",     type: "INTEGER NOT NULL DEFAULT 0" },
      { name: "referral_code",         type: "TEXT UNIQUE" },
      { name: "referred_by",           type: "INTEGER" },
      { name: "successful_invites",    type: "INTEGER DEFAULT 0" },
      { name: "referral_reward_level", type: "INTEGER DEFAULT 0" },
      { name: "referral_confirmed",    type: "BOOLEAN DEFAULT FALSE" },
      { name: "bonus_usage_limit",     type: "INTEGER DEFAULT 0" },
      { name: "premium_expiry_date",   type: "TIMESTAMP" },
      // Account credential columns (nullable for anonymous/free users)
      { name: "password_hash",         type: "TEXT" },
      { name: "last_login_at",         type: "TIMESTAMP" },
      { name: "password_reset_token",  type: "TEXT" },
      { name: "password_reset_expiry", type: "TIMESTAMP" },
    ];
    for (const col of userColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch {}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS business_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const profileColumns = [
      { name: "city",     type: "TEXT" },
      { name: "state",    type: "TEXT" },
      { name: "landmark", type: "TEXT" },
      { name: "country",  type: "TEXT DEFAULT 'Nigeria'" },
    ];
    for (const col of profileColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch {}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'NGN',
        method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reference TEXT UNIQUE,
        evidence_url TEXT,
        admin_notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        verified_at TIMESTAMP
      )
    `);
    const paymentColumns = [
      { name: "user_id",      type: "INTEGER" },
      { name: "currency",     type: "TEXT NOT NULL DEFAULT 'NGN'" },
      { name: "reference",    type: "TEXT UNIQUE" },
      { name: "evidence_url", type: "TEXT" },
      { name: "admin_notes",  type: "TEXT" },
      { name: "verified_at",  type: "TIMESTAMP" },
    ];
    for (const col of paymentColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch {}
    }

    // ─── Premium Requests Table ───────────────────────────────────────────────
    // Tracks upgrade intent: pending → payment_submitted → approved/rejected.
    // A license is ONLY created when status reaches "approved".
    // Keeps licensesTable clean — only real, paid licenses live there.

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS premium_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        license_type TEXT NOT NULL DEFAULT 'one_tailor',
        status TEXT NOT NULL DEFAULT 'pending',
        payment_id INTEGER,
        license_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const premiumRequestColumns = [
      { name: "license_type", type: "TEXT NOT NULL DEFAULT 'one_tailor'" },
      { name: "status",       type: "TEXT NOT NULL DEFAULT 'pending'" },
      { name: "payment_id",   type: "INTEGER" },
      { name: "license_id",   type: "INTEGER" },
      { name: "notes",        type: "TEXT" },
      { name: "updated_at",   type: "TIMESTAMP NOT NULL DEFAULT NOW()" },
    ];
    for (const col of premiumRequestColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE premium_requests ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch {}
    }

    // ─── Supporting Tables ────────────────────────────────────────────────────

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        device_id TEXT NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS license_activations (
        id SERIAL PRIMARY KEY,
        license_id INTEGER NOT NULL REFERENCES licenses(id),
        device_id TEXT NOT NULL,
        activated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        template TEXT NOT NULL,
        recipient TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tailoring_customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        gender TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tailoring_measurements (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        category TEXT NOT NULL,
        values TEXT NOT NULL,
        is_custom BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // ─── CRM Tables ──────────────────────────────────────────────────────────

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS follow_up_agents (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_interactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        agent_id INTEGER,
        agent_type TEXT DEFAULT 'admin',
        agent_name TEXT,
        type TEXT NOT NULL DEFAULT 'note',
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS follow_up_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        agent_id INTEGER,
        task_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        trigger_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // CRM columns on existing tables
    const crmUserColumns = [
      { name: "whatsapp_number",   type: "TEXT" },
      { name: "lead_score",        type: "INTEGER DEFAULT 0" },
      { name: "lead_status",       type: "TEXT DEFAULT 'new'" },
      { name: "assigned_agent_id", type: "INTEGER" },
      { name: "tools_viewed",      type: "TEXT" },
      { name: "tools_used_list",   type: "TEXT" },
    ];
    for (const col of crmUserColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch {}
    }

    const crmSettingsColumns = [
      { name: "callmebot_phone",        type: "TEXT" },
      { name: "callmebot_api_key",      type: "TEXT" },
      { name: "followup_24h_enabled",   type: "BOOLEAN DEFAULT TRUE" },
      { name: "followup_48h_enabled",   type: "BOOLEAN DEFAULT TRUE" },
      { name: "followup_72h_enabled",   type: "BOOLEAN DEFAULT FALSE" },
    ];
    for (const col of crmSettingsColumns) {
      try { await db.execute(sql.raw(`ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)); } catch {}
    }

    logger.info("Database tables verified.");

    // ─── Initial Data Setup ───────────────────────────────────────────────────

    const adminCheck = await db.select().from(adminsTable).limit(1);
    if (adminCheck.length === 0) {
      logger.info("Creating default admin account...");
      await db.insert(adminsTable).values({
        username: "admin",
        passwordHash: bcrypt.hashSync("admin123", 10),
      });
      logger.info("Default Admin created: admin / admin123");
    }

    const settingsCheck = await db.select().from(paymentSettingsTable).where(sql`id = 1`).limit(1);
    if (settingsCheck.length === 0) {
      logger.info("Initializing payment settings...");
      await db.insert(paymentSettingsTable).values({
        id: 1,
        price: 15000, // 15,000 NGN (stored in Naira, NOT kobo)
        bankName: "Opay",
        accountNumber: "1234567890",
        accountName: "OneTailor Technologies",
        instructions: "Pay into the account above and send proof of payment to support.",
        measurementLimit: 25,
        proUpgradeMessage: "Unlock Premium to access all professional tools.",
        proUpgradeButtonText: "⭐ Unlock Premium",
      });
    }

    // Seed default WhatsApp templates if none exist
    const templateCheck = await db.select().from(whatsappTemplatesTable).limit(1);
    if (templateCheck.length === 0) {
      await db.insert(whatsappTemplatesTable).values([
        {
          name: "Welcome Follow-Up",
          content: "Hello {{name}}, thank you for joining OneTailor Toolkit! We noticed you haven't completed your upgrade yet. We'd love to help you unlock all the professional tools. Can we assist you?",
        },
        {
          name: "Upgrade Reminder",
          content: "Hello {{name}}, your tailoring toolkit is ready! Upgrade today to unlock cloud backup, order management, and all premium tools. Reply YES and we'll guide you through it.",
        },
        {
          name: "Final Follow-Up",
          content: "Hello {{name}}, this is our final gentle reminder about your OneTailor account. Premium features are still waiting for you. Upgrade now to grow your tailoring business. We're here to help!",
        },
      ]);
      logger.info("Default WhatsApp templates seeded.");
    }
  } catch (err) {
    logger.error({ err }, "Failed to verify/create database tables or initial data");
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`\n🚀 Backend Server running at http://127.0.0.1:${port}`);
    console.log(`📂 Database mode: ${process.env.DATABASE_URL ? "Remote/Postgres" : "Local/PGLite"}\n`);
  });
}

startServer().catch(err => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
