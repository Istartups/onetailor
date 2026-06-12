/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

precacheAndRoute(self.__WB_MANIFEST);

// Handle Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const actions: { action: string; title: string }[] = [];
    if (data.ctaText && data.ctaUrl) {
      actions.push({ action: 'cta', title: data.ctaText });
    }

    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon || '/onetailor-logo.png',
      badge: '/favicon.svg',
      actions,
      data: {
        url: data.url || '/',
        ctaUrl: data.ctaUrl || null,
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (err) {
    console.error('Push event error:', err);
  }
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  let targetUrl: string;

  if ((event as any).action === 'cta' && notifData.ctaUrl) {
    targetUrl = notifData.ctaUrl;
  } else {
    targetUrl = notifData.url || '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          (client as any).navigate?.(targetUrl);
          return (client as any).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
