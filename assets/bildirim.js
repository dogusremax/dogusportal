/* Doğuş Portal — telefon bildirimleri (Firebase Cloud Messaging ile web push).
 * Kişi bir kez adını seçip izin verir; telefonun bildirim adresi
 * dogus-whatsapp-service'e (Bildirim.js) o adla kaydedilir. Oradan yeni müşteri
 * yönlendirmesi ve sabah takip hatırlatması gönderilir.
 * Gönderme anahtarı Kapanış Formu > Broker Paneli > 🔔 içinden yüklenir. */
(function () {
  var WA = 'https://script.google.com/macros/s/AKfycbwqxxXftJ_b1TrF_GFYfus6dtBe6lp4gDWTZVl9QuXAjYxjHfSvl2Ni_X3mJKm6zAss_w/exec';
  var CONFIG = {                       // herkese açık Firebase web ayarları
    apiKey: 'AIzaSyCchJJKBB-iJTwH0tLDN4OL14iVx5zi7lE',
    authDomain: 'dogus-bildirim.firebaseapp.com',
    projectId: 'dogus-bildirim',
    storageBucket: 'dogus-bildirim.firebasestorage.app',
    messagingSenderId: '756084706346',
    appId: '1:756084706346:web:a009be1467cea77bff0753'
  };
  var VAPID = 'BH8LvqJz-RN9r-YTLX6iDNe8DZghco5q6gn0dEnspWPgXmC7wyn3WVtHdy4LKx9rmF2Mi8dP_5ACRYyMPk926VM';
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  // Müşteri Takip'teki adlarla aynı (bildirimler bu adlara gönderilir)
  var KISILER = ['Aysun Yılmaz', 'Ayşegül Alpay', 'Evşen Özazman', 'Gamze Yetkin', 'Gizem Gök',
    'İrem Tetik', 'Makbule Tokkuş', 'Orhan Özazman', 'Özlem Varol', 'Umut Tokkuş'];

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k) || ''; if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
    return '';
  }
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  function anaEkranda() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  function destekli() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function cihaz() {
    var u = navigator.userAgent;
    return (ios ? 'iPhone' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Diğer') +
      ' · portal' + (anaEkranda() ? ' (uygulama)' : ' (tarayıcı)');
  }
  function acikMi() { return destekli() && Notification.permission === 'granted' && !!ls('bld_token'); }

  var swKayit = null;
  if ('serviceWorker' in navigator) {
    swKayit = navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(function () { return null; });
  }

  function post(action, ek) {
    var p = new URLSearchParams(); p.append('action', action);
    Object.keys(ek || {}).forEach(function (k) { p.append(k, String(ek[k])); });
    return fetch(WA, { method: 'POST', body: p, redirect: 'follow' }).then(function (r) { return r.json(); });
  }
  function token() {
    return Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-messaging.js')]).then(function (m) {
      var app = m[0], msg = m[1];
      return msg.isSupported().then(function (ok) {
        if (!ok) throw new Error('Bu tarayıcı bildirimleri desteklemiyor');
        var fa = app.getApps().length ? app.getApp() : app.initializeApp(CONFIG);
        return navigator.serviceWorker.ready.then(function (reg) {
          return msg.getToken(msg.getMessaging(fa), { vapidKey: VAPID, serviceWorkerRegistration: reg });
        });
      });
    });
  }
  function aboneOl(kisi) {
    return token().then(function (t) {
      if (!t) throw new Error('Bildirim adresi alınamadı');
      return post('pushAbone', { danisman: kisi, token: t, cihaz: cihaz() }).then(function (j) {
        if (!j.ok) throw new Error(j.error || 'Kayıt olmadı');
        ls('bld_token', t); ls('bld_kisi', kisi); ls('bld_tarih', String(Date.now()));
      });
    });
  }

  /* ── Panel ─────────────────────────────────────────────── */
  var css = '#bldOrt{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px}' +
    '#bldOrt.acik{display:flex}' +
    '#bldKutu{background:#fff;border-radius:20px;padding:24px 22px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:Inter,-apple-system,sans-serif;animation:rise .3s ease}' +
    '#bldKutu h3{font-family:Archivo,sans-serif;font-size:19px;margin:0 0 8px}' +
    '#bldKutu p{font-size:14px;color:#68738a;line-height:1.5;margin:0 0 14px}' +
    '#bldKutu select{width:100%;padding:12px;border:1.5px solid #e3e7ee;border-radius:12px;font:inherit;font-size:15px;margin-bottom:6px;background:#fff}' +
    '#bldKutu button{width:100%;padding:13px;margin-top:8px;border-radius:12px;font:inherit;font-size:15px;font-weight:600;cursor:pointer;border:0}' +
    '#bldKutu .ana{background:linear-gradient(135deg,#003DA5,#004e92);color:#fff}' +
    '#bldKutu .ikinci{background:#f0f3f8;color:#131a26}' +
    '#bldKutu .kapat{background:none;color:#888;font-weight:500}' +
    '#bldDurum{font-size:13px;color:#68738a;min-height:18px;margin-top:10px;text-align:center}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var ort = document.createElement('div'); ort.id = 'bldOrt';
  ort.innerHTML = '<div id="bldKutu"><h3>🔔 Telefon bildirimleri</h3><p id="bldAcik"></p>' +
    '<select id="bldKisi"><option value="">Adını seç…</option>' + KISILER.map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select>' +
    '<button class="ana" id="bldAc">Bildirimleri aç</button>' +
    '<button class="ikinci" id="bldTest">Deneme bildirimi gönder</button>' +
    '<button class="ikinci" id="bldKapa">Bu telefonda bildirimleri kapat</button>' +
    '<div id="bldDurum"></div><button class="kapat" id="bldKapat">Kapat</button></div>';
  document.body.appendChild(ort);
  function $(id) { return document.getElementById(id); }
  function yaz(t) { $('bldDurum').textContent = t || ''; }
  function goster(el, v) { el.style.display = v ? '' : 'none'; }

  function ciz() {
    var acik = $('bldAcik'), kisi = $('bldKisi');
    goster(kisi, false); goster($('bldAc'), false); goster($('bldTest'), false); goster($('bldKapa'), false);
    if (ios && !anaEkranda()) {
      acik.innerHTML = 'iPhone\'da bildirim için portalı ana ekrana eklemelisin: Safari\'de alttaki <b>Paylaş</b> tuşu &gt; <b>Ana Ekrana Ekle</b>. Sonra portalı ana ekrandaki simgesinden açıp bu tuşa tekrar bas.';
    } else if (!destekli()) {
      acik.textContent = 'Bu telefon ya da tarayıcı bildirimleri desteklemiyor. iPhone\'da iOS 16.4 veya üstü gerekir; portalı ana ekrandan sildirip yeniden eklemek gerekebilir.';
    } else if (Notification.permission === 'denied') {
      acik.innerHTML = 'Bildirim izni kapalı. ' + (ios ? 'Ayarlar &gt; Bildirimler &gt; <b>RE/MAX Doğuş</b>' : 'Tarayıcı ayarlarında bu site için Bildirimler') + ' iznini açıp tekrar dene.';
    } else if (acikMi()) {
      acik.textContent = 'Bildirimler bu telefonda açık (' + ls('bld_kisi') + '). Sana yeni müşteri yönlendirildiğinde ve sabah aranacak müşterilerin için bildirim gelir.';
      goster($('bldTest'), true); goster($('bldKapa'), true);
    } else {
      acik.textContent = 'Adını seçip aç: sana yeni müşteri yönlendirildiğinde ve sabah o gün aranacak müşterilerin olduğunda bu telefona bildirim gelir.';
      kisi.value = ls('bld_kisi'); goster(kisi, true); goster($('bldAc'), true);
    }
  }
  // Portalda tek "Bildirimler" kartı: kapalıyken bu paneli açar, açıkken Bildirimlerim listesine gider
  function kartGuncelle() {
    var d = document.getElementById('bldlerimDesc');
    if (d) d.textContent = acikMi() ? 'Açık · ' + ls('bld_kisi') + ' · son 30 günün bildirimleri' : 'Kapalı · dokun, yeni müşteri ve takip hatırlatmaları telefonuna gelsin';
  }
  window.bildirimAcikMi = acikMi;
  window.bildirimPaneli = function () { yaz(''); ciz(); ort.classList.add('acik'); };
  function kapat() { ort.classList.remove('acik'); kartGuncelle(); bildirimlerimSay(); document.dispatchEvent(new Event('bildirimDegisti')); }
  $('bldKapat').onclick = kapat;
  ort.onclick = function (e) { if (e.target === ort) kapat(); };
  $('bldAc').onclick = function () {
    var kisi = $('bldKisi').value, b = this;
    if (!kisi) { yaz('Önce adını seç.'); return; }
    b.disabled = true; yaz('İzin isteniyor…');
    // İzin isteği dokunuşun hemen ardından gelmeli (iPhone şartı)
    Notification.requestPermission().then(function (izin) {
      if (izin !== 'granted') { yaz(izin === 'denied' ? 'İzin reddedildi.' : 'İzin penceresi kapandı, tekrar dene ve "İzin Ver" de.'); ciz(); return; }
      yaz('Kaydediliyor…');
      return aboneOl(kisi).then(function () { ciz(); yaz('Bildirimler açıldı ✓ Deneme bildirimiyle kontrol edebilirsin.'); });
    }).catch(function (e) { yaz('Hata: ' + (e.message || e)); }).then(function () { b.disabled = false; });
  };
  $('bldTest').onclick = function () {
    yaz('Gönderiliyor…');
    post('pushTest', { token: ls('bld_token') }).then(function (j) {
      if (j.ok) yaz('Gönderildi, birkaç saniye içinde gelmeli.');
      else if (j.error === 'ABONE_YOK') { ls('bld_token', null); ciz(); yaz('Bu telefonun kaydı bulunamadı, tekrar aç.'); }
      else if (j.error === 'ANAHTAR_YOK') yaz('Gönderme anahtarı henüz yüklenmedi.');
      else yaz('Gitmedi: ' + (j.sonuc || j.error || ''));
    }).catch(function (e) { yaz('Hata: ' + (e.message || e)); });
  };
  $('bldKapa').onclick = function () {
    var t = ls('bld_token');
    ['bld_token', 'bld_kisi', 'bld_tarih'].forEach(function (k) { ls(k, null); });
    if (t) post('pushAyril', { token: t }).catch(function () {});
    ciz(); yaz('Bu telefona artık bildirim gelmeyecek.');
  };

  // Açık aboneliği günde bir tazele (adres zamanla değişebilir)
  if (acikMi() && Date.now() - (+ls('bld_tarih') || 0) > 864e5) {
    aboneOl(ls('bld_kisi')).catch(function (e) { console.warn('Bildirim tazelenemedi:', e); });
  }
  kartGuncelle();

  // Bildirimlerim kartı: herkese görünür; okunmamış sayısı rozette
  // (ana ekran simgesindeki rozet de güncellenir)
  function bildirimlerimSay() {
    var kart = document.getElementById('bldlerimKart');
    if (!kart) return;
    kart.style.display = '';
    if (!ls('bld_token')) { document.getElementById('bldlerimSayi').style.display = 'none'; return; }
    post('bildirimlerim', { token: ls('bld_token'), islem: 'liste' }).then(function (j) {
      if (!j.ok) return;
      var n = j.okunmamis || 0, r = document.getElementById('bldlerimSayi'), d = document.getElementById('bldlerimDesc');
      r.textContent = n > 9 ? '9+' : String(n); r.style.display = n > 0 ? '' : 'none';
      d.textContent = n > 0 ? n + ' okunmamış bildirimin var' : 'Açık · ' + ls('bld_kisi') + ' · son 30 günün bildirimleri';
      try { if (navigator.setAppBadge) (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(function () {}); } catch (e) {}
    }).catch(function () {});
  }
  bildirimlerimSay();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') bildirimlerimSay(); });
})();
