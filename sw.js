// Doğuş Portal servis çalışanı — YALNIZ telefon bildirimleri için.
// Sayfa önbelleği yok (fetch dinlenmiyor), site her zaman ağdan gelir.
// Gelen veri (Firebase üzerinden, dogus-whatsapp-service / Bildirim.js): {data:{baslik, metin, link, etiket}}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let d = {};
  try { const j = event.data ? event.data.json() : {}; d = j.data || j.notification || j; } catch (e) {}
  event.waitUntil(self.registration.showNotification(d.baslik || d.title || 'RE/MAX Doğuş', {
    body: d.metin || d.body || '',
    icon: '/assets/app-ikon-192.png',
    badge: '/assets/app-ikon-192.png',
    tag: d.etiket || undefined,
    renotify: !!d.etiket,   // aynı türden yeni bildirim de sesle uyarsın
    silent: false,
    data: { link: d.link || '' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (link === self.registration.scope) {
        const acik = list.find(c => c.url.startsWith(self.registration.scope));
        if (acik) return acik.focus();
      }
      return self.clients.openWindow(link);
    })
  );
});
