import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { authenticateAdmin } from "../middlewares/auth";

const router: IRouter = Router();

// Configure web-push
const vapidPublicKey = process.env["VAPID_PUBLIC_KEY"] || "";
const vapidPrivateKey = process.env["VAPID_PRIVATE_KEY"] || "";
const adminEmail = process.env["ADMIN_EMAIL"] || "admin@onetailor.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    `mailto:${adminEmail}`,
    vapidPublicKey,
    vapidPrivateKey
  );
}

// --- Public Routes ---

// Get VAPID Public Key
router.get("/notifications/vapid-key", (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

// Save/Update Push Subscription
router.post("/notifications/subscribe", async (req, res) => {
  const { deviceId, subscription } = req.body;

  if (!deviceId || !subscription || !subscription.endpoint) {
    res.status(400).json({ message: "Invalid subscription data" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
    
    // Upsert subscription
    const existing = await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      await db.update(pushSubscriptionsTable)
        .set({
          userId: user?.id || null,
          deviceId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        })
        .where(eq(pushSubscriptionsTable.endpoint, subscription.endpoint));
    } else {
      await db.insert(pushSubscriptionsTable).values({
        userId: user?.id || null,
        deviceId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
    }

    res.json({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("Subscription Error:", error);
    res.status(500).json({ message: "Failed to subscribe" });
  }
});

// --- Admin Routes ---

// Send Broadcast Notification
router.post("/admin/notifications/broadcast", authenticateAdmin as any, async (req, res) => {
  const { title, body, url, icon, ctaText, ctaUrl } = req.body;

  if (!title || !body) {
    res.status(400).json({ message: "Title and body are required" });
    return;
  }

  try {
    const subscriptions = await db.select().from(pushSubscriptionsTable);
    
    const notificationPayload = JSON.stringify({
      title,
      body,
      url: url || "/",
      icon: icon || "/onetailor-logo.png",
      ctaText: ctaText || null,
      ctaUrl: ctaUrl || null,
    });

    const sendPromises = subscriptions.map(async (sub: typeof subscriptions[number]) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or no longer valid, delete it
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
        }
        console.error("Push Send Error for sub", sub.id, error.message);
      }
    });

    await Promise.all(sendPromises);
    res.json({ message: `Notification sent to ${subscriptions.length} devices` });
  } catch (error) {
    console.error("Broadcast Error:", error);
    res.status(500).json({ message: "Failed to send broadcast" });
  }
});

export default router;
