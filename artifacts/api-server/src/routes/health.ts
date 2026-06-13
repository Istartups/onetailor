import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const startTime = Date.now();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return void res.json(data);
});

router.get("/health", async (_req, res) => {
  const checks: Record<string, { status: "ok" | "warn" | "error"; message?: string; detail?: unknown }> = {};
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

  // ── Database connectivity ───────────────────────────────────────────────────
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", detail: { responseMs: Date.now() - dbStart } };
  } catch (err: unknown) {
    checks.database = { status: "error", message: err instanceof Error ? err.message : "Connection failed" };
    overallStatus = "unhealthy";
  }

  // ── Secrets ─────────────────────────────────────────────────────────────────
  const requiredSecrets = ["JWT_SECRET", "USER_JWT_SECRET", "SESSION_SECRET", "DATABASE_URL"];
  const missingSecrets = requiredSecrets.filter((k) => !process.env[k]?.trim());
  const optionalSecrets = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
  const missingOptional = optionalSecrets.filter((k) => !process.env[k]?.trim());

  if (missingSecrets.length > 0) {
    checks.secrets = { status: "error", message: "Critical secrets missing", detail: { missing: missingSecrets } };
    overallStatus = "unhealthy";
  } else if (missingOptional.length > 0) {
    checks.secrets = { status: "warn", message: "Optional secrets missing (push notifications disabled)", detail: { missing: missingOptional } };
    if (overallStatus === "healthy") overallStatus = "degraded";
  } else {
    checks.secrets = { status: "ok", detail: { all_set: true } };
  }

  // ── Table count ─────────────────────────────────────────────────────────────
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const rows = ((result as unknown as { rows: { count: string }[] }).rows ?? (result as unknown as { count: string }[]));
    const count = parseInt((rows[0] as { count: string }).count ?? "0", 10);
    const EXPECTED_MIN = 13;
    if (count < EXPECTED_MIN) {
      checks.tables = { status: "warn", message: `Only ${count} tables found, expected at least ${EXPECTED_MIN}`, detail: { count } };
      if (overallStatus === "healthy") overallStatus = "degraded";
    } else {
      checks.tables = { status: "ok", detail: { count } };
    }
  } catch {
    checks.tables = { status: "warn", message: "Could not query table list" };
    if (overallStatus === "healthy") overallStatus = "degraded";
  }

  // ── Admin account ───────────────────────────────────────────────────────────
  try {
    const admins = await db.execute(sql`SELECT id FROM admins LIMIT 1`);
    const adminRows = (admins as unknown as { rows: unknown[] }).rows ?? (admins as unknown as unknown[]);
    if (!adminRows || adminRows.length === 0) {
      checks.admin = { status: "warn", message: "No admin account found — first boot may be incomplete" };
      if (overallStatus === "healthy") overallStatus = "degraded";
    } else {
      checks.admin = { status: "ok" };
    }
  } catch {
    checks.admin = { status: "warn", message: "Could not query admin table" };
  }

  // ── Fresh install detection ─────────────────────────────────────────────────
  // A fresh install is when setup_dismissed has never been saved to server_config.
  let freshInstall = false;
  try {
    const cfg = await db.execute(sql`
      SELECT value FROM server_config WHERE key = 'setup_dismissed' LIMIT 1
    `);
    const cfgRows = (cfg as unknown as { rows: { value: string }[] }).rows ?? (cfg as unknown as { value: string }[]);
    freshInstall = !cfgRows || cfgRows.length === 0;
  } catch {
    freshInstall = false;
  }

  return void res.json({
    status: overallStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    freshInstall,
    checks,
  });
});

router.post("/health/dismiss-setup", async (_req, res) => {
  try {
    await db.execute(sql`
      INSERT INTO server_config (key, value)
      VALUES ('setup_dismissed', 'true')
      ON CONFLICT (key) DO UPDATE SET value = 'true'
    `);
    return void res.json({ ok: true });
  } catch (err) {
    return void res.status(500).json({ ok: false, error: "Failed to save" });
  }
});

export default router;
