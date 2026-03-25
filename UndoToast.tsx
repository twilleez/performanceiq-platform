// Push notification service worker
// Receives and displays push notifications when app is in background

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'PerformanceIQ', body: event.data.text() };
  }

  const options = {
    body:    payload.body    ?? '',
    icon:    payload.icon    ?? '/icons/piq-192.png',
    badge:   payload.badge   ?? '/icons/piq-badge-96.png',
    tag:     payload.tag     ?? 'piq-notification',
    data:    payload.data    ?? {},
    actions: payload.actions ?? [],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'PerformanceIQ', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
