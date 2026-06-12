import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  db,
  usersTable,
  businessProfilesTable,
  premiumRequestsTable,
  paymentsTable,
  tailoringCustomersTable,
  paymentSettingsTable,
  leadInteractionsTable,
  whatsappTemplatesTable,
  followUpAgentsTable,
  followUpTasksTable,
} from "@workspace/db";
import { eq, desc, and, gte, lte, isNotNull, sql, or, like, isNull, lt } from "drizzle-orm";
import { authenticateCRM, requireAdminRole, type CRMRequest } from "../middlewares/auth";
import { sendCallMeBotAlert } from "../lib/callmebot";

const router = Router();
const JWT_SECRET = process.env["JWT_SECRET"] || "onetailor-admin-secret-key-123";

// ─── Lead Score Calculation ───────────────────────────────────────────────────

function computeLeadScore(user: {
  createdAt: Date | string;
  totalUsageCount: number;
  businessName?: string | null;
  phone?: string | null;
  email?: string | null;
  toolsViewed?: string | null;
  toolsUsedList?: string | null;
  premiumRequestStatus?: string | null;
  latestPaymentStatus?: string | null;
  customerCount?: number;
}): number {
  let score = 0;
  const now = Date.now();
  const created = new Date(user.createdAt).getTime();
  const hoursOld = (now - created) / 3600000;

  if (hoursOld < 24) score += 30;
  else if (hoursOld < 48) score += 20;
  else if (hoursOld < 168) score += 10;

  score += Math.min((user.totalUsageCount || 0) * 5, 40);

  if (user.businessName) score += 10;
  if (user.phone) score += 10;
  if (user.email) score += 5;

  try {
    const viewed = JSON.parse(user.toolsViewed || "[]") as string[];
    if (viewed.some(t => t.includes("premium") || t.includes("pricing") || t.includes("profit"))) score += 15;
    score += Math.min(viewed.length * 2, 10);
  } catch {}

  if (user.premiumRequestStatus && user.premiumRequestStatus !== "rejected") score += 20;
  if (user.latestPaymentStatus === "success") score += 30;
  if ((user.customerCount || 0) > 0) score += 20;

  return Math.min(score, 100);
}

function scoreLabel(score: number): string {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

// ─── CallMeBot helper: load settings and fire alert ──────────────────────────

async function fireCallMeBotAlert(message: string): Promise<void> {
  try {
    const [settings] = await db.select({
      callmebotPhone: paymentSettingsTable.callmebotPhone,
      callmebotApiKey: paymentSettingsTable.callmebotApiKey,
    }).from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);

    if (!settings?.callmebotPhone || !settings?.callmebotApiKey) return;
    await sendCallMeBotAlert(settings.callmebotPhone, settings.callmebotApiKey, message);
  } catch (err) {
    console.warn("[CallMeBot] Failed to fire alert:", err);
  }
}

// ─── Track tool event from PWA (public) ──────────────────────────────────────

