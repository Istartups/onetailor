/**
 * Secret Bootstrap
 *
 * Auto-generates and persists security-critical secrets to the database on
 * first boot. On subsequent boots (or fresh Replit imports), the same keys are
 * loaded back from the DB so sessions remain valid across restarts.
 *
 * Priority order:
 *   1. Already set in process.env (explicit Replit Secret / env var)
 *   2. Stored in the server_config DB table (from a previous boot)
 *   3. Freshly generated and saved to DB
 *
 * This means: export to GitHub → import to Replit → boots with auto-generated
 * keys stored in Replit's DB. No hardcoded values anywhere in code.
 */

import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

type SecretKey = "JWT_SECRET" | "USER_JWT_SECRET" | "VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY" | "SESSION_SECRET";

async function ensureConfigTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS server_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function loadFromDb(key: string): Promise<string | null> {
  const rows = await db.execute(sql.raw(`SELECT value FROM server_config WHERE key = '${key.replace(/'/g, "''")}'`));
  const first = (rows as unknown as { rows: { value: string }[] }).rows?.[0];
  return first?.value ?? null;
}

async function saveToDb(key: string, value: string): Promise<void> {
  await db.execute(sql.raw(
    `INSERT INTO server_config (key, value) VALUES ('${key.replace(/'/g, "''")}', '${value.replace(/'/g, "''")}')
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
  ));
}

function generateHex(bytes = 64): string {
  return randomBytes(bytes).toString("hex");
}

async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    const webpush = await import("web-push");
    return webpush.generateVAPIDKeys();
  } catch {
    return {
      publicKey: generateHex(32),
      privateKey: generateHex(32),
    };
  }
}

async function bootstrapSecret(key: SecretKey, generator: () => Promise<string>): Promise<string> {
  if (process.env[key] && process.env[key]!.trim() !== "") {
    return process.env[key]!;
  }

  const stored = await loadFromDb(key);
  if (stored) {
    process.env[key] = stored;
    return stored;
  }

  const generated = await generator();
  process.env[key] = generated;
  await saveToDb(key, generated);
  console.log(`[bootstrap] Generated and stored new ${key}`);
  return generated;
}

export async function bootstrapSecrets(): Promise<void> {
  try {
    await ensureConfigTable();

    await bootstrapSecret("JWT_SECRET", async () => generateHex(64));
    await bootstrapSecret("USER_JWT_SECRET", async () => generateHex(64));
    await bootstrapSecret("SESSION_SECRET", async () => generateHex(64));

    const vapidPublic = process.env["VAPID_PUBLIC_KEY"]?.trim();
    const vapidPrivate = process.env["VAPID_PRIVATE_KEY"]?.trim();

    if (!vapidPublic || !vapidPrivate) {
      const storedPublic = await loadFromDb("VAPID_PUBLIC_KEY");
      const storedPrivate = await loadFromDb("VAPID_PRIVATE_KEY");

      if (storedPublic && storedPrivate) {
        process.env["VAPID_PUBLIC_KEY"] = storedPublic;
        process.env["VAPID_PRIVATE_KEY"] = storedPrivate;
      } else {
        const { publicKey, privateKey } = await generateVapidKeys();
        process.env["VAPID_PUBLIC_KEY"] = publicKey;
        process.env["VAPID_PRIVATE_KEY"] = privateKey;
        await saveToDb("VAPID_PUBLIC_KEY", publicKey);
        await saveToDb("VAPID_PRIVATE_KEY", privateKey);
        console.log("[bootstrap] Generated and stored new VAPID key pair");
      }
    }

    console.log("[bootstrap] All secrets ready.");
  } catch (err) {
    console.warn("[bootstrap] Could not bootstrap secrets from DB:", err);
    console.warn("[bootstrap] Falling back to random in-process values (will reset on restart).");
    if (!process.env["JWT_SECRET"]) process.env["JWT_SECRET"] = generateHex(64);
    if (!process.env["USER_JWT_SECRET"]) process.env["USER_JWT_SECRET"] = generateHex(64);
    if (!process.env["SESSION_SECRET"]) process.env["SESSION_SECRET"] = generateHex(64);
    if (!process.env["VAPID_PUBLIC_KEY"] || !process.env["VAPID_PRIVATE_KEY"]) {
      const { publicKey, privateKey } = await generateVapidKeys();
      process.env["VAPID_PUBLIC_KEY"] = publicKey;
      process.env["VAPID_PRIVATE_KEY"] = privateKey;
    }
  }
}
