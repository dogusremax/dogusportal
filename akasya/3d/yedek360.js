/* WebGL'i olmayan cihazlar için yedek 360°: bulutta gerçek 3D modelden çekilmiş karelerle (3 yükseklik × 24/8 açı)
   sürükleyerek her yöne çevirme, tekerlek/iki parmakla yakınlaştırma. Görünüm ve etiketler 3D görüntüleyiciyle aynı.
   Kareler: <kök><plan>/f/f.json + <halka>-<sıra>.webp (araç: kat3d kare çekimi, cap.html) */
var css = '.m3d{position:relative;width:100%;height:100%;overflow:hidden;background:linear-gradient(180deg,#f7f8fc,#e9edf6);border-radius:14px;user-select:none;-webkit-user-select:none}' +
  '.m3d canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}.m3d canvas:active{cursor:grabbing}' +
  '.m3d .lbls{position:absolute;inset:0;pointer-events:none;overflow:hidden}' +
  '.m3d .lb3{position:absolute;left:0;top:0;text-align:center;white-space:nowrap;font-size:.72rem;font-weight:700;color:#050A30;background:rgba(255,255,255,.9);border-radius:8px;padding:3px 8px;line-height:1.25;box-shadow:0 2px 10px rgba(5,10,48,.14);transition:opacity .2s;will-change:transform}' +
  '.m3d .lb3 i{display:block;font-style:normal;font-weight:600;color:#DC1C2E;font-size:.68rem}' +
  '.m3d .ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}' +
  '.m3d .ld>div{background:rgba(255,255,255,.94);border-radius:12px;padding:10px 14px;font-size:.8rem;font-weight:600;color:#050A30;box-shadow:0 4px 18px rgba(5,10,48,.1);text-align:center}' +
  '.m3d .ldt{height:4px;width:180px;background:#e4e7f1;border-radius:4px;margin-top:8px;overflow:hidden}.m3d .ldb{height:100%;width:0;background:#DC1C2E;transition:width .2s}' +
  '.m3d .hint{position:absolute;left:50%;transform:translateX(-50%);bottom:14px;white-space:nowrap;font-size:.75rem;color:#59607d;background:rgba(255,255,255,.88);padding:5px 10px;border-radius:8px;transition:opacity .4s;pointer-events:none}' +
  '.m3d .rst{position:absolute;right:12px;top:12px;font:inherit;font-weight:700;font-size:.78rem;border:none;background:rgba(255,255,255,.94);color:#050A30;padding:7px 11px;border-radius:10px;cursor:pointer;box-shadow:0 4px 14px rgba(5,10,48,.1)}' +
  '@media(max-width:600px){.m3d .lb3{font-size:.62rem;padding:2px 6px;border-radius:6px}.m3d .lb3 i{font-size:.6rem}.m3d .hint{font-size:.7rem}}';
var injected = false;
function fmt(n) { return n.toFixed(2).replace('.', ',') + ' m²'; }
function track(n, p) { try { if (typeof gtag === 'function') gtag('event', n, p || {}); } catch (e) {} }

export function webglVar() {
  try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
}

