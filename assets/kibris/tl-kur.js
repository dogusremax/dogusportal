/* Kıbrıs: £ tutarların altına anlık TL karşılığı ve uyarı notu (kibris-sunum, Kıbrıs Katalog GAS, ödeme planı).
   Kullanım: KTL.kur({ sel: "£ tutar yazan öğeler (CSS)", not: ["notun altına ekleneceği kutular (CSS)"] })
   Kur piyasadan (finans.truncgil.com, dakikalık; sayfa açıkken dakikada bir tazelenir) çekilir; yanıt yoksa TCMB kuru
   (dogusportal.com/assets/kibris/kur.json). İkisi de yoksa ya da kur 10 günden eskiyse TL satırları ve not hiç görünmez.
   TL, öğenin data-tlk niteliğine yazılır ve CSS ::after ile gösterilir; öğenin metni değişse de (animasyon, yeniden çizim) bozulmaz.
   kibris.html'in kendi gömülü sürümü var (CANLI TL KARŞILIĞI). */
(function () {
  if (window.KTL) return;
  var K = 0, T = '', P = 0, raf = 0, obs = false, AYAR = [];
  var NOT = ['<b class="tlk-w">Uyarı:</b> TL tutarlar yalnızca bilgi amaçlıdır ve kura göre anlık değişir. Fiyat, sözleşme ve ödemeler sterlin (£) üzerindendir. TL karşılıkları anlık piyasa kuruyla (GBP döviz satış) hesaplanır: <b>£1 = {k} TL</b> ({t} itibarıyla, dakikada bir güncellenir).',
             '<b class="tlk-w">Uyarı:</b> TL tutarlar yalnızca bilgi amaçlıdır ve kura göre değişir. Fiyat, sözleşme ve ödemeler sterlin (£) üzerindendir. TL karşılıkları TCMB GBP döviz satış kuruyla hesaplanır: <b>£1 = {k} TL</b> ({t}, 15:30).'];
  var css = document.createElement('style');
  css.textContent = '[data-tlk]::after{content:attr(data-tlk);display:block;font:500 max(.68rem,.42em)/1.3 Arial,Helvetica,sans-serif;letter-spacing:0;text-transform:none;opacity:.72;margin-top:2px;white-space:nowrap;direction:ltr}' +
    '.tlk-not{margin:10px 0 0;padding:8px 11px;border:1px solid rgba(201,150,60,.5);background:rgba(242,181,92,.09);border-radius:10px;font:400 .74rem/1.45 Arial,Helvetica,sans-serif;letter-spacing:0;text-align:left;text-transform:none}' +
    '.tlk-not .tlk-w{color:#C9963C}@media print{.tlk-not{break-inside:avoid}}';
  document.head.appendChild(css);

  var tl = function (n) { return Math.round(n * K).toLocaleString('tr-TR'); };
  var num = function (s) { return +String(s).replace(/\D/g, ''); };
  var RE = /£\s?(\d[\d.,   ]*\d|\d)(?:\s*[–-]\s*£?(\d[\d.,   ]*\d|\d))?/;
  function tag(el) {
    var i = el.tagName === 'INPUT' ? el : null;
    var m = RE.exec(i ? '£' + i.value : (el.textContent || ''));
    var v = m && num(m[1]) ? '≈ ' + tl(num(m[1])) + (m[2] ? ' – ' + tl(num(m[2])) : '') + ' TL' : '';
    if (v) { if (el.getAttribute('data-tlk') !== v) el.setAttribute('data-tlk', v); }
    else if (el.hasAttribute('data-tlk')) el.removeAttribute('data-tlk');
  }
  function notlar(a) {
    var t = NOT[P ? 0 : 1].replace('{k}', K.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })).replace('{t}', T);
    (a.not || []).forEach(function (s) {
      [].forEach.call(document.querySelectorAll(s), function (box) {
        var p = box.nextElementSibling;
        if (!p || !p.classList.contains('tlk-not')) { p = document.createElement('p'); p.className = 'tlk-not'; box.parentNode.insertBefore(p, box.nextSibling); }
        if (p.innerHTML !== t) p.innerHTML = t;
      });
    });
  }
  function run() { raf = 0; if (!K) return; AYAR.forEach(function (a) { if (a.sel) [].forEach.call(document.querySelectorAll(a.sel), tag); notlar(a); }); }
  function later() { if (!raf) raf = requestAnimationFrame(run); }
  var eski = function (d) { return (Date.now() - d) / 864e5 > 10; };
  function set(k, t, p) {
    K = k; T = t; P = p; run();
    if (!obs) { obs = true;
      new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true });
      document.addEventListener('input', later, true); }
  }
  function tcmb() { if (P) return;
    fetch('https://dogusportal.com/assets/kibris/kur.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (k) {
      if (P || !k || !(k.kur > 0) || !k.tarih || eski(new Date(k.tarih + 'T12:00:00Z'))) return;
      var d = k.tarih.split('-'); set(+k.kur, d[2] + '.' + d[1] + '.' + d[0], 0); }).catch(function () {});
  }
  function piyasa() {
    // Update_Date İstanbul saatiyle "2026-10-28 05:45:04"
    return fetch('https://finans.truncgil.com/v4/today.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var k = j && j.GBP && +j.GBP.Selling, m = j && /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(j.Update_Date || '');
      if (!(k > 20 && k < 1000) || !m || eski(Date.UTC(+m[1], m[2] - 1, +m[3], m[4] - 3, +m[5]))) throw 0;
      set(k, m[3] + '.' + m[2] + '.' + m[1] + ' ' + m[4] + ':' + m[5], 1);
    });
  }
  var basladi = false;
  function basla() {
    if (basladi) return; basladi = true;
    piyasa().catch(function () { tcmb(); setTimeout(function () { piyasa().catch(function () {}); }, 1500); });
    setInterval(function () { if (!document.hidden) piyasa().catch(function () { if (!K) tcmb(); }); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && P) piyasa().catch(function () {}); });
  }
  window.KTL = {
    kur: function (a) { AYAR.push(a || {}); basla(); later(); },
    tazele: later,
    kurBilgi: function () { return K ? { kur: K, zaman: T, piyasa: !!P } : null; }
  };
})();
