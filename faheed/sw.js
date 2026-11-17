// Service Worker — إشعارات Push + كاش أساسي
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'وفّر', body: event.data?.text() || '' }; }
  const title = data.title || 'وفّر';
  const options = {
    body: data.body || 'وصلك عرض جديد!',
    icon: './icon.svg',
    badge: './icon.svg',
    dir: 'rtl',
    lang: 'ar',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