// opts: { base: kare kökü, ver: function(pid) -> sürüm, font: yazı ailesi }
export function create(host, opts) {
  opts = opts || {};
  if (!injected) { var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); injected = true; }
  host.classList.add('m3d'); if (opts.font) host.style.fontFamily = opts.font;
  var coarse = matchMedia('(pointer:coarse)').matches;
  host.innerHTML = '<canvas></canvas><div class="lbls"></div><div class="ld"><div><span>3D görünüm yükleniyor</span><div class="ldt"><div class="ldb"></div></div></div></div>' +
    '<button type="button" class="rst">Başa dön</button><div class="hint">' + (coarse ? 'Parmağınızla çevirin · iki parmakla yakınlaştırın' : 'Sürükleyerek her yöne çevirin · tekerlekle yakınlaştırın') + '</div>';
  var q = function (s) { return host.querySelector(s); };
  var cv = q('canvas'), g = cv.getContext('2d'), L = q('.lbls');
  // st.a: yatay açı (radyan, 0 = açılış yönü), st.r: halka (yükseklik sırası), st.z: yakınlaştırma
  var st = { pid: null, meta: null, imgs: null, order: null, home: 0, a: 0, r: 0, z: 1, on: false, labels: [], moved: false, raf: 0 };

  function size() {
    var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    draw();
  }
  function cur() {
    var m = st.meta, rg = m.rings[st.order[st.r]], n = rg.n, step = 2 * Math.PI / n;
    var i = Math.round(st.a / step) % n; if (i < 0) i += n;
    return { ri: st.order[st.r], i: i, rg: rg };
  }
  function draw() {
    if (st.raf) return;
    st.raf = requestAnimationFrame(function () { st.raf = 0; paint(); });
  }
  function paint() {
    var m = st.meta, w = host.clientWidth, h = host.clientHeight; if (!m || !w || !h) return;
    var c = cur(), im = st.imgs[c.ri][c.i];
    if (!im || !im.complete || !im.naturalWidth) {
      // kare henüz gelmediyse aynı halkadaki en yakın yüklenmiş kareyi göster
      var n = c.rg.n, best = null;
      for (var k = 1; k <= n / 2 && !best; k++) [c.i + k, c.i - k].forEach(function (j) { var x = st.imgs[c.ri][(j % n + n) % n]; if (!best && x && x.complete && x.naturalWidth) best = x; });
      if (!best) return; im = best;
    }
    // model kare yüksekliğine sığacak biçimde çekildi: ortadaki kareyi (fh × fh) kutuya sığdır
    var sc = Math.min(w, h) / m.h * st.z, dw = m.w * sc, dh = m.h * sc, ox = (w - dw) / 2, oy = (h - dh) / 2;
    if (w > h) { sc = h / m.h * st.z; dw = m.w * sc; dh = m.h * sc; ox = (w - dw) / 2; oy = (h - dh) / 2; }
    var d = cv.width / w;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(im, ox * d, oy * d, dw * d, dh * d);
    // etiketler (duvar arkasında kalanlar çekimde işaretlendi; üst üste binenler gizlenir)
    var P = c.rg.lab[c.i], mob = w < 600, shown = [];
    st.labels.forEach(function (l, k) { var p = P[k]; l.x = ox + p[0] * dw; l.y = oy + p[1] * dh; l.ok = !!p[2] && l.x > 0 && l.x < w && l.y > 0 && l.y < h; });
    st.labels.slice().sort(function (a, b) { return b.m - a.m; }).forEach(function (l) {
      var lw = l.w || (l.w = l.el.offsetWidth), lh = l.h || (l.h = l.el.offsetHeight);
      var hit = !l.ok || (mob && l.m < 5) || shown.some(function (o) { return Math.abs(o.x - l.x) < (o.w + lw) / 2 + 2 && Math.abs(o.y - l.y) < (o.h + lh) / 2 + 2; });
      l.el.style.opacity = hit ? 0 : 1; l.el.style.transform = 'translate(' + (l.x - lw / 2).toFixed(1) + 'px,' + (l.y - lh / 2).toFixed(1) + 'px)';
      if (!hit) shown.push(l);
    });
  }

  // sürükleme: yatayda çevir, dikeyde yükseklik değiştir; iki parmak / tekerlek: yakınlaştır
  var pts = {}, last = null, acc = 0, pinch = 0;
  function moved() { if (!st.moved) { st.moved = true; q('.hint').style.opacity = 0; track('kat_plani3d_model_cevir', { plan: st.pid, yedek: 1 }); } }
  cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); pts[e.pointerId] = { x: e.clientX, y: e.clientY }; last = { x: e.clientX, y: e.clientY }; acc = 0; pinch = 0; });
  cv.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId] || !st.meta) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (ids.length >= 2) {
      var a = pts[ids[0]], b = pts[ids[1]], dd = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) { st.z = Math.max(1, Math.min(2.6, st.z * dd / pinch)); draw(); moved(); }
      pinch = dd; return;
    }
    var dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
    var h = host.clientHeight || 500;
    st.a -= 2 * Math.PI * dx / h * 0.75; // 3D görüntüleyiciyle aynı yön ve hız
    acc += dy;
    var lim = coarse ? 45 : 60;
    if (acc > lim && st.r < st.order.length - 1) { st.r++; acc = 0; }
    else if (acc < -lim && st.r > 0) { st.r--; acc = 0; }
    draw(); if (Math.abs(dx) + Math.abs(dy) > 2) moved();
  });
  function up(e) { delete pts[e.pointerId]; pinch = 0; var ids = Object.keys(pts); if (ids.length) last = pts[ids[0]]; }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') up(e); });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); st.z = Math.max(1, Math.min(2.6, st.z * Math.exp(-e.deltaY * 0.0015))); draw(); moved(); }, { passive: false });
  q('.rst').onclick = function () { st.a = 0; st.r = st.home; st.z = 1; draw(); };
  window.addEventListener('resize', size);
  if (window.ResizeObserver) new ResizeObserver(size).observe(host);

  function load(pid) {
    if (st.pid === pid) return;
    st.pid = pid; st.meta = null; st.moved = false; st.a = 0; st.z = 1; q('.hint').style.opacity = 1;
    L.innerHTML = ''; st.labels = []; q('.ld').style.display = 'flex'; q('.ld span').textContent = '3D görünüm yükleniyor'; q('.ldb').style.width = '0%'; q('.ldt').style.display = '';
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    var dir = opts.base + pid + '/f/', ver = '?v=' + (opts.ver ? opts.ver(pid) : '1');
    fetch(dir + 'f.json' + ver).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (m) {
      if (st.pid !== pid) return;
      // halkaları yükseklik sırasına koy (alçaktan yükseğe), açılış halkası ilk halka
      var order = m.rings.map(function (r, i) { return i; }).sort(function (a, b) { return m.rings[a].el - m.rings[b].el; });
      st.order = order; st.home = order.indexOf(0); st.r = st.home; st.meta = m;
      st.labels = m.rooms.map(function (r) { var d = document.createElement('div'); d.className = 'lb3'; d.innerHTML = r[0] + '<i>' + fmt(r[1]) + '</i>'; L.appendChild(d); return { el: d, m: r[1] }; });
      st.imgs = m.rings.map(function (r) { return new Array(r.n); });
      // önce açılış halkası, sonra diğerleri
      var q0 = [], done = 0, first = m.rings[0].n;
      [0].concat(order.filter(function (x) { return x !== 0; })).forEach(function (ri) { for (var i = 0; i < m.rings[ri].n; i++) q0.push([ri, i]); });
      var par = 6, k = 0;
      function next() {
        if (st.pid !== pid || k >= q0.length) return;
        var t = q0[k++], im = new Image(); im.decoding = 'async';
        im.onload = im.onerror = function () {
          done++; if (done <= first) q('.ldb').style.width = (done / first * 100) + '%';
          if (done === Math.min(first, 6)) q('.ld').style.display = 'none';
          if (done === 1) { size(); window.__m3dReady = pid; }
          draw(); next();
        };
        im.src = dir + t[0] + '-' + t[1] + '.webp' + ver; st.imgs[t[0]][t[1]] = im;
      }
      for (var p = 0; p < par; p++) next();
    }).catch(function () {
      if (st.pid !== pid) return;
      q('.ld span').textContent = 'Bu plan için 3D görünüm bu cihazda açılamıyor'; q('.ldt').style.display = 'none';
    });
  }
  return {
    yedek: true,
    show: function (pid) { host.style.display = 'block'; st.on = true; size(); load(pid); track('kat_plani3d_mod', { plan: pid, mod: 'model', yedek: 1 }); },
    hide: function () { st.on = false; host.style.display = 'none'; }
  };
}
