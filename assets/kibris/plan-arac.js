/* Kıbrıs kataloğu hesaplayıcısı için ortak araç: düzenlenebilir masraf kalemleri ve logolu ödeme planı penceresi.
   Hem kibris-sunum.html hem Apps Script Kıbrıs Katalog portalı (projects/kibris-katalog/Index.html) yükler.
   KPA.masrafKur(el, cur, anahtar) : el içine masraf listesini kurar (anahtar, ör. proje adı, değişince kalemler sıfırlanır)
   KPA.fiyat(f)            : fiyat değişince yüzdeli kalemleri yeniden hesaplar (elle değiştirilenlere dokunmaz)
   KPA.secili()            : planda yer alacak kalemler [[ad, tutar, para, not]]
   KPA.planAc(veri)        : odeme-plani.html'i aynı sayfada pencere olarak açar (başka sayfaya gitmez) */
(function () {
  var KOK = window.KPA_KOK || 'https://dogusportal.com/';
  var TL_ONAY = 35447;
  var el = null, C = '£', F = 0, K = [], sayac = 0;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return Math.round(+n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function sayi(s) { return +String(s || '').replace(/[^\d]/g, '') || 0; }
  function para(n, c) { return c === 'TL' ? fmt(n) + ' TL' : (c || C) + fmt(n); }
  function varsayilan() {
    return [
      { ad: 'Damga (pul) vergisi', not: '%0,5 · sözleşmede', oran: 0.5 },
      { ad: 'Tapu harcı', not: '%4 tek ödeme (%3 harç + %1 masraf)', oran: 4 },
      { ad: 'KDV', not: '%5 · teslimde', oran: 5 },
      { ad: 'Bakanlar Kurulu onay harcı', not: 'sözleşmeden sonra 1 ay', tutar: TL_ONAY, cur: 'TL' },
      { ad: 'Trafo katılım bedeli', not: 'tutarı yazın', tutar: 0 },
      { ad: 'Avukat ücreti', not: 'tutarı yazın', tutar: 0 }
    ].map(function (k) { k.id = ++sayac; k.acik = k.oran != null || k.cur === 'TL'; k.cur = k.cur || ''; k.elle = false; if (k.oran == null && k.tutar == null) k.tutar = 0; return k; });
  }
  function tutar(k) { return k.oran != null && !k.elle ? F * k.oran / 100 : (+k.tutar || 0); }
  function stil() {
    if (document.getElementById('kpaStil')) return;
    var s = document.createElement('style'); s.id = 'kpaStil';
    s.textContent = '.kpa-r{display:grid;grid-template-columns:auto minmax(0,1fr) 9.5em auto;gap:6px 8px;align-items:center;padding:5px 0;border-bottom:1px dashed rgba(0,0,0,.08)}' +
      '.kpa-r input[type=checkbox]{width:18px;height:18px;margin:0;accent-color:currentColor}' +
      '.kpa-r .kpa-ad{min-width:0;line-height:1.2}.kpa-r .kpa-ad small{display:block;opacity:.65;font-size:.82em}' +
      '.kpa-r .kpa-ad input{width:100%;padding:5px 8px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:transparent;font:inherit;color:inherit}' +
      '.kpa-r .kpa-t{display:flex;align-items:center;gap:4px}.kpa-r .kpa-t input{width:100%;text-align:right;padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;font:inherit;font-weight:600;color:inherit}' +
      '.kpa-r .kpa-t select{padding:5px 2px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#fff;font:inherit;font-size:.85em;color:inherit}' +
      '.kpa-r .kpa-t span{font-size:.85em;opacity:.7;min-width:1.6em}' +
      '.kpa-r .kpa-x{border:0;background:none;color:inherit;opacity:.5;cursor:pointer;font-size:1.05em;padding:2px 4px}.kpa-r .kpa-x:hover{opacity:1}' +
      '.kpa-r.kpa-off .kpa-ad,.kpa-r.kpa-off .kpa-t{opacity:.4}' +
      '.kpa-alt{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-top:8px}' +
      '.kpa-ekle{border:1.5px dashed rgba(0,0,0,.25);background:none;border-radius:999px;padding:6px 12px;font:inherit;font-size:.9em;font-weight:600;color:inherit;cursor:pointer}' +
      '.kpa-top{font-weight:700}.kpa-top b{font-size:1.15em}' +
      '.kpa-pl{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:12px;padding:12px 16px;border:0;border-radius:999px;background:#DC1C2E;color:#fff;font:inherit;font-weight:700;cursor:pointer}' +
      '.kpa-pl svg{width:18px;height:18px}' +
      '.kpa-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(5,10,48,.6);display:flex;align-items:stretch;justify-content:center}' +
      '.kpa-ov iframe{width:100%;max-width:980px;height:100%;border:0;background:#d9d4ca}' +
      '@media (min-width:1000px){.kpa-ov{padding:18px 0}.kpa-ov iframe{border-radius:14px}}';
    document.head.appendChild(s);
  }
  function satir(k) {
    var ad = k.ozel ? '<input data-a="ad" value="' + esc(k.ad) + '" placeholder="Kalem adı (ör. trafo)">' : esc(k.ad) + (k.not ? '<small>' + esc(k.not) + '</small>' : '');
    var cur = k.ozel ? '<select data-a="cur"><option value=""' + (k.cur !== 'TL' ? ' selected' : '') + '>' + esc(C) + '</option><option' + (k.cur === 'TL' ? ' selected' : '') + '>TL</option></select>' : '<span>' + esc(k.cur === 'TL' ? 'TL' : C) + '</span>';
    var t = tutar(k);
    return '<div class="kpa-r' + (k.acik ? '' : ' kpa-off') + '" data-id="' + k.id + '"><input type="checkbox" data-a="acik"' + (k.acik ? ' checked' : '') + ' aria-label="Planda göster">' +
      '<div class="kpa-ad">' + ad + '</div><div class="kpa-t"><input data-a="tutar" inputmode="numeric" value="' + (t ? fmt(t) : '') + '" placeholder="0">' + cur + '</div>' +
      (k.ozel || k.oran == null && !/onay/i.test(k.ad) ? '<button type="button" class="kpa-x" data-a="sil" aria-label="Kaldır">✕</button>' : '<span></span>') + '</div>';
  }
  function toplam() {
    var l = 0, tl = 0; K.forEach(function (k) { if (!k.acik) return; if (k.cur === 'TL') tl += tutar(k); else l += tutar(k); });
    var e = el && el.querySelector('.kpa-top'); if (e) e.innerHTML = 'Toplam: <b>' + para(l) + '</b>' + (tl ? ' + ' + para(tl, 'TL') : '');
  }
  function ciz() {
    if (!el) return;
    el.innerHTML = '<div class="kpa-l">' + K.map(satir).join('') + '</div><div class="kpa-alt"><button type="button" class="kpa-ekle">+ Kalem ekle</button><span class="kpa-top"></span></div>';
    toplam();
  }
  function bul(t) { var r = t.closest('.kpa-r'); if (!r) return null; var id = +r.getAttribute('data-id'); for (var i = 0; i < K.length; i++) if (K[i].id === id) return K[i]; return null; }
  function bagla() {
    el.addEventListener('click', function (e) {
      if (e.target.closest('.kpa-ekle')) { K.push({ id: ++sayac, ad: '', ozel: true, acik: true, tutar: 0, cur: '' }); ciz(); var a = el.querySelectorAll('.kpa-ad input'); if (a.length) a[a.length - 1].focus(); return; }
      var x = e.target.closest('[data-a=sil]'); if (x) { var k = bul(x); K = K.filter(function (y) { return y !== k; }); ciz(); }
    });
    el.addEventListener('change', function (e) {
      var k = bul(e.target); if (!k) return; var a = e.target.getAttribute('data-a');
      if (a === 'acik') { k.acik = e.target.checked; e.target.closest('.kpa-r').classList.toggle('kpa-off', !k.acik); }
      if (a === 'cur') k.cur = e.target.value;
      toplam();
    });
    el.addEventListener('input', function (e) {
      var k = bul(e.target); if (!k) return; var a = e.target.getAttribute('data-a');
      if (a === 'ad') k.ad = e.target.value;
      if (a === 'tutar') {
        var v = sayi(e.target.value); k.tutar = v; k.elle = true;
        if (v && !k.acik) { k.acik = true; var cb = e.target.closest('.kpa-r').querySelector('input[type=checkbox]'); cb.checked = true; e.target.closest('.kpa-r').classList.remove('kpa-off'); }
        var p = e.target.selectionStart, u = e.target.value.length; e.target.value = v ? fmt(v) : ''; try { var n = Math.max(0, p + e.target.value.length - u); e.target.setSelectionRange(n, n); } catch (er) {}
      }
      toplam();
    });
  }
  var KPA = {
    masrafKur: function (kap, cur, anahtar) {
      stil(); C = cur || '£'; if (!K.length || anahtar == null || anahtar !== KPA._a) K = varsayilan(); KPA._a = anahtar; el = kap; if (!el) return;
      if (!el.getAttribute('data-kpa')) { el.setAttribute('data-kpa', '1'); bagla(); }
      ciz();
    },
    fiyat: function (f) {
      F = +f || 0; if (!el) return;
      K.forEach(function (k) {
        if (k.oran == null || k.elle) return;
        var r = el.querySelector('.kpa-r[data-id="' + k.id + '"] [data-a=tutar]');
        if (r && document.activeElement !== r) r.value = F ? fmt(tutar(k)) : '';
      });
      toplam();
    },
    secili: function () {
      return K.filter(function (k) { return k.acik && tutar(k) > 0 && (k.ad || '').trim(); })
        .map(function (k) { return [k.ad.trim(), Math.round(tutar(k)), k.cur === 'TL' ? 'TL' : C, k.oran != null && !k.elle ? k.not : (k.ozel ? '' : (k.oran != null ? 'elle girildi' : k.not === 'tutarı yazın' ? '' : k.not))]; });
    },
    dugme: function () { stil(); return '<button type="button" class="kpa-pl" data-kpa-plan><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>Plan hazırla · PDF, e-posta, WhatsApp</button>'; },
    link: function (d) {
      d.t = d.t || new Date().toISOString(); d.c = d.c || C;
      if (!d.dk) try { d.dk = sessionStorage.getItem('kibrisKim') || ''; } catch (e) {} // sunuma şifreyle giren danışman
      var b = btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return KOK + 'odeme-plani.html#d=' + b;
    },
    planAc: function (d) {
      stil(); KPA.kapat();
      var o = document.createElement('div'); o.className = 'kpa-ov'; o.id = 'kpaOv';
      o.innerHTML = '<iframe allow="web-share; clipboard-write" title="Ödeme planı"></iframe>';
      // dışına tıklayınca kapanmaz: Apps Script çerçevesinde plan içindeki tıklamalar da arka plana düşüyordu; Kapat düğmesi ve Esc kapatır
      document.body.appendChild(o); o.firstChild.src = KPA.link(d);
    },
    kapat: function () { var o = document.getElementById('kpaOv'); if (o) o.remove(); }
  };
  window.addEventListener('message', function (e) { if (e.data && e.data.kpa === 'kapat') KPA.kapat(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('kpaOv')) { e.stopPropagation(); KPA.kapat(); } }, true);
  window.KPA = KPA;
})();
