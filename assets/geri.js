/* Doğuş Portal: uygulamalardan portala / önceki sayfaya dönüş düğmesi.
   Yalnız portaldan açılan sekmede (sessionStorage dpPortal) ve telefonda /
   ana ekrana eklenmiş uygulamada görünür; müşteriye giden linklerde görünmez.
   Sayfada <a href="/"> gibi kendi portal düğmesi varsa eklenmez. */
(function () {
  try {
    var yol = location.pathname;
    if (yol === '/' || /\/index\.html$/.test(yol)) return;
    var bayrak = null;
    try { bayrak = sessionStorage.getItem('dpPortal'); } catch (e) {}
    var tekUygulama = !!navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    if (!bayrak && !tekUygulama) return;

    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer) : ''; } catch (e) {}
    var ayniSite = ref && ref.origin === location.origin;
    var portaldan = ayniSite && (ref.pathname === '/' || /\/index\.html$/.test(ref.pathname));
    var acilis = {};
    try { acilis = JSON.parse(sessionStorage.getItem('dpAcilis') || '{}'); } catch (e) {}
    var yerineAcildi = acilis.yol === yol && acilis.mod === 'replace';

    function portala() { location.href = '/'; }
    function don() {
      if (yerineAcildi) { location.replace('/'); return; }
      if (ayniSite && history.length > 1) {
        var gitti = false;
        window.addEventListener('pagehide', function () { gitti = true; }, { once: true });
        history.back();
        setTimeout(function () { if (!gitti && !document.hidden) portala(); }, 700);
        return;
      }
      portala();
    }
    window.dpGeri = don;

    function kur() {
      var kendi = document.querySelector('a[href="/"],a[href="index.html"],a[href="./"],a[href="https://dogusportal.com"],a[href="https://dogusportal.com/"],[data-portal-geri]');
      if (kendi) return;
      if (document.getElementById('dpGeriBtn')) return;
      var etiket = (ayniSite && !portaldan && !yerineAcildi) ? 'Geri' : 'Portal';
      var st = document.createElement('style');
      st.textContent =
        '#dpGeriBtn{position:fixed;left:calc(10px + env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom));z-index:45;' +
        'display:none;align-items:center;gap:4px;height:38px;padding:0 14px 0 10px;border-radius:19px;border:1px solid rgba(255,255,255,.22);' +
        'background:rgba(17,24,39,.82);color:#fff;font:700 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);cursor:pointer;' +
        '-webkit-tap-highlight-color:transparent;touch-action:manipulation}' +
        '#dpGeriBtn svg{width:18px;height:18px}' +
        '#dpGeriBtn:active{transform:scale(.96)}' +
        '@media (max-width:900px){#dpGeriBtn{display:inline-flex}}' +
        '@media (display-mode:standalone){#dpGeriBtn{display:inline-flex}}' +
        '@media print{#dpGeriBtn{display:none!important}}';
      document.head.appendChild(st);
      var b = document.createElement('button');
      b.id = 'dpGeriBtn';
      b.type = 'button';
      b.setAttribute('aria-label', etiket === 'Portal' ? 'Portala dön' : 'Geri dön');
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span>' + etiket + '</span>';
      if (navigator.standalone) b.style.display = 'inline-flex';
      b.addEventListener('click', function (e) { e.preventDefault(); don(); });
      document.body.appendChild(b);
      /* Altta sabit bir çubuk/düğme varsa (Paylaş, Gönder vb.) onun üstüne çık */
      var taban = 12;
      function sabitUst(x, y) {
        var els = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
        var enUst = null;
        for (var i = 0; i < els.length; i++) {
          var el = els[i], d = 0;
          if (el === b || b.contains(el)) continue;
          while (el && el !== document.body && el !== document.documentElement && d < 12) {
            var cs = getComputedStyle(el);
            if ((cs.position === 'fixed' || cs.position === 'sticky') && cs.visibility !== 'hidden' && cs.display !== 'none') {
              var r = el.getBoundingClientRect();
              if (r.height > 0 && r.height < innerHeight * 0.6 && (enUst === null || r.top < enUst)) enUst = r.top;
              break;
            }
            el = el.parentElement; d++;
          }
        }
        return enUst;
      }
      function ayarla() {
        if (getComputedStyle(b).display === 'none') return;
        var br = b.getBoundingClientRect();
        var y = innerHeight - taban - br.height / 2;
        var ust = null;
        [br.left + 8, br.left + br.width / 2, br.right - 8].forEach(function (x) {
          var t = sabitUst(x, Math.min(innerHeight - 2, y + br.height / 2 - 2));
          var t2 = sabitUst(x, y);
          [t, t2].forEach(function (v) { if (v !== null && (ust === null || v < ust)) ust = v; });
        });
        var yeni = ust === null ? '' : 'calc(' + Math.round(innerHeight - ust + 10) + 'px)';
        if (b.style.bottom !== yeni) b.style.bottom = yeni;
      }
      ayarla();
      setInterval(ayarla, 900);
      addEventListener('resize', ayarla);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur);
    else kur();
  } catch (e) {}
})();
