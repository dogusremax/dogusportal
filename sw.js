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
    data: { link: d.link || '', bid: d.bid || '', kim: d.kim || '', hid: d.hid || '',
      baslik: d.baslik || d.title || '', metin: d.metin || d.body || '' }
  })]));
});

// Dış site linki (ör. sahibinden ilanı) iPhone'da ana ekran uygulamasından doğrudan açılmıyor, dokunuş boşa gidiyordu.
// Bu yüzden önce portalda ac.html açılır: bildirimin kendisi + "İlanı aç" düğmesi + Bildirimlerim.
// Linksiz bildirim (ör. günlük özet, Meta şablon haberi) Bildirimlerim'de kendisi vurgulu, tam metniyle açılır.
function acilacak(d) {
  if (!(d && d.link) && d && d.hid) return new URL('bildirimlerim.html?h=' + encodeURIComponent(d.hid) + '&cb=' + Date.now(), self.registration.scope).href;
  const link = (d && d.link) || self.registration.scope;
  let u; try { u = new URL(link, self.registration.scope); } catch (e) { return self.registration.scope; }
  if (u.origin === self.location.origin) return u.href;
  const q = new URLSearchParams({ u: u.href, b: (d && d.baslik) || '', m: (d && d.metin) || '', cb: Date.now() });
  return new URL('ac.html?' + q, self.registration.scope).href;
}
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const d = event.notification.data || {};
  const link = acilacak(d);
  // Pencereyi hemen aç (iz/okundu istekleri beklenmez; iOS geç açılan pencereyi engelleyebiliyor)
  const ac = link === self.registration.scope
    ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        const acik = list.find(c => c.url.startsWith(self.registration.scope));
        return acik ? acik.focus() : self.clients.openWindow(link);
      })
    : self.clients.openWindow(link);
  event.waitUntil(Promise.all([ac.catch(() => {}), iz('dokundu', d), okundu(d)]));
});
