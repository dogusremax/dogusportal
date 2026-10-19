/* Doğuş Portal — okuma takibi (dogus-whatsapp-service · Bildirim.js, action=bildirimIz).
 * Elle gönderilen bildirime dokunan kişi sayfaya ?bid=..&bk=<ad> ile gelir. Bu dosya
 * "açtı" olayını, sayfada kalınan süreyi ve ekranda görülen bölümleri (section[id]) bildirir.
 * Yalnız kim olduğu bilinen ekip üyelerini sayar (bildirimden gelen ad, Kıbrıs sunumu girişi
 * ya da portalda bildirim açılırken seçilen ad); adı bilinmeyen ziyaretçi (müşteri) sayılmaz.
 * Rapor: bildirim-gonder.html > Gönderilenler. */
(function () {
  var WA = 'https://script.google.com/macros/s/AKfycbwqxxXftJ_b1TrF_GFYfus6dtBe6lp4gDWTZVl9QuXAjYxjHfSvl2Ni_X3mJKm6zAss_w/exec';
  function st(s, k, v) { try { if (v === undefined) return s.getItem(k) || ''; s.setItem(k, v); } catch (e) {} return ''; }
  var q = new URLSearchParams(location.search);
  var gelenBid = q.get('bid') || '', gelenAd = q.get('bk') || '';
  if (gelenBid) st(sessionStorage, 'izBid', gelenBid);
  if (gelenAd) st(localStorage, 'izKim', gelenAd);
  if (gelenBid || gelenAd) {           // adres çubuğunda takip bilgisi kalmasın (paylaşılırsa başkası adına sayılmasın)
    q.delete('bid'); q.delete('bk');
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
  }
  function kim() {
    return gelenAd || st(sessionStorage, 'kibrisKim') || st(localStorage, 'izKim') || st(localStorage, 'bld_kisi') ||
      (window.brokerPinAl && window.brokerAdAl && brokerPinAl() ? brokerAdAl() : '');
  }
  var oturum = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function gonder(olay, ek) {
    var k = kim();
    if (!k) return;
    var veri = JSON.stringify(Object.assign({ action: 'bildirimIz', olay: olay, kim: k, bid: st(sessionStorage, 'izBid'),
      sayfa: location.pathname, oturum: oturum }, ek || {}));
    try { if (navigator.sendBeacon && navigator.sendBeacon(WA, new Blob([veri], { type: 'text/plain' }))) return; } catch (e) {}
    try { fetch(WA, { method: 'POST', mode: 'no-cors', keepalive: true, body: veri }); } catch (e) {}
  }
  window.izOlay = gonder;
  if (document.currentScript && document.currentScript.hasAttribute('data-yalniz-api')) return;

  // Süre: yalnız sayfa ekrandayken sayılır
  var toplam = 0, basla = document.visibilityState === 'visible' ? Date.now() : 0, bolum = {}, sonGiden = '';
  function sn() { return Math.round((toplam + (basla ? Date.now() - basla : 0)) / 1000); }
  function ozet() {
    var s = sn(), b = Object.keys(bolum), imza = s + '|' + b.length;
    if (s < 3 || imza === sonGiden) return;
    sonGiden = imza; gonder('ozet', { sn: s, bolumler: b });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { if (!basla) basla = Date.now(); }
    else { if (basla) { toplam += Date.now() - basla; basla = 0; } ozet(); }
  });
  window.addEventListener('pagehide', ozet);
  setInterval(function () { if (basla) ozet(); }, 60000);   // uygulama kapatılınca olay gelmeyebilir; dakikada bir ara özet

  function hazir() {
    // Kıbrıs sunumunda danışman şifresi sunucuda kontrol edilirken ad birkaç saniye sonra gelir
    (function acti(n) { if (kim()) gonder('acti'); else if (n < 10) setTimeout(function () { acti(n + 1); }, 1500); })(0);
    if (!('IntersectionObserver' in window)) return;
    // Bölüm, ekranın ortasında en az 2 saniye durursa "görüldü" sayılır (hızla kaydırıp geçmek sayılmaz)
    var sayac = new Map();
    var io = new IntersectionObserver(function (ls) {
      ls.forEach(function (e) {
        clearTimeout(sayac.get(e.target));
        if (!e.isIntersecting) return;
        sayac.set(e.target, setTimeout(function () {
          var h = e.target.querySelector('h1,h2');
          bolum[(h ? h.textContent : e.target.id).replace(/\s+/g, ' ').trim().slice(0, 40)] = 1;
          io.unobserve(e.target);
        }, 2000));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('section[id]').forEach(function (s) { io.observe(s); });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', hazir) : hazir();
})();