router.post("/crm/events", async (req, res) => {
  try {
    const { deviceId, toolId, eventType = "view" } = req.body;
    if (!deviceId || !toolId) return void res.status(400).json({ message: "Missing deviceId or toolId" });

    const [user] = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      businessName: usersTable.businessName,
      phone: usersTable.phone,
      totalUsageCount: usersTable.totalUsageCount,
      toolsViewed: usersTable.toolsViewed,
      toolsUsedList: usersTable.toolsUsedList,
      leadScore: usersTable.leadScore,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);

    if (!user) return void res.json({ ok: true });

    const prevScore = user.leadScore || 0;

    const toolsViewed: string[] = [];
    try { toolsViewed.push(...JSON.parse(user.toolsViewed || "[]")); } catch {}
    if (!toolsViewed.includes(toolId)) toolsViewed.push(toolId);

    const toolsUsedList: string[] = [];
    try { toolsUsedList.push(...JSON.parse(user.toolsUsedList || "[]")); } catch {}
    if (eventType === "use" && !toolsUsedList.includes(toolId)) toolsUsedList.push(toolId);

    const newScore = computeLeadScore({
      createdAt: user.createdAt,
      totalUsageCount: user.totalUsageCount,
      businessName: user.businessName,
      phone: user.phone,
      email: user.email,
      toolsViewed: JSON.stringify(toolsViewed),
      toolsUsedList: JSON.stringify(toolsUsedList),
    });

    await db.update(usersTable).set({
      toolsViewed: JSON.stringify(toolsViewed),
      toolsUsedList: JSON.stringify(toolsUsedList),
      leadScore: newScore,
    }).where(eq(usersTable.id, user.id));

    // Fire CallMeBot alert when lead crosses into hot territory for the first time
    if (prevScore < 70 && newScore >= 70) {
      const label = user.email || user.businessName || user.phone || `User #${user.id}`;
      const daysSince = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);
      const msg = `🔥 New HOT Lead!\n\nName: ${label}\nLead Score: ${newScore}\nDays Since Registration: ${daysSince}\n\nFollow up now on OneTailor CRM.`;
      fireCallMeBotAlert(msg).catch(() => {});
    }

    return void res.json({ ok: true });
  } catch (err) {
    console.error("CRM event error:", err);
    return void res.json({ ok: true });
  }
});

// ─── Agent Login ──────────────────────────────────────────────────────────────

