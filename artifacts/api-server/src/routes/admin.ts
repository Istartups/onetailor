import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  db, 
  adminsTable, 
  licensesTable, 
  paymentsTable, 
  usersTable, 
  paymentSettingsTable,
  tailoringCustomersTable,
  tailoringMeasurementsTable,
  licenseActivationsTable,
  businessProfilesTable,
  pushSubscriptionsTable,
  notificationsTable,
  emailLogsTable,
  auditLogsTable
} from "@workspace/db";
import { eq, ne, sql, and, gte, lte } from "drizzle-orm";
import { authenticateAdmin } from "../middlewares/auth";

const router = Router();
const JWT_SECRET = process.env["JWT_SECRET"] || "onetailor-admin-secret-key-123";

// Helper for date ranges
const getDateRange = (filter: string) => {
  const now = new Date();
  const start = new Date();
  if (filter === "today") start.setHours(0, 0, 0, 0);
  else if (filter === "this-week") start.setDate(now.getDate() - 7);
  else if (filter === "this-month") start.setMonth(now.getMonth() - 1);
  else if (filter === "this-year") start.setFullYear(now.getFullYear() - 1);
  else return null;
  return start;
};

// Stats Endpoint
router.get("/admin/stats", authenticateAdmin as any, async (req, res) => {
  const filter = (req.query.filter as string) || "today";
  const startDate = getDateRange(filter);

  try {
    // 1. Global Totals
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    const [totalUsage] = await db.select({ count: sql<number>`sum(total_usage_count)` }).from(usersTable);
    const [totalInvites] = await db.select({ count: sql<number>`sum(successful_invites)` }).from(usersTable);
    const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    
    // 2. Filtered Stats (New Users, Activations, Revenue)
    let userQuery: any = db.select({ count: sql<number>`count(*)` }).from(usersTable);
    let activationQuery: any = db.select({ count: sql<number>`count(*)` }).from(licenseActivationsTable);
    let revenueQuery: any = db.select({ total: sql<number>`sum(amount)`, count: sql<number>`count(*)` }).from(paymentsTable);

    if (startDate) {
      userQuery       = userQuery.where(gte(usersTable.createdAt, startDate)) as any;
      activationQuery = activationQuery.where(gte(licenseActivationsTable.activatedAt, startDate)) as any;
      revenueQuery    = revenueQuery.where(and(eq(paymentsTable.status, "success"), gte(paymentsTable.verifiedAt, startDate))) as any;
    } else {
      revenueQuery = revenueQuery.where(eq(paymentsTable.status, "success")) as any;
    }

    const [newUsers] = await userQuery;
    const [activations] = await activationQuery;
    const [revenue] = await revenueQuery;

    // 3. Disabled Stats
    const [disabledUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.status, "disabled"));
    const [disabledLicenses] = await db.select({ count: sql<number>`count(*)` }).from(licensesTable).where(eq(licensesTable.status, "disabled"));

    // 4. Trend Data (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyStats = await db.execute(sql`
      WITH RECURSIVE days AS (
        SELECT date_trunc('day', now()) as day
        UNION ALL
        SELECT day - interval '1 day'
        FROM days
        WHERE day > date_trunc('day', now()) - interval '6 days'
      )
      SELECT 
        to_char(days.day, 'Mon') as name,
        (SELECT count(*) FROM ${licenseActivationsTable} WHERE date_trunc('day', activated_at) = days.day) as activations,
        (SELECT COALESCE(sum(amount), 0) FROM ${paymentsTable} WHERE date_trunc('day', created_at) = days.day AND status = 'success') as revenue,
        (SELECT count(*) FROM ${usersTable} WHERE date_trunc('day', created_at) = days.day) as users
      FROM days
      ORDER BY days.day ASC
    `);

    // 5. Users near limit
    const limitThreshold = (settings?.globalUsageLimit || 25) - 5;
    const [nearLimit] = await db.select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(and(
        gte(usersTable.totalUsageCount, limitThreshold),
        eq(usersTable.isPremium, false)
      ));

    // 6. Recent Activity — with user names
    const recentActivity = await db.execute(sql`
      (
        SELECT
          CONCAT('License activated: ', COALESCE(u.business_name, l.customer_name, 'Unknown')) as text,
          la.activated_at as date,
          'check' as type
        FROM ${licenseActivationsTable} la
        LEFT JOIN ${licensesTable} l ON la.license_id = l.id
        LEFT JOIN ${usersTable} u ON l.user_id = u.id
        ORDER BY la.activated_at DESC LIMIT 2
      )
      UNION ALL
      (
        SELECT
          CONCAT('New user registered: ', COALESCE(u.business_name, u.email, 'Unknown')) as text,
          u.created_at as date,
          'user' as type
        FROM ${usersTable} u
        ORDER BY u.created_at DESC LIMIT 2
      )
      UNION ALL
      (
        SELECT
          CONCAT('Payment received: ', COALESCE(u.business_name, u.email, 'Unknown')) as text,
          p.created_at as date,
          'payment' as type
        FROM ${paymentsTable} p
        LEFT JOIN ${usersTable} u ON p.user_id = u.id
        WHERE p.status = 'success'
        ORDER BY p.created_at DESC LIMIT 2
      )
      ORDER BY date DESC LIMIT 8
    `);

    const totalAct = Number(activations?.count || 0);
    const actRate = totalUsers?.count ? Math.round((totalAct / Number(totalUsers.count)) * 100) : 0;

    res.json({
      totalUsers: Number(totalUsers?.count || 0),
      totalToolActions: Number(totalUsage?.count || 0),
      totalInvites: Number(totalInvites?.count || 0),
      usersNearLimit: Number(nearLimit?.count || 0),
      globalUsageLimit: settings?.globalUsageLimit || 25,
      newUsers: Number(newUsers?.count || 0),
      activations: totalAct,
      revenue: {
        earnings: Number(revenue?.total || 0),
        count: Number(revenue?.count || 0)
      },
      disabledUsers: Number(disabledUsers?.count || 0),
      disabledLicenses: Number(disabledLicenses?.count || 0),
      activationRate: `${actRate}%`,
      trendData: (dailyStats.rows as any[]),
      recentActivity: (recentActivity.rows as any[]).map((a: any) => ({
        text: a.text,
        type: a.type,
        date: a.date
      }))
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reset Usage Counters
router.post("/admin/reset-usage", authenticateAdmin as any, async (req, res) => {
  try {
    await db.update(usersTable).set({ totalUsageCount: 0 });
    res.json({ message: "All usage counters reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/reset-database", authenticateAdmin as any, async (req, res) => {
  try {
    // Delete everything in a specific order to respect foreign keys if any
    // Note: Drizzle deletes are executed in order.
    
    // 1. Delete child records first
    await db.delete(tailoringMeasurementsTable);
    await db.delete(tailoringCustomersTable);
    await db.delete(licenseActivationsTable);
    await db.delete(licensesTable);
    await db.delete(paymentsTable);
    await db.delete(businessProfilesTable);
    await db.delete(pushSubscriptionsTable);
    await db.delete(notificationsTable);
    await db.delete(emailLogsTable);
    await db.delete(auditLogsTable);
    
    // 2. Delete all users (Admins are in adminsTable, so they stay)
    await db.delete(usersTable);
    
    res.json({ message: "System data reset successfully. All users, licenses, and activities have been wiped." });
  } catch (error) {
    console.error("Database reset error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const ua = req.headers["user-agent"] || "unknown";

  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required" });
    return;
  }

  try {
    console.log(`Admin login attempt for: ${username}`);
    let [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);

    if (!admin) {
      console.log("Admin not found in DB");
      // Log failed attempt
      try { await db.execute(sql`INSERT INTO login_audit_logs (actor_type, username, ip_address, user_agent, success, failure_reason) VALUES ('admin', ${username}, ${ip}, ${ua}, false, 'User not found')`); } catch {}
      const existingAdmins = await db.select().from(adminsTable).limit(1);
      if (existingAdmins.length === 0) {
        res.status(401).json({ message: "No admin found. Use /api/admin/setup to create the first admin." });
        return;
      }
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    console.log("Comparing passwords...");
    if (!bcrypt.compareSync(password, admin.passwordHash)) {
      console.log("Password mismatch");
      try { await db.execute(sql`INSERT INTO login_audit_logs (actor_type, username, ip_address, user_agent, success, failure_reason) VALUES ('admin', ${username}, ${ip}, ${ua}, false, 'Wrong password')`); } catch {}
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Log successful login
    try { await db.execute(sql`INSERT INTO login_audit_logs (actor_type, username, ip_address, user_agent, success) VALUES ('admin', ${username}, ${ip}, ${ua}, true)`); } catch {}

    console.log("Login successful, generating token");
    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── GET /admin/system-logs ────────────────────────────────────────────────────
router.get("/admin/system-logs", authenticateAdmin as any, async (req, res) => {
  const { type = "all", limit = "50", offset = "0" } = req.query as Record<string, string>;
  try {
    let rows: any[] = [];
    if (type === "login" || type === "all") {
      const loginRows = await db.execute(sql`
        SELECT id, actor_type, username, ip_address, user_agent, success, failure_reason, created_at,
               'login' as log_type
        FROM login_audit_logs
        ORDER BY created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `);
      rows = [...rows, ...loginRows.rows];
    }
    if (type === "audit" || type === "all") {
      const auditRows = await db.execute(sql`
        SELECT al.id, 'admin' as actor_type, ad.username, NULL as ip_address, NULL as user_agent,
               true as success, NULL as failure_reason, al.created_at,
               'audit' as log_type,
               al.action, al.entity_type, al.details
        FROM audit_logs al
        LEFT JOIN admins ad ON al.admin_id = ad.id
        ORDER BY al.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `);
      rows = [...rows, ...auditRows.rows];
    }
    // Sort combined results by date
    rows.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    rows = rows.slice(0, parseInt(limit));
    res.json({ logs: rows });
  } catch (error) {
    console.error("System logs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// For initial setup: Create first admin if none exists
router.post("/admin/setup", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingAdmins = await db.select().from(adminsTable).limit(1);
    if (existingAdmins.length > 0) {
      res.status(400).json({ message: "Admin already exists" });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    await db.insert(adminsTable).values({ username, passwordHash });

    res.json({ message: "Admin created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
