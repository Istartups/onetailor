import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { authenticateAdmin } from "../middlewares/auth";

const router: IRouter = Router();

// Configure web-push
const vapidPublicKey  = process.env["VAPID_PUBLIC_KEY"]  || "";
const vapidPrivateKey = process.env["VAPID_PRIVATE_KEY"] || "";
const adminEmail      = process.env["ADMIN_EMAIL"]        || "admin@onetailor.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(`mailto:${adminEmail}`, vapidPublicKey, vapidPrivateKey);
}

// ─── Public Routes ─────────────────────────────────────────────────────────────

router.get("/notifications/vapid-key", (req, res) => {
  return void res.json({ publicKey: vapidPublicKey });
});

router.post("/notifications/subscribe", async (req, res) => {
  const { deviceId, subscription } = req.body;

  const p256dh = subscription?.keys?.p256dh;
  const auth   = subscription?.keys?.auth;

  if (!deviceId || !subscription?.endpoint || !p256dh || !auth) {
    return void res.status(400).json({ message: "Invalid subscription: endpoint and keys (p256dh, auth) are required" });
  }

  try {
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.deviceId, deviceId)).limit(1);

    const [existing] = await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, subscription.endpoint)).limit(1);

    if (existing) {
      await db.update(pushSubscriptionsTable)
        .set({ userId: user?.id ?? null, deviceId, p256dh, auth })
        .where(eq(pushSubscriptionsTable.endpoint, subscription.endpoint));
    } else {
      await db.insert(pushSubscriptionsTable).values({
        userId: user?.id ?? null,
        deviceId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      });
    }

    return void res.json({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("Subscription Error:", error);
    return void res.status(500).json({ message: "Failed to subscribe" });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

router.post("/admin/notifications/broadcast", authenticateAdmin as any, async (req, res) => {
  const { title, body, url, icon, ctaText, ctaUrl } = req.body;

  if (!title || !body) {
    return void res.status(400).json({ message: "Title and body are required" });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return void res.status(503).json({ message: "Push notifications not configured — VAPID keys missing" });
  }

  try {
    const subscriptions = await db.select().from(pushSubscriptionsTable);

    const payload = JSON.stringify({
      title, body,
      url: url || "/",
      icon: icon || "/onetailor-logo.png",
      ctaText: ctaText || null,
      ctaUrl: ctaUrl || null,
    });

    let sent = 0, failed = 0, removed = 0;

    await Promise.all(subscriptions.map(async (sub: typeof subscriptions[number]) => {
      if (!sub.p256dh || !sub.auth) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
        removed++;
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (error: any) {
        failed++;
        if (error.statusCode === 410 || error.statusCode === 404) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
          removed++;
        } else {
          console.error(`Push failed sub#${sub.id}:`, error.message);
        }
      }
    }));

    return void res.json({
      message: `Broadcast complete`,
      sent, failed, removed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("Broadcast Error:", error);
    return void res.status(500).json({ message: "Failed to send broadcast" });
  }
});

export default router;