router.post("/agent/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return void res.status(400).json({ message: "Username and password required" });

    const [agent] = await db.select().from(followUpAgentsTable)
      .where(and(eq(followUpAgentsTable.username, username), eq(followUpAgentsTable.isActive, true))).limit(1);

    if (!agent || !bcrypt.compareSync(password, agent.passwordHash)) {
      return void res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ agentId: agent.id, name: agent.name, role: "agent" }, JWT_SECRET, { expiresIn: "24h" });
    return void res.json({ token, agent: { id: agent.id, name: agent.name, username: agent.username } });
  } catch (err) {
    console.error("Agent login error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/agent/me", authenticateCRM as any, async (req: CRMRequest, res) => {
  if (req.crmUserRole === "agent") {
    const [agent] = await db.select({ id: followUpAgentsTable.id, name: followUpAgentsTable.name, username: followUpAgentsTable.username })
      .from(followUpAgentsTable).where(eq(followUpAgentsTable.id, req.crmUserId!)).limit(1);
    return void res.json({ role: "agent", ...agent });
  }
  return void res.json({ role: "admin", id: req.crmUserId });
});

// ─── CRM Stats ────────────────────────────────────────────────────────────────

router.get("/crm/stats", authenticateCRM as any, async (req: CRMRequest, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [totalLeads] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(and(isNotNull(usersTable.passwordHash), eq(usersTable.isPremium, false)));

    const [newToday] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(and(isNotNull(usersTable.passwordHash), gte(usersTable.createdAt, today)));

    const [converted] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(and(isNotNull(usersTable.passwordHash), eq(usersTable.isPremium, true)));

    const [pending] = await db.select({ count: sql<number>`count(*)` }).from(followUpTasksTable)
      .where(eq(followUpTasksTable.status, "pending"));

    const totalConverted = Number(converted?.count || 0);
    const totalAll = Number(totalLeads?.count || 0) + totalConverted;
    const conversionRate = totalAll > 0 ? Math.round((totalConverted / totalAll) * 100) : 0;

    // Count hot leads (quick approximation: recently registered with usage > 3)
    const [hotLeads] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(and(
        isNotNull(usersTable.passwordHash),
        eq(usersTable.isPremium, false),
        gte(usersTable.totalUsageCount, 3),
      ));

    return void res.json({
      totalLeads: Number(totalLeads?.count || 0),
      newToday: Number(newToday?.count || 0),
      hotLeads: Number(hotLeads?.count || 0),
      pendingFollowUps: Number(pending?.count || 0),
      converted: totalConverted,
      conversionRate,
    });
  } catch (err) {
    console.error("CRM stats error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Leads List ───────────────────────────────────────────────────────────────

router.get("/crm/leads", authenticateCRM as any, async (req: CRMRequest, res) => {
  try {
    const {
      search, status, scoreFilter, agentId,
      dateFrom, dateTo, includeConverted = "false",
      page = "1", limit = "50",
    } = req.query as Record<string, string>;

    let query: any = db.select({
      id: usersTable.id,
      email: usersTable.email,
      phone: usersTable.phone,
      businessName: usersTable.businessName,
      whatsappNumber: usersTable.whatsappNumber,
      isPremium: usersTable.isPremium,
      totalUsageCount: usersTable.totalUsageCount,
      toolsViewed: usersTable.toolsViewed,
      toolsUsedList: usersTable.toolsUsedList,
      leadStatus: usersTable.leadStatus,
      assignedAgentId: usersTable.assignedAgentId,
      createdAt: usersTable.createdAt,
      lastSeen: usersTable.lastSeen,
      leadScore: usersTable.leadScore,
    }).from(usersTable).where(isNotNull(usersTable.passwordHash));

    const conditions: any[] = [isNotNull(usersTable.passwordHash)];

    if (includeConverted !== "true") {
      conditions.push(eq(usersTable.isPremium, false));
    }

    if (search) {
      conditions.push(or(
        like(usersTable.email, `%${search}%`),
        like(usersTable.phone, `%${search}%`),
        like(usersTable.businessName, `%${search}%`),
        like(usersTable.whatsappNumber, `%${search}%`),
      ));
    }

    if (status && status !== "all") {
      conditions.push(eq(usersTable.leadStatus, status));
    }

    if (agentId && agentId !== "all") {
      if (agentId === "unassigned") {
        conditions.push(isNull(usersTable.assignedAgentId));
      } else {
        conditions.push(eq(usersTable.assignedAgentId, parseInt(agentId)));
      }
    }

    if (dateFrom) {
      conditions.push(gte(usersTable.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      conditions.push(lte(usersTable.createdAt, to));
    }

    query = db.select({
      id: usersTable.id,
      email: usersTable.email,
      phone: usersTable.phone,
      businessName: usersTable.businessName,
      whatsappNumber: usersTable.whatsappNumber,
      isPremium: usersTable.isPremium,
      totalUsageCount: usersTable.totalUsageCount,
      toolsViewed: usersTable.toolsViewed,
      toolsUsedList: usersTable.toolsUsedList,
      leadStatus: usersTable.leadStatus,
      assignedAgentId: usersTable.assignedAgentId,
      createdAt: usersTable.createdAt,
      lastSeen: usersTable.lastSeen,
      leadScore: usersTable.leadScore,
    }).from(usersTable).where(and(...conditions));

    const users = await query.orderBy(desc(usersTable.createdAt));

    // Enrich each user
    const enriched = await Promise.all(users.map(async (u: typeof users[number]) => {
      const [profile] = await db.select({ name: businessProfilesTable.name, city: businessProfilesTable.city, state: businessProfilesTable.state })
        .from(businessProfilesTable).where(eq(businessProfilesTable.userId, u.id)).limit(1);

      const [premiumReq] = await db.select({ status: premiumRequestsTable.status })
        .from(premiumRequestsTable).where(eq(premiumRequestsTable.userId, u.id)).limit(1);

      const [latestPayment] = await db.select({ status: paymentsTable.status })
        .from(paymentsTable).where(eq(paymentsTable.userId, u.id)).orderBy(desc(paymentsTable.createdAt)).limit(1);

      const [customerCount] = await db.select({ count: sql<number>`count(*)` })
        .from(tailoringCustomersTable).where(eq(tailoringCustomersTable.userId, u.id));

      const [interactionCount] = await db.select({ count: sql<number>`count(*)` })
        .from(leadInteractionsTable).where(eq(leadInteractionsTable.userId, u.id));

      const [lastInteraction] = await db.select({ createdAt: leadInteractionsTable.createdAt })
        .from(leadInteractionsTable).where(eq(leadInteractionsTable.userId, u.id))
        .orderBy(desc(leadInteractionsTable.createdAt)).limit(1);

      let assignedAgent = null;
      if (u.assignedAgentId) {
        const [agent] = await db.select({ name: followUpAgentsTable.name })
          .from(followUpAgentsTable).where(eq(followUpAgentsTable.id, u.assignedAgentId)).limit(1);
        assignedAgent = agent?.name || null;
      }

      const score = computeLeadScore({
        createdAt: u.createdAt,
        totalUsageCount: u.totalUsageCount,
        businessName: u.businessName,
        phone: u.phone,
        email: u.email,
        toolsViewed: u.toolsViewed,
        toolsUsedList: u.toolsUsedList,
        premiumRequestStatus: premiumReq?.status,
        latestPaymentStatus: latestPayment?.status,
        customerCount: Number(customerCount?.count || 0),
      });

      // Derive status
      let accountStatus = "Lead";
      if (u.isPremium) accountStatus = "Premium Active";
      else if (premiumReq?.status === "payment_submitted") accountStatus = "Payment Submitted";
      else if (premiumReq?.status === "approved") accountStatus = "Payment Approved";
      else if (premiumReq?.status === "rejected") accountStatus = "Payment Rejected";

      return {
        ...u,
        profile: profile || null,
        premiumRequestStatus: premiumReq?.status || null,
        latestPaymentStatus: latestPayment?.status || null,
        customerCount: Number(customerCount?.count || 0),
        interactionCount: Number(interactionCount?.count || 0),
        lastInteractionAt: lastInteraction?.createdAt || null,
        assignedAgentName: assignedAgent,
        computedScore: score,
        scoreLabel: scoreLabel(score),
        accountStatus,
        toolsViewedList: (() => { try { return JSON.parse(u.toolsViewed || "[]"); } catch { return []; } })(),
        toolsUsedArray: (() => { try { return JSON.parse(u.toolsUsedList || "[]"); } catch { return []; } })(),
      };
    }));

    // Sort by score desc
    enriched.sort((a, b) => b.computedScore - a.computedScore);

    // Apply score filter after computing
    let filtered = enriched;
    if (scoreFilter === "hot") filtered = enriched.filter(u => u.computedScore >= 70);
    else if (scoreFilter === "warm") filtered = enriched.filter(u => u.computedScore >= 40 && u.computedScore < 70);
    else if (scoreFilter === "cold") filtered = enriched.filter(u => u.computedScore < 40);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const total = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return void res.json({ leads: paginated, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("CRM leads error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Single Lead ──────────────────────────────────────────────────────────────

router.get("/crm/leads/:id", authenticateCRM as any, async (req: CRMRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return void res.status(404).json({ message: "Lead not found" });

    const [profile] = await db.select().from(businessProfilesTable).where(eq(businessProfilesTable.userId, userId)).limit(1);
    const [premiumReq] = await db.select().from(premiumRequestsTable).where(eq(premiumRequestsTable.userId, userId)).limit(1);
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.userId, userId)).orderBy(desc(paymentsTable.createdAt));

    const interactions = await db.select().from(leadInteractionsTable)
      .where(eq(leadInteractionsTable.userId, userId)).orderBy(desc(leadInteractionsTable.createdAt));

    const tasks = await db.select().from(followUpTasksTable)
      .where(eq(followUpTasksTable.userId, userId)).orderBy(desc(followUpTasksTable.createdAt));

    const [customerCount] = await db.select({ count: sql<number>`count(*)` })
      .from(tailoringCustomersTable).where(eq(tailoringCustomersTable.userId, userId));

    let assignedAgent = null;
    if (user.assignedAgentId) {
      const [agent] = await db.select({ id: followUpAgentsTable.id, name: followUpAgentsTable.name })
        .from(followUpAgentsTable).where(eq(followUpAgentsTable.id, user.assignedAgentId)).limit(1);
      assignedAgent = agent;
    }

    const score = computeLeadScore({
      createdAt: user.createdAt,
      totalUsageCount: user.totalUsageCount,
      businessName: user.businessName,
      phone: user.phone,
      email: user.email,
      toolsViewed: user.toolsViewed,
      toolsUsedList: user.toolsUsedList,
      premiumRequestStatus: premiumReq?.status,
      latestPaymentStatus: payments[0]?.status,
      customerCount: Number(customerCount?.count || 0),
    });

    return void res.json({
      user: {
        ...user,
        toolsViewedList: (() => { try { return JSON.parse(user.toolsViewed || "[]"); } catch { return []; } })(),
        toolsUsedArray: (() => { try { return JSON.parse(user.toolsUsedList || "[]"); } catch { return []; } })(),
      },
      profile,
      premiumRequest: premiumReq,
      payments,
      interactions,
      tasks,
      customerCount: Number(customerCount?.count || 0),
      assignedAgent,
      computedScore: score,
      scoreLabel: scoreLabel(score),
    });
  } catch (err) {
    console.error("CRM lead detail error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Update Lead ──────────────────────────────────────────────────────────────

router.patch("/crm/leads/:id", authenticateCRM as any, async (req: CRMRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { leadStatus, assignedAgentId, whatsappNumber } = req.body;

    const updates: Record<string, any> = {};
    if (leadStatus !== undefined) updates.leadStatus = leadStatus;
    if (assignedAgentId !== undefined) updates.assignedAgentId = assignedAgentId || null;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;

    if (Object.keys(updates).length > 0) {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    }

    // Auto-log a system interaction for status changes
    if (leadStatus) {
      const agentName = req.crmUserRole === "agent" ? (req.crmUserName || "Agent") : "Admin";
      await db.insert(leadInteractionsTable).values({
        userId,
        agentId: req.crmUserRole === "agent" ? req.crmUserId : null,
        agentType: req.crmUserRole || "admin",
        agentName,
        type: "system",
        content: `Status changed to "${leadStatus}" by ${agentName}`,
      });
    }

    return void res.json({ success: true });
  } catch (err) {
    console.error("CRM lead update error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Add Interaction ──────────────────────────────────────────────────────────

router.post("/crm/leads/:id/interactions", authenticateCRM as any, async (req: CRMRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { type, content } = req.body;
    if (!content) return void res.status(400).json({ message: "Content required" });

    const agentName = req.crmUserRole === "agent" ? (req.crmUserName || "Agent") : "Admin";

    const [interaction] = await db.insert(leadInteractionsTable).values({
      userId,
      agentId: req.crmUserRole === "agent" ? req.crmUserId : null,
      agentType: req.crmUserRole || "admin",
      agentName,
      type: type || "note",
      content,
    }).returning();

    return void res.json(interaction);
  } catch (err) {
    console.error("Add interaction error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── WhatsApp Templates ───────────────────────────────────────────────────────

router.get("/crm/templates", authenticateCRM as any, async (_req, res) => {
  try {
    const templates = await db.select().from(whatsappTemplatesTable).orderBy(desc(whatsappTemplatesTable.createdAt));
    return void res.json(templates);
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/crm/templates", authenticateCRM as any, requireAdminRole as any, async (req: CRMRequest, res) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) return void res.status(400).json({ message: "Name and content required" });
    const [tpl] = await db.insert(whatsappTemplatesTable).values({ name, content }).returning();
    return void res.json(tpl);
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/crm/templates/:id", authenticateCRM as any, requireAdminRole as any, async (req: CRMRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, content } = req.body;
    await db.update(whatsappTemplatesTable).set({ name, content, updatedAt: new Date() }).where(eq(whatsappTemplatesTable.id, id));
    return void res.json({ success: true });
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/crm/templates/:id", authenticateCRM as any, requireAdminRole as any, async (req: CRMRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, id));
    return void res.json({ success: true });
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Follow-Up Tasks ──────────────────────────────────────────────────────────

router.get("/crm/tasks", authenticateCRM as any, async (req: CRMRequest, res) => {
  try {
    const { status = "pending" } = req.query as Record<string, string>;

    let taskQuery: any = db.select().from(followUpTasksTable);
    if (req.crmUserRole === "agent") {
      taskQuery = taskQuery.where(and(
        eq(followUpTasksTable.agentId, req.crmUserId!),
        status === "all" ? sql`1=1` : eq(followUpTasksTable.status, status),
      ));
    } else {
      if (status !== "all") {
        taskQuery = taskQuery.where(eq(followUpTasksTable.status, status));
      }
    }

    const tasks = await taskQuery.orderBy(followUpTasksTable.triggerAt);

    // Enrich with user info
    const enriched = await Promise.all(tasks.map(async (task: typeof tasks[number]) => {
      const [user] = await db.select({ email: usersTable.email, businessName: usersTable.businessName, phone: usersTable.phone })
        .from(usersTable).where(eq(usersTable.id, task.userId)).limit(1);
      return { ...task, user: user || null };
    }));

    return void res.json(enriched);
  } catch (err) {
    console.error("CRM tasks error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/crm/tasks/:id", authenticateCRM as any, async (req: CRMRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status, notes } = req.body;
    const updates: Record<string, any> = {};
    if (status) {
      updates.status = status;
      if (status === "completed") updates.completedAt = new Date();
    }
    if (notes !== undefined) updates.notes = notes;
    await db.update(followUpTasksTable).set(updates).where(eq(followUpTasksTable.id, id));
    return void res.json({ success: true });
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Agent Management (admin only) ───────────────────────────────────────────

router.get("/admin/agents", authenticateCRM as any, requireAdminRole as any, async (_req, res) => {
  try {
    const agents = await db.select({
      id: followUpAgentsTable.id,
      username: followUpAgentsTable.username,
      name: followUpAgentsTable.name,
      phone: followUpAgentsTable.phone,
      isActive: followUpAgentsTable.isActive,
      createdAt: followUpAgentsTable.createdAt,
    }).from(followUpAgentsTable).orderBy(desc(followUpAgentsTable.createdAt));
    return void res.json(agents);
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/agents", authenticateCRM as any, requireAdminRole as any, async (req: CRMRequest, res) => {
  try {
    const { username, password, name, phone } = req.body;
    if (!username || !password || !name) return void res.status(400).json({ message: "Username, password, and name required" });

    const passwordHash = bcrypt.hashSync(password, 10);
    const [agent] = await db.insert(followUpAgentsTable).values({ username, passwordHash, name, phone }).returning({
      id: followUpAgentsTable.id,
      username: followUpAgentsTable.username,
      name: followUpAgentsTable.name,
      phone: followUpAgentsTable.phone,
      isActive: followUpAgentsTable.isActive,
    });
    return void res.json(agent);
  } catch (err: any) {
    if (err?.code === "23505") return void res.status(409).json({ message: "Username already exists" });
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/admin/agents/:id", authenticateCRM as any, requireAdminRole as any, async (req: CRMRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, phone, isActive, password } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password) updates.passwordHash = bcrypt.hashSync(password, 10);
    await db.update(followUpAgentsTable).set(updates).where(eq(followUpAgentsTable.id, id));
    return void res.json({ success: true });
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── CallMeBot / Automation Settings ─────────────────────────────────────────

router.get("/crm/settings", authenticateCRM as any, requireAdminRole as any, async (_req, res) => {
  try {
    const [settings] = await db.select({
      callmebotPhone: paymentSettingsTable.callmebotPhone,
      callmebotApiKey: paymentSettingsTable.callmebotApiKey,
      followup24hEnabled: paymentSettingsTable.followup24hEnabled,
      followup48hEnabled: paymentSettingsTable.followup48hEnabled,
      followup72hEnabled: paymentSettingsTable.followup72hEnabled,
    }).from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);
    return void res.json(settings || {});
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/crm/settings", authenticateCRM as any, requireAdminRole as any, async (req: CRMRequest, res) => {
  try {
    const { callmebotPhone, callmebotApiKey, followup24hEnabled, followup48hEnabled, followup72hEnabled } = req.body;
    await db.update(paymentSettingsTable).set({
      callmebotPhone,
      callmebotApiKey,
      followup24hEnabled,
      followup48hEnabled,
      followup72hEnabled,
    }).where(eq(paymentSettingsTable.id, 1));
    return void res.json({ success: true });
  } catch (err) {
    return void res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Create Follow-Up Tasks (background job / manual trigger) ─────────────────

router.post("/crm/generate-tasks", authenticateCRM as any, requireAdminRole as any, async (_req, res) => {
  try {
    const [settings] = await db.select({
      followup24hEnabled: paymentSettingsTable.followup24hEnabled,
      followup48hEnabled: paymentSettingsTable.followup48hEnabled,
      followup72hEnabled: paymentSettingsTable.followup72hEnabled,
      callmebotPhone: paymentSettingsTable.callmebotPhone,
      callmebotApiKey: paymentSettingsTable.callmebotApiKey,
    }).from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);

    const now = new Date();
    const leads = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      businessName: usersTable.businessName,
      phone: usersTable.phone,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(and(isNotNull(usersTable.passwordHash), eq(usersTable.isPremium, false)));

    let created = 0;
    const newlyCreatedAlerts: string[] = [];

    for (const lead of leads) {
      const hoursOld = (now.getTime() - new Date(lead.createdAt).getTime()) / 3600000;

      const taskTypes = [
        { type: "24h", hours: 24, enabled: settings?.followup24hEnabled !== false },
        { type: "48h", hours: 48, enabled: settings?.followup48hEnabled !== false },
        { type: "72h", hours: 72, enabled: settings?.followup72hEnabled !== false },
      ];

      for (const tt of taskTypes) {
        if (!tt.enabled) continue;
        if (hoursOld < tt.hours) continue;

        const existing = await db.select({ id: followUpTasksTable.id })
          .from(followUpTasksTable)
          .where(and(
            eq(followUpTasksTable.userId, lead.id),
            eq(followUpTasksTable.taskType, tt.type),
          )).limit(1);

        if (existing.length === 0) {
          const triggerAt = new Date(new Date(lead.createdAt).getTime() + tt.hours * 3600000);
          await db.insert(followUpTasksTable).values({
            userId: lead.id,
            taskType: tt.type,
            triggerAt,
            status: "pending",
          });
          created++;
          const label = lead.email || lead.businessName || lead.phone || `Lead #${lead.id}`;
          newlyCreatedAlerts.push(`⏰ ${tt.type} Follow-Up Task\nLead: ${label}\nRegistered: ${Math.round(hoursOld)}h ago`);
        }
      }
    }

    // Send overdue-task alert if CallMeBot is configured and tasks were created
    if (newlyCreatedAlerts.length > 0 && settings?.callmebotPhone && settings?.callmebotApiKey) {
      const msg = `📋 OneTailor: ${newlyCreatedAlerts.length} new follow-up task(s) generated.\n\n${newlyCreatedAlerts.slice(0, 5).join("\n\n")}${newlyCreatedAlerts.length > 5 ? `\n\n...and ${newlyCreatedAlerts.length - 5} more.` : ""}`;
      sendCallMeBotAlert(settings.callmebotPhone, settings.callmebotApiKey, msg).catch(() => {});
    }

    // Also check for already-pending overdue tasks and alert
    const overdueTasks = await db.select({
      id: followUpTasksTable.id,
      userId: followUpTasksTable.userId,
      taskType: followUpTasksTable.taskType,
      triggerAt: followUpTasksTable.triggerAt,
    }).from(followUpTasksTable).where(and(
      eq(followUpTasksTable.status, "pending"),
      lt(followUpTasksTable.triggerAt, now),
    ));

    if (overdueTasks.length > 0 && settings?.callmebotPhone && settings?.callmebotApiKey) {
      const msg = `⚠️ OneTailor: ${overdueTasks.length} overdue follow-up task(s) need attention!\n\nLog in to the CRM to review and action them now.`;
      sendCallMeBotAlert(settings.callmebotPhone, settings.callmebotApiKey, msg).catch(() => {});
    }

    return void res.json({ created, overdue: overdueTasks.length, message: `Generated ${created} follow-up tasks. ${overdueTasks.length} task(s) overdue.` });
  } catch (err) {
    console.error("Generate tasks error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
