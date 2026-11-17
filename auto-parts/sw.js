// عامل الخدمة لتوين (PWA):
//  • يفتح التطبيق بسرعة ويشتغل بدون نت (يعرض آخر نسخة محفوظة + صفحة «ما فيه اتصال»)
//  • ما يحفظ أي استجابة من /api أبداً (بيانات حساسة ومتغيرة)
//  • تنبيهات الجوال حتى والتطبيق مقفل: الخادم يرسل «نبضة» بدون محتوى، وهنا نجيب آخر تنبيه للمستخدم ونعرضه
const VERSION = 'toyun-v1'
const SHELL = ['/', './offline.html', './manifest.webmanifest', './favicon.svg', './icons/icon-192.png', './icons/badge-96.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return // الـAPI دائماً من الشبكة
  // الصفحات: الشبكة أولاً (أحدث نسخة)، وبدون نت: الواجهة المحفوظة ثم صفحة عدم الاتصال
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('/', copy)); return res })
        .catch(async () => (await caches.match('/')) || (await caches.match('./offline.html'))),
    )
    return
  }
  // الملفات الثابتة (أسماؤها فيها بصمة): من المحفوظ فوراً وتتحدث بالخلفية
  if (/^\/(assets|icons|img)\//.test(url.pathname) || url.pathname === './favicon.svg') {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req)
      const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res }).catch(() => hit)
      return hit || net
    }))
  }
})

// ── التنبيهات ──
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let n = null
    try {
      const r = await fetch('/api/push/latest', { credentials: 'include' })
      if (r.ok) n = (await r.json()).notification
    } catch { /* بدون نت */ }
    // لو التطبيق مفتوح وظاهر قدّام المستخدم، يكفي التنبيه داخل التطبيق
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (wins.some((w) => w.visibilityState === 'visible')) return
    await self.registration.showNotification('توين', {
      body: n?.text || 'عندك تحديث جديد في توين',
      icon: './icons/icon-192.png', badge: './icons/badge-96.png', lang: 'ar', dir: 'rtl',
      tag: n?.id || 'toyun', renotify: true, data: { url: n?.url || '/' },
    })
  })())
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = e.notification.data?.url || '/'
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const w = wins.find((x) => new URL(x.url).origin === location.origin)
    if (w) { await w.focus(); return w.navigate(target).catch(() => {}) }
    return self.clients.openWindow(target)
  })())
})
// صفحة الواجهة تطلب عرض تنبيه (مثل ما يجي من التحديث الدوري والتطبيق بالخلفية)
self.addEventListener('message', (e) => {
  if (e.data?.type === 'notify') self.registration.showNotification('توين', { body: e.data.text, icon: './icons/icon-192.png', badge: './icons/badge-96.png', lang: 'ar', dir: 'rtl', tag: e.data.tag || 'toyun', data: { url: e.data.url || '/' } })
})
