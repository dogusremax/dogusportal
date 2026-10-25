// Doğuş Portal servis çalışanı — YALNIZ telefon bildirimleri için.
// Sayfa önbelleği yok (fetch dinlenmiyor), site her zaman ağdan gelir.
// Gelen veri (Firebase üzerinden, dogus-whatsapp-service / Bildirim.js): {data:{baslik, metin, link, etiket, bid?, kim?}}
// hid, sayi: Bildirimlerim kutusundaki kayıt ve okunmamış sayısı (ana ekran simgesinde rozet).
// Elle gönderilen bildirimde (bid, kim dolu) telefona ulaştığı ve dokunulduğu Bildirim.js'e bildirilir (action=bildirimIz).
const WA = 'https://script.google.com/macros/s/AKfycbwqxxXftJ_b1TrF_GFYfus6dtBe6lp4gDWTZVl9QuXAjYxjHfSvl2Ni_X3mJKm6zAss_w/exec';
function iz(olay, d) {
  if (!d || !d.bid || !d.kim) return Promise.resolve();
  return fetch(WA, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'bildirimIz', olay, bid: d.bid, kim: d.kim }) }).catch(() => {});
}
function rozet(n) {
  n = Number(n) || 0;
  try { if (self.navigator.setAppBadge) return (n > 0 ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge()).catch(() => {}); } catch (e) {}
  return Promise.resolve();
}
// Bildirime dokununca Bildirimlerim kutusunda okundu sayılır, rozet güncellenir
function okundu(d) {
  if (!d || !d.hid) return Promise.resolve();
  const p = new URLSearchParams({ action: 'bildirimOkundu', hid: d.hid });
  return fetch(WA, { method: 'POST', body: p }).then(r => r.json()).then(j => { if (j && j.ok) return rozet(j.okunmamis); }).catch(() => {});
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let d = {};
  try { const j = event.data ? event.data.json() : {}; d = j.data || j.notification || j; } catch (e) {}
  event.waitUntil(Promise.all([iz('ulasti', d), d.sayi ? rozet(d.sayi) : null, self.registration.showNotification(d.baslik || d.title || 'RE/MAX Doğuş', {
    body: d.metin || d.body || '',
    icon: '/assets/app-ikon-192.png',
    badge: '/assets/app-ikon-192.png',
    tag: d.etiket || undefined,
    renotify: !!d.etiket,   // aynı türden yeni bildirim de sesle uyarsın
    silent: false,
    data: { link: d.link || '', bid: d.bid || '', kim: d.kim || '', hid: d.hid || '' }
  })]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || self.registration.scope;
  event.waitUntil(Promise.all([iz('dokundu', event.notification.data), okundu(event.notification.data),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (link === self.registration.scope) {
        const acik = list.find(c => c.url.startsWith(self.registration.scope));
        if (acik) return acik.focus();
      }
      return self.clients.openWindow(link);
    })
  ]));
});
