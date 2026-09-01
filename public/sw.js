/* Summit push worker.

   Summit is an installable app, not an offline app. This worker exists for one
   reason: to receive web push and to open the right screen when the person taps
   the notification. It stores nothing, it has no fetch handler, it never serves
   a response, and it never navigates or reloads a tab on its own.

   On activation it removes the caches the old caching worker created, so a
   phone that still holds that bucket is cleaned up once and then left alone. */

function isSummitAppShellCache(name) {
  return /^summit-(static|shell)-/.test(name);
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      try {
        if (self.caches) {
          const names = await caches.keys();
          await Promise.allSettled(names.filter(isSummitAppShellCache).map((n) => caches.delete(n)));
        }
      } catch {
        /* cleanup must never break push delivery */
      }
      await self.clients.claim();
    })()
  )
);

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Summit', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Summit';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || undefined,
    data: { link: payload.link || '/app' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/app';
  const target = new URL(link, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if (client.url === target && 'focus' in client) return client.focus();
      }
      const open = all.find((c) => 'focus' in c);
      if (open && 'navigate' in open) {
        await open.focus();
        return open.navigate(target);
      }
      return self.clients.openWindow(target);
    })()
  );
});
