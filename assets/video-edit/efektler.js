/* Video Düzenle · Hazır efektler
   Reels referansındaki 18 efekt. Her biri bir "efekt" öğesidir: { tur: 'efekt', alt, x, y, boyut, bas, bit, metin, metin2, metin3, kelime, renk, srcs }.
   İki çeşit var:
   - katman efektleri (yazı, kart, panel): ogeCiz içinden çizilir, kişinin arkasına alınabilir.
   - sahne efektleri (renk, film, başlık kartı, akış): bütün kare çizildikten sonra kareyi değiştirir.
   Bütün hareketler yalnızca zamana bağlıdır (rastgelelik yok), bu yüzden önizleme, indirme ve bulut çıktısı aynı görünür.
   video-duzenle.html içindeki yardımcıları kullanır: kis, easeOut, easeInOut, easeBack, yuvarlak, resimAl, grenAl. */

var EF_KALIN = '"Inter Tight", "Plus Jakarta Sans", system-ui, sans-serif';
var EF_SERIF = '"Playfair Display", Georgia, serif';
var EF_SARI = '#FFE14D';

/* ---------- küçük yardımcılar ---------- */
function efHash(n){ var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function efBuyuk(s){ return String(s || '').toLocaleUpperCase('tr-TR'); }
function efSatirlar(s){ return String(s || '').split('\n').map(function(x){ return x.trim(); }).filter(Boolean); }
function efZiplama(x){
  var n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + .75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + .9375;
  return n1 * (x -= 2.625 / d1) * x + .984375;
}
/* öğenin son 0,25 saniyesinde yumuşak kaybolma */
function efCikis(L, D, s){ s = s || .25; return kis((D - L) / s, 0, 1); }
function efGiris(L, a, s){ return kis((L - (a || 0)) / (s || .3), 0, 1); }
function efFont(w, px, aile, ital){ return (ital ? 'italic ' : '') + w + ' ' + Math.max(1, px).toFixed(1) + 'px ' + aile; }
function efGolge(c, u, a){ c.shadowColor = 'rgba(0,0,0,' + (a == null ? .35 : a) + ')'; c.shadowBlur = u * 2.2; c.shadowOffsetY = u * .5; }
function efGolgesiz(c){ c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0; }
function efZamanKodu(t, kare){
  kare = kare || 30; t = Math.max(0, t);
  var s = Math.floor(t), fr = Math.floor((t - s) * kare), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  function d(n){ return (n < 10 ? '0' : '') + n; }
  return d(h) + ':' + d(m) + ':' + d(s % 60) + ':' + d(fr);
}
/* kaynağı (video karesi ya da resim) kutuya "cover" biçiminde çizer */
function efKapla(c, k, x, y, w, h, odak){
  if (!k) return;
  var kw = k.naturalWidth || k.videoWidth || k.width, kh = k.naturalHeight || k.videoHeight || k.height; if (!kw || !kh) return;
  var o = Math.max(w / kw, h / kh), sw = w / o, sh = h / o, sx = (kw - sw) / 2, sy = (kh - sh) * (odak == null ? .5 : odak);
  c.drawImage(k, sx, sy, sw, sh, x, y, w, h);
}
function efResim(o, i, kaynak){
  var s = o.srcs && o.srcs.length ? o.srcs[i % o.srcs.length] : null;
  return s ? resimAl(s) : kaynak;
}
function efUygulamaRengi(i){ return [['#1A1A1A', '#3A3A3A'], ['#FF4F8B', '#6E3BFF'], ['#FF3D57', '#FF8A3D'], ['#0B1F4A', '#2D6BFF'], ['#00A86B', '#00D1A0'], ['#7A1FFF', '#C04BFF']][i % 6]; }
/* kare ikon: resim varsa resim, yoksa renkli zemin + baş harf */
function efIkon(c, o, i, x, y, r, ad){
  var s = o.srcs && o.srcs[i] ? resimAl(o.srcs[i]) : null, k = r * .45;
  c.save(); yuvarlak(c, x - r, y - r, r * 2, r * 2, k);
  if (s) { c.clip(); efKapla(c, s, x - r, y - r, r * 2, r * 2); }
  else {
    var rk = efUygulamaRengi(i), g = c.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, rk[0]); g.addColorStop(1, rk[1]);
    c.fillStyle = g; c.fill(); c.clip();
    c.fillStyle = '#fff'; c.font = efFont(900, r * 1.05, EF_KALIN); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(efBuyuk((ad || '?').charAt(0)), x, y + r * .04);
  }
  c.restore();
  c.save(); yuvarlak(c, x - r, y - r, r * 2, r * 2, k); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = Math.max(1, r * .04); c.stroke(); c.restore();
}
function efEtiket(c, metin, x, y, px, renk, zemin, w){
  c.save(); c.font = efFont(800, px, EF_KALIN); c.textAlign = 'center'; c.textBaseline = 'middle';
  var tw = c.measureText(metin).width, pw = tw + px * 1.4, ph = px * 1.9;
  if (zemin) { yuvarlak(c, x - pw / 2, y - ph / 2, pw, ph, ph / 2); c.fillStyle = zemin; c.fill(); }
  c.fillStyle = renk; c.fillText(metin, x, y + px * .04); c.restore();
  return pw;
}
/* tek satır yazıyı harflere bölüp her harfin x merkezini verir */
function efHarfler(c, s, ls){
  var r = [], x = 0; ls = ls || 0;
  for (var i = 0; i < s.length; i++) { var w = c.measureText(s[i]).width; r.push({ h: s[i], x: x + w / 2, w: w }); x += w + ls; }
  return { harf: r, gen: x - ls };
}
function efSnapshot(ctx, W, H){
  var t = efSnapshot.t || (efSnapshot.t = document.createElement('canvas'));
  if (t.width !== W || t.height !== H) { t.width = W; t.height = H; }
  var x = t.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.drawImage(ctx.canvas, 0, 0);
  return t;
}
var efPaletler = {};
function efPaletCikar(kaynak, id){
  if (efPaletler[id]) return efPaletler[id];
  var c = document.createElement('canvas'), w = 36, h = 64; c.width = w; c.height = h;
  var x = c.getContext('2d'); x.drawImage(kaynak, 0, 0, w, h);
  var d; try { d = x.getImageData(0, 0, w, h).data; } catch(e) { return null; }
  var kova = {};
  for (var i = 0; i < d.length; i += 4) {
    var r = d[i] >> 5, g = d[i + 1] >> 5, b = d[i + 2] >> 5, k = r + ',' + g + ',' + b;
    var v = kova[k] || (kova[k] = { n: 0, r: 0, g: 0, b: 0 }); v.n++; v.r += d[i]; v.g += d[i + 1]; v.b += d[i + 2];
  }
  var l = Object.keys(kova).map(function(k){ var v = kova[k]; return { n: v.n, r: v.r / v.n, g: v.g / v.n, b: v.b / v.n }; }).sort(function(a, b){ return b.n - a.n; });
  var sec = [];
  for (var j = 0; j < l.length && sec.length < 5; j++) {
    var a = l[j], uzak = sec.every(function(s){ return Math.abs(s.r - a.r) + Math.abs(s.g - a.g) + Math.abs(s.b - a.b) > 70; });
    if (uzak) sec.push(a);
  }
  sec.sort(function(a, b){ return (b.r * .3 + b.g * .59 + b.b * .11) - (a.r * .3 + a.g * .59 + a.b * .11); });
  var p = sec.map(function(s){ return '#' + [s.r, s.g, s.b].map(function(v){ var h2 = Math.round(v).toString(16).toUpperCase(); return h2.length < 2 ? '0' + h2 : h2; }).join(''); });
  efPaletler[id] = p; return p;
}
function efNoktaRengi(kaynak, x, y){
  var c = efNoktaRengi.c || (efNoktaRengi.c = document.createElement('canvas')); c.width = c.height = 1;
  var k = c.getContext('2d'), kw = kaynak.width || kaynak.videoWidth, kh = kaynak.height || kaynak.videoHeight;
  try { k.drawImage(kaynak, Math.max(0, x * kw - 4), Math.max(0, y * kh - 4), 8, 8, 0, 0, 1, 1); var d = k.getImageData(0, 0, 1, 1).data; return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; }
  catch(e) { return '#D9A08F'; }
}

/* ---------- 01 Gravity drop: harfler yukarıdan düşüp zıplayarak oturur ---------- */
function efGravity(c, o, W, H, L, D, u){
  var kelime = efBuyuk(o.metin || 'DROP'), fs = 24 * u, cx = o.x * W, cy = o.y * H, a = efCikis(L, D);
  c.save(); c.globalAlpha = a; c.font = efFont(900, fs, EF_KALIN); c.textBaseline = 'alphabetic';
  var h = efHarfler(c, kelime, -fs * .03), x0 = cx - h.gen / 2;
  h.harf.forEach(function(hr, i){
    var q = kis((L - i * .07) / .62, 0, 1); if (q <= 0) return;
    var dy = (1 - efZiplama(q)) * -(cy + fs), rot = (1 - easeOut(kis(q * 1.4, 0, 1))) * (efHash(i + o.id) - .5) * 1.2;
    c.save(); c.translate(x0 + hr.x, cy + dy); c.rotate(rot);
    var g = c.createLinearGradient(0, -fs * .8, 0, 0); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#E4E7EE');
    efGolge(c, u, .3); c.fillStyle = g; c.textAlign = 'center'; c.fillText(hr.h, 0, 0); c.restore();
  });
  if (o.metin2) {
    var qa = efGiris(L, .25, .35);
    c.globalAlpha = a * qa; efGolge(c, u, .35); c.font = efFont(600, fs * .3, EF_SERIF, true); c.fillStyle = '#F2E6CF'; c.textAlign = 'left';
    c.fillText(o.metin2, x0 + fs * .05, cy - fs * .92 - (1 - easeOut(qa)) * fs * .2);
  }
  c.restore();
  return { x: o.x, y: o.y - fs * .35 / H, w: (h.gen + fs * .2) / W, h: fs * 1.25 / H };
}

/* ---------- 02 Icon strike: ikonlar gelir, kırmızı çizgiyle üstü çizilir, düşer ---------- */
function efStrike(c, o, W, H, L, D, u){
  var adlar = efSatirlar(o.metin); if (!adlar.length) adlar = ['Uygulama'];
  var r = 7.5 * u, ara = r * 2.9, cx = o.x * W, y0 = o.y * H - (adlar.length - 1) * ara / 2;
  adlar.forEach(function(ad, i){
    var gq = efGiris(L, i * .12, .35); if (gq <= 0) return;
    var dus = kis((L - (D - .55) - i * .06) / .5, 0, 1), y = y0 + i * ara + dus * dus * H * .6;
    c.save(); c.globalAlpha = kis(gq * 2, 0, 1) * (1 - dus);
    c.translate(cx, y); c.rotate(dus * (i % 2 ? .6 : -.5)); var sc = .3 + .7 * easeBack(gq); c.scale(sc, sc);
    efGolge(c, u, .35); efIkon(c, o, i, 0, 0, r, ad); efGolgesiz(c);
    c.font = efFont(700, r * .34, EF_KALIN); c.textAlign = 'center'; c.fillStyle = '#fff'; efGolge(c, u * .5, .6); c.fillText(ad, 0, r * 1.45); efGolgesiz(c);
    var sq = kis((L - .55 - i * .18) / .22, 0, 1);
    if (sq > 0) {
      var x1 = r * 1.15, y1 = -r * 1.15, x2 = x1 + (-r * 2.3) * easeOut(sq), y2 = y1 + (r * 2.3) * easeOut(sq);
      c.lineCap = 'round'; c.strokeStyle = '#fff'; c.lineWidth = r * .32; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = '#FF2D55'; c.lineWidth = r * .2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    }
    c.restore();
  });
  return { x: o.x, y: o.y, w: r * 2.6 / W, h: (adlar.length * ara) / H };
}

/* ---------- 03 Kinetic hook: iki satır, harf harf çarparak yazılır ---------- */
function efKinetic(c, o, W, H, L, D, u){
  var s1 = efBuyuk(o.metin || 'KINETIC'), s2 = efBuyuk(o.metin2 || 'HOOK'), fs1 = 15 * u, fs2 = 21 * u, a = efCikis(L, D);
  var cx = o.x * W, cy = o.y * H, en = 0;
  c.save(); c.globalAlpha = a; c.textBaseline = 'alphabetic'; c.textAlign = 'center';
  [[s1, fs1, '#FFFFFF', 0, cy], [s2, fs2, o.renk || EF_SARI, s1.length * .045 + .12, cy + fs2 * .92]].forEach(function(st){
    c.font = efFont(900, st[1], EF_KALIN);
    var h = efHarfler(c, st[0], -st[1] * .04), x0 = cx - h.gen / 2; en = Math.max(en, h.gen);
    h.harf.forEach(function(hr, i){
      var q = kis((L - st[3] - i * .045) / .16, 0, 1); if (q <= 0) return;
      var sc = 1 + (1 - easeOut(q)) * .9;
      c.save(); c.translate(x0 + hr.x, st[4]); c.scale(sc, sc); c.globalAlpha = a * kis(q * 2.5, 0, 1);
      efGolge(c, u, .28); c.fillStyle = st[2]; c.fillText(hr.h, 0, 0); c.restore();
    });
  });
  c.restore();
  return { x: o.x, y: o.y + fs2 * .05 / H, w: (en + fs1 * .3) / W, h: (fs1 + fs2 * 1.1) / H };
}

/* ---------- 04 Grade slider (sahne): önce/sonra çizgisi soldan sağa geçer ---------- */
function efGrade(c, o, W, H, L, D, u, kaynak, duz){
  var q = easeInOut(kis((L - .25) / Math.max(.3, D - .7), 0, 1)), x = q * W, hy = o.y * H, a = efCikis(L, D);
  /* sağ taraf "önce": soluk siyah-beyaz */
  c.save(); c.beginPath(); c.rect(x, 0, W - x, H); c.clip();
  c.globalAlpha = a; c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(128,128,128,.12)'; c.fillRect(0, 0, W, H);
  c.restore();
  if (q <= 0 || q >= 1) { if (q <= 0) { c.save(); c.globalAlpha = a; efEtiket(c, efBuyuk(o.metin2 || 'Önce'), W * .1, hy, u * 2.2, '#fff', 'rgba(0,0,0,.6)'); c.restore(); } return { x: q, y: o.y, w: .12, h: .07 }; }
  c.save(); c.globalAlpha = a;
  c.fillStyle = o.renk || EF_SARI; c.fillRect(x - u * .35, 0, u * .7, H);
  c.beginPath(); c.arc(x, hy, u * 3.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#111'; c.lineWidth = u * .55; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - u * .6, hy - u * 1.1); c.lineTo(x - u * 1.5, hy); c.lineTo(x - u * .6, hy + u * 1.1); c.stroke();
  c.beginPath(); c.moveTo(x + u * .6, hy - u * 1.1); c.lineTo(x + u * 1.5, hy); c.lineTo(x + u * .6, hy + u * 1.1); c.stroke();
  efEtiket(c, efBuyuk(o.metin || 'Sonra'), x - u * 9, hy, u * 2.2, '#fff', 'rgba(0,0,0,.6)');
  efEtiket(c, efBuyuk(o.metin2 || 'Önce'), x + u * 9, hy, u * 2.2, '#fff', 'rgba(0,0,0,.6)');
  c.restore();
  return { x: x / W, y: o.y, w: .12, h: .07 };
}

/* ---------- 05 Prompt bar: yapay zeka kutusuna yazı yazılır ---------- */
function efYildiz(c, x, y, r, renk){
  c.save(); c.translate(x, y); c.strokeStyle = renk; c.lineWidth = r * .32; c.lineCap = 'round';
  for (var i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); c.rotate(Math.PI / 4); }
  c.restore();
}
function efPrompt(c, o, W, H, L, D, u){
  var s = o.metin || 'prompt bar', w = 74 * u, h = 10 * u, cx = o.x * W, cy = o.y * H;
  var g = efGiris(L, 0, .35), a = efCikis(L, D) * kis(g * 2, 0, 1);
  var n = Math.min(s.length, Math.floor(Math.max(0, L - .3) / .055)), yazi = s.slice(0, n), bitti = n >= s.length;
  c.save(); c.globalAlpha = a; c.translate(cx, cy - (1 - easeOut(g)) * h * .8); var sc = .92 + .08 * easeOut(g); c.scale(sc, sc);
  efGolge(c, u, .28); yuvarlak(c, -w / 2, -h / 2, w, h, h * .32); c.fillStyle = '#FFFFFF'; c.fill(); efGolgesiz(c);
  efYildiz(c, -w / 2 + h * .48, 0, h * .2, '#D97757');
  c.font = efFont(500, h * .36, EF_KALIN); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#1B1B1F';
  var tx = -w / 2 + h * .9; c.fillText(yazi, tx, h * .02);
  if (!bitti || Math.floor(L / .45) % 2 === 0) { var cw = c.measureText(yazi).width; c.fillRect(tx + cw + u * .3, -h * .2, u * .35, h * .4); }
  var bq = bitti ? kis((L - .3 - s.length * .055) / .3, 0, 1) : 0, br = h * .3 * (1 + Math.sin(bq * Math.PI) * .18);
  c.fillStyle = o.renk || EF_SARI; c.beginPath(); c.arc(w / 2 - h * .5, 0, br, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#111'; c.lineWidth = h * .07; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(w / 2 - h * .5, h * .14); c.lineTo(w / 2 - h * .5, -h * .14); c.moveTo(w / 2 - h * .62, -h * .03); c.lineTo(w / 2 - h * .5, -h * .15); c.lineTo(w / 2 - h * .38, -h * .03); c.stroke();
  c.restore();
  return { x: o.x, y: o.y, w: w / W, h: h / H };
}

/* ---------- 06 Playing grid: oynayan küçük kartlar yelpaze gibi açılır ---------- */
var EF_GRID = [[-11, -9, -9], [5, -11, 6], [17, -6, 12], [-9, 10, -5], [7, 9, 4], [19, 11, 9]];
function efKart(c, k, x, y, w, h, aci, sc, alfa, u, ust){
  c.save(); c.globalAlpha = alfa; c.translate(x, y); c.rotate(aci * Math.PI / 180); c.scale(sc, sc);
  efGolge(c, u, .4); yuvarlak(c, -w / 2 - u * .45, -h / 2 - u * .45, w + u * .9, h + u * .9, u * 1.6); c.fillStyle = '#fff'; c.fill(); efGolgesiz(c);
  c.save(); yuvarlak(c, -w / 2, -h / 2, w, h, u * 1.2); c.clip(); c.fillStyle = '#222'; c.fillRect(-w / 2, -h / 2, w, h); efKapla(c, k, -w / 2, -h / 2, w, h, .35); c.restore();
  if (ust) ust(c);
  c.restore();
}
function efGrid(c, o, W, H, L, D, u, kaynak){
  var n = Math.max(3, Math.min(6, (o.srcs || []).length || 4)), w = 17 * u, h = w * 16 / 9, cx = o.x * W, cy = o.y * H, a = efCikis(L, D);
  for (var i = 0; i < n; i++) {
    var p = EF_GRID[i], q = efGiris(L, i * .09, .4); if (q <= 0) continue;
    var e = easeBack(q), yuz = Math.sin((L + i) * 2.1) * u * .4;
    efKart(c, efResim(o, i, kaynak), cx + p[0] * u * e, cy + p[1] * u * 1.5 * e + yuz, w, h, p[2] * e, .5 + .5 * e, a * kis(q * 2, 0, 1), u);
  }
  return { x: o.x + 4 * u / W, y: o.y, w: (44 * u) / W, h: (h + 30 * u) / H };
}

/* ---------- 07 Giant captions: dev kelime + altında italik serif ---------- */
function efGiant(c, o, W, H, L, D, u){
  var s = efBuyuk(o.metin || 'GIANT'), fs = 26 * u, cx = o.x * W, cy = o.y * H, a = efCikis(L, D);
  c.save(); c.globalAlpha = a; c.font = efFont(900, fs, EF_KALIN); c.textBaseline = 'alphabetic'; c.textAlign = 'center';
  var h = efHarfler(c, s, -fs * .05), x0 = cx - h.gen / 2;
  h.harf.forEach(function(hr, i){
    var q = kis((L - i * .05) / .35, 0, 1); if (q <= 0) return;
    c.save(); c.beginPath(); c.rect(x0 + hr.x - hr.w, cy - fs * 1.05, hr.w * 2, fs * 1.25); c.clip();
    var g = c.createLinearGradient(0, cy - fs * .78, 0, cy + fs * .05); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.55, 'rgba(255,255,255,.96)'); g.addColorStop(1, 'rgba(255,255,255,.18)');
    c.fillStyle = g; c.fillText(hr.h, x0 + hr.x, cy + (1 - easeOut(q)) * fs); c.restore();
  });
  if (o.metin2) {
    var q2 = efGiris(L, .35, .4);
    c.globalAlpha = a * q2; c.font = efFont(600, fs * .42, EF_SERIF, true); c.fillStyle = o.renk || '#F3D34A'; efGolge(c, u, .4);
    c.fillText(o.metin2, cx, cy + fs * .55 + (1 - easeOut(q2)) * fs * .2);
  }
  c.restore();
  return { x: o.x, y: o.y - fs * .2 / H, w: (h.gen + fs * .3) / W, h: fs * 1.6 / H };
}

/* ---------- 08 File drop: dosya kutuya düşer, videoya dönüşür ---------- */
function efFileDrop(c, o, W, H, L, D, u, kaynak){
  var w = 32 * u, h = 28 * u, cx = o.x * W, cy = o.y * H, a = efCikis(L, D) * kis(L / .2, 0, 1);
  var don = easeInOut(kis((L - 1) / .45, 0, 1));
  c.save(); c.globalAlpha = a; c.translate(cx, cy);
  if (don < 1) {
    c.save(); c.globalAlpha = a * (1 - don); c.rotate(-.06);
    efGolge(c, u, .35); yuvarlak(c, -w / 2, -h / 2, w, h, u * 2.2); c.fillStyle = 'rgba(16,16,18,.92)'; c.fill(); efGolgesiz(c);
    c.setLineDash([u * 1.4, u * 1]); c.lineDashOffset = -L * u * 6; c.strokeStyle = o.renk || EF_SARI; c.lineWidth = u * .45;
    yuvarlak(c, -w / 2 + u, -h / 2 + u, w - u * 2, h - u * 2, u * 1.6); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#fff'; c.font = efFont(800, u * 2.5, EF_KALIN); c.textAlign = 'center'; c.textBaseline = 'middle';
    var sat = efSatirlar(o.metin || 'Ham görüntüyü\nburaya bırak'); sat.forEach(function(s, i){ c.fillText(s, 0, h * .18 + (i - (sat.length - 1) / 2) * u * 3.2); });
    /* dosya rozeti */
    var fq = kis((L - .15) / .55, 0, 1), fx = (1 - easeOut(fq)) * w * .9 + w * .1, fy = -h * .2 - (1 - efZiplama(fq)) * h * .9;
    if (fq > 0) {
      c.save(); c.translate(fx, fy); c.rotate((1 - fq) * .3);
      efGolge(c, u, .35); yuvarlak(c, -u * 9, -u * 3.2, u * 18, u * 6.4, u * 1.2); c.fillStyle = '#fff'; c.fill(); efGolgesiz(c);
      yuvarlak(c, -u * 8, -u * 2.2, u * 3.4, u * 4.4, u * .6); c.fillStyle = '#3B82F6'; c.fill();
      c.textAlign = 'left'; c.fillStyle = '#111'; c.font = efFont(800, u * 1.9, EF_KALIN); c.fillText(o.metin2 || '1101.mp4', -u * 3.8, -u * .8);
      c.fillStyle = '#777'; c.font = efFont(600, u * 1.4, EF_KALIN); c.fillText(o.metin3 || '53 MB · 0:29', -u * 3.8, u * 1.3);
      c.restore();
    }
    c.restore();
  }
  if (don > 0) {
    var tw = w * .62, th = tw * 16 / 9 * .82;
    c.save(); c.globalAlpha = a * don; var sc = .8 + .2 * easeBack(don); c.scale(sc, sc);
    efGolge(c, u, .4); yuvarlak(c, -tw / 2 - u * .5, -th / 2 - u * .5, tw + u, th + u, u * 1.8); c.fillStyle = '#fff'; c.fill(); efGolgesiz(c);
    c.save(); yuvarlak(c, -tw / 2, -th / 2, tw, th, u * 1.4); c.clip(); efKapla(c, efResim(o, 0, kaynak), -tw / 2, -th / 2, tw, th, .3); c.restore();
    efEtiket(c, o.kelime || '0:29 ham görüntü', 0, th / 2 + u * 1.5, u * 1.9, '#111', o.renk || EF_SARI);
    c.restore();
  }
  c.restore();
  return { x: o.x, y: o.y, w: w / W, h: h / H };
}

/* ---------- 09 NLE timeline: kurgu programı zaman şeridi ---------- */
function efTimeline(c, o, W, H, L, D, u, kaynak, t){
  var w = Math.min(W * .94, 92 * u), h = 25 * u, cx = o.x * W, cy = o.y * H;
  var g = efGiris(L, 0, .35), a = efCikis(L, D) * g, p = kis((L - .2) / Math.max(.5, D - .4), 0, 1);
  c.save(); c.globalAlpha = a; c.translate(cx, cy + (1 - easeOut(g)) * h * .5);
  var x0 = -w / 2, y0 = -h / 2;
  efGolge(c, u, .45); yuvarlak(c, x0, y0, w, h, u * 2); c.fillStyle = 'rgba(18,18,22,.93)'; c.fill(); efGolgesiz(c);
  c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = u * .15; c.stroke();
  c.textBaseline = 'middle'; c.font = efFont(800, u * 1.7, EF_KALIN); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(o.metin || 'Timeline', x0 + u * 2, y0 + u * 2.6);
  c.textAlign = 'right'; c.fillStyle = o.renk || EF_SARI; c.font = efFont(700, u * 1.7, 'ui-monospace, Menlo, monospace'); c.fillText(efZamanKodu(t), x0 + w - u * 2, y0 + u * 2.6);
  var iz = x0 + u * 5, iw = w - u * 7, ty = [y0 + u * 5.2, y0 + u * 11, y0 + u * 16.6], th = u * 4.4;
  c.font = efFont(700, u * 1.3, EF_KALIN); c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,.45)';
  ['V2', 'V1', 'A1'].forEach(function(ad, i){ c.fillText(ad, x0 + u * 1.6, ty[i] + th / 2); });
  /* V2 renkli klipler */
  [[0, .22, '#F5D547'], [.25, .43, '#F2C38B'], [.46, .74, '#E8436B'], [.77, .92, '#38BDF8']].forEach(function(k){
    yuvarlak(c, iz + k[0] * iw, ty[0], (k[1] - k[0]) * iw, th, u * .8); c.fillStyle = k[2]; c.fill();
  });
  /* V1 film şeridi: canlı kare */
  c.save(); yuvarlak(c, iz, ty[1], iw, th, u * .8); c.clip(); c.fillStyle = '#2a2a30'; c.fillRect(iz, ty[1], iw, th);
  var kw = th * .62, n = Math.ceil(iw / kw);
  if (kaynak) for (var i = 0; i < n; i++) efKapla(c, kaynak, iz + i * kw, ty[1], kw - u * .15, th, .3);
  c.restore();
  /* A1 dalga */
  c.fillStyle = o.renk || EF_SARI; var bn = 90, bw = iw / bn;
  for (var j = 0; j < bn; j++) { var hh = (.15 + .85 * Math.abs(Math.sin(j * .7) * efHash(j))) * th * .9; c.fillRect(iz + j * bw + bw * .2, ty[2] + (th - hh) / 2, bw * .6, hh); }
  /* oynatma çizgisi */
  var px = iz + p * iw; c.fillStyle = '#fff'; c.fillRect(px - u * .2, ty[0] - u * 1.2, u * .4, ty[2] + th - ty[0] + u * 1.4);
  c.beginPath(); c.moveTo(px - u * .9, ty[0] - u * 1.6); c.lineTo(px + u * .9, ty[0] - u * 1.6); c.lineTo(px, ty[0] - u * .5); c.fill();
  c.restore();
  return { x: o.x, y: o.y, w: w / W, h: h / H };
}

/* ---------- 10 Film look (sahne): sinema bantları, sıcak renk, gren, REC ---------- */
function efFilm(c, o, W, H, L, D, u, kaynak, duz, t){
  var q = easeInOut(kis(L / .35, 0, 1)) * efCikis(L, D, .35), bant = H * .075 * q;
  c.save();
  c.globalAlpha = .38 * q; c.globalCompositeOperation = 'soft-light'; c.fillStyle = o.renk || '#FF9A3C'; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = q;
  var v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .6); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  var lk = c.createRadialGradient(W * 1.05, H * .75, 0, W * 1.05, H * .75, W * .7); lk.addColorStop(0, 'rgba(255,120,40,.55)'); lk.addColorStop(1, 'rgba(255,120,40,0)');
  c.globalCompositeOperation = 'screen'; c.globalAlpha = q * (.75 + .25 * Math.sin(L * 3)); c.fillStyle = lk; c.fillRect(0, 0, W, H);
  if (typeof grenAl === 'function') { var gr = grenAl(), ox = efHash(Math.floor(t * 24)) * 200, oy = efHash(Math.floor(t * 24) + 9) * 200; c.globalCompositeOperation = 'overlay'; c.globalAlpha = q * .14; c.fillStyle = c.createPattern(gr, 'repeat'); c.translate(-ox, -oy); c.fillRect(ox, oy, W, H); c.setTransform(1, 0, 0, 1, 0, 0); }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.fillStyle = '#000'; c.fillRect(0, 0, W, bant); c.fillRect(0, H - bant, W, bant);
  if (q > .5) {
    c.globalAlpha = kis((q - .5) * 2, 0, 1);
    c.textBaseline = 'middle';
    if (Math.floor(L / .5) % 2 === 0) { c.fillStyle = '#FF3B4E'; c.beginPath(); c.arc(u * 5, bant / 2, u * .9, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff'; c.font = efFont(700, u * 2.2, 'ui-monospace, Menlo, monospace'); c.textAlign = 'left'; c.fillText(efZamanKodu(t, 24), u * 7, bant / 2);
    c.font = efFont(700, u * 1.9, EF_KALIN); c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText(o.metin || '35MM · 24 FPS', W / 2, H - bant / 2);
  }
  c.restore();
  return null;
}

/* ---------- 11 Storyboard deck: kartlar desteden sıraya dağıtılır ---------- */
function efDeck(c, o, W, H, L, D, u, kaynak){
  var n = Math.max(3, Math.min(8, (o.srcs || []).length || 6)), w = 13 * u, h = w * 1.32, cx = o.x * W, cy = o.y * H, a = efCikis(L, D);
  var aralik = Math.min(w * .98, (W * .92 - w) / Math.max(1, n - 1)), sx = cx - aralik * (n - 1) / 2, x0 = cx - W * .32;
  for (var i = n - 1; i >= 0; i--) {
    var q = easeInOut(kis((L - .15 - i * .1) / .4, 0, 1)), g = efGiris(L, 0, .25);
    var fx = sx + i * aralik, fy = cy + Math.pow((i - (n - 1) / 2) / Math.max(1, n / 2), 2) * u * 2.5, fa = (i - (n - 1) / 2) * 3;
    var x = x0 + (fx - x0) * q - (1 - q) * i * u * .3, y = cy + u * 3 + (fy - cy - u * 3) * q - (1 - q) * i * u * .5, aci = (1 - q) * (-8 + i * 2.5) + q * fa;
    var no = (i + 1 < 10 ? '0' : '') + (i + 1);
    efKart(c, efResim(o, i, kaynak), x, y, w, h * .78, aci, 1, a * g, u, function(cc){
      cc.fillStyle = '#fff'; cc.fillRect(-w / 2 - u * .45, h * .39 - u * .5, w + u * .9, h * .2);
      cc.fillStyle = '#111'; cc.font = efFont(800, u * 1.5, EF_KALIN); cc.textAlign = 'left'; cc.textBaseline = 'middle'; cc.fillText(no, -w / 2 + u * .5, h * .39 + u * 1.2);
    });
  }
  return { x: o.x, y: o.y, w: Math.min(.95, (aralik * (n - 1) + w * 1.3) / W), h: h * 1.2 / H };
}

/* ---------- 12 Jiggle delete: düzenleme modundaki ikonlar titrer, tek tek silinir ---------- */
function efJiggle(c, o, W, H, L, D, u){
  var adlar = efSatirlar(o.metin); if (!adlar.length) adlar = ['Uygulama'];
  var n = adlar.length, r = 5.8 * u, ara = r * 2.9, pw = Math.max(46 * u, n * ara + u * 6), ph = r * 2 + u * 11, cx = o.x * W, cy = o.y * H;
  var silBas = .7, adim = Math.max(.22, (D - silBas - .6) / n);
  var silinen = kis(Math.floor((L - silBas) / adim) + 1, 0, n), son = kis((L - silBas - n * adim) / .4, 0, 1);
  var g = efGiris(L, 0, .3), a = efCikis(L, D) * kis(g * 2, 0, 1) * (1 - son * .85);
  c.save(); c.globalAlpha = a; c.translate(cx, cy); var sc = .9 + .1 * easeOut(g); c.scale(sc, sc);
  efGolge(c, u, .3); yuvarlak(c, -pw / 2, -ph / 2, pw, ph, u * 2.6); c.fillStyle = 'rgba(255,255,255,' + (.96 - son * .4) + ')'; c.fill(); efGolgesiz(c);
  c.textBaseline = 'middle'; c.font = efFont(800, u * 1.35, EF_KALIN); c.textAlign = 'left'; c.fillStyle = '#8A8F98'; c.fillText(efBuyuk(o.metin2 || 'Edit mode'), -pw / 2 + u * 2.2, -ph / 2 + u * 2.4);
  c.textAlign = 'right'; c.fillStyle = '#111'; c.fillText((n - silinen) + ' ' + (o.metin3 || 'uygulama'), pw / 2 - u * 2.2, -ph / 2 + u * 2.4);
  function kaydi(k){ return easeInOut(kis((L - silBas - k * adim - adim * .35) / (adim * .5), 0, 1)); }
  var toplam = 0; for (var m = 0; m < n; m++) toplam += kaydi(m);
  adlar.forEach(function(ad, i){
    var sq = kis((L - silBas - i * adim) / (adim * .7), 0, 1); if (sq >= 1) return;
    /* silinenlerin yerini sağdakiler kayarak doldurur */
    var kayan = 0; for (var k = 0; k < i; k++) kayan += kaydi(k);
    var ix = (i - kayan - (n - 1 - toplam) / 2) * ara;
    var titre = Math.sin(L * 28 + i * 1.7) * .055, sci = 1 - easeInOut(sq);
    c.save(); c.translate(ix, u * 2.6); c.rotate(titre); c.scale(sci, sci); c.globalAlpha = a * (1 - sq);
    efIkon(c, o, i, 0, 0, r, ad);
    c.fillStyle = '#2B2B2E'; c.beginPath(); c.arc(-r * .9, -r * .9, r * .32, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.fillRect(-r * .9 - r * .16, -r * .9 - r * .035, r * .32, r * .07);
    c.font = efFont(700, r * .3, EF_KALIN); c.textAlign = 'center'; c.fillStyle = '#222'; c.fillText(ad, 0, r * 1.4);
    c.restore();
  });
  c.restore();
  return { x: o.x, y: o.y, w: pw / W, h: ph / H };
}

/* ---------- 13 Eyedropper grade (sahne): damlalık renk alır, palet çıkar, kare boyanır ---------- */
function efDamlalik(c, x, y, s, renk){
  c.save(); c.translate(x, y); c.rotate(-Math.PI / 4);
  c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = s * .08;
  yuvarlak(c, -s * .16, -s * 1.9, s * .32, s * 1.5, s * .1); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-s * .12, -s * .4); c.lineTo(0, 0); c.lineTo(s * .12, -s * .4); c.closePath(); c.fillStyle = renk || '#fff'; c.fill(); c.stroke();
  yuvarlak(c, -s * .3, -s * 2.5, s * .6, s * .7, s * .25); c.fillStyle = '#2B2B2E'; c.fill();
  c.restore();
}
function efEyedrop(c, o, W, H, L, D, u, kaynak){
  var px = o.x * W, py = o.y * H, a = efCikis(L, D);
  var renk = efNoktaRengi(kaynak, o.x, o.y), palet = efPaletCikar(kaynak, o.id + ':' + o.bas) || ['#DB997D', '#A6BDC0', '#754F40', '#4F670F', '#19130F'];
  var gel = easeInOut(kis(L / .45, 0, 1)), al = kis((L - .5) / .3, 0, 1), pq = kis((L - .9) / .5, 0, 1), boya = easeInOut(kis((L - 1.1) / .5, 0, 1));
  /* boyama: alınan renkle yumuşak ton */
  if (boya > 0) { c.save(); c.globalAlpha = .32 * boya * a; c.globalCompositeOperation = 'soft-light'; c.fillStyle = renk; c.fillRect(0, 0, W, H); c.restore(); }
  c.save(); c.globalAlpha = a;
  if (al > 0 && pq < 1) {
    var rr = u * 4.2 * easeBack(al) * (1 - pq);
    efGolge(c, u, .35); c.fillStyle = renk; c.beginPath(); c.arc(px - u * 2, py + u * 2, Math.max(0, rr), 0, Math.PI * 2); c.fill();
    efGolgesiz(c); c.strokeStyle = '#fff'; c.lineWidth = u * .5; c.stroke();
  }
  if (pq < 1) { var dx = px + (1 - gel) * W * .4, dy = py + (1 - gel) * H * .25; c.globalAlpha = a * (1 - pq); efDamlalik(c, dx, dy, u * 4, al > 0 ? renk : '#fff'); c.globalAlpha = a; }
  if (pq > 0) {
    var bw = 84 * u, bh = 14 * u, by = H * .72, sw = (bw - u * 4) / palet.length;
    var g = easeOut(pq); c.globalAlpha = a * g;
    efGolge(c, u, .3); yuvarlak(c, W / 2 - bw / 2, by - bh / 2 + (1 - g) * u * 4, bw, bh, u * 2.2); c.fillStyle = '#fff'; c.fill(); efGolgesiz(c);
    palet.forEach(function(h, i){
      var q = kis((L - 1 - i * .08) / .3, 0, 1); if (q <= 0) return;
      var sx = W / 2 - bw / 2 + u * 2 + i * sw, sc = .6 + .4 * easeBack(q);
      c.save(); c.translate(sx + sw / 2, by - u * 1.5); c.scale(sc, sc);
      yuvarlak(c, -sw / 2 + u * .5, -u * 4, sw - u, u * 7, u * 1.2); c.fillStyle = h; c.fill();
      c.restore();
      c.fillStyle = '#555'; c.font = efFont(700, u * 1.3, EF_KALIN); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(h, sx + sw / 2, by + u * 4.6);
    });
  }
  c.restore();
  return { x: o.x, y: o.y, w: .12, h: .07 };
}

/* ---------- 14 Title card (sahne): video karta küçülür, üstte başlık ---------- */
function efZemin(c, W, H){
  var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0B0B0E'); g.addColorStop(1, '#16161B'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function efCerceveli(c, kopya, W, H, cx, cy, sc, u, kenar){
  var w = W * sc, h = H * sc;
  c.save(); efGolge(c, u * 2, .55); yuvarlak(c, cx - w / 2 - kenar, cy - h / 2 - kenar, w + kenar * 2, h + kenar * 2, u * 2.4 * sc + kenar); c.fillStyle = '#F4F4F6'; c.fill(); efGolgesiz(c);
  yuvarlak(c, cx - w / 2, cy - h / 2, w, h, u * 2.2 * sc); c.clip(); c.drawImage(kopya, cx - w / 2, cy - h / 2, w, h); c.restore();
}
function efTitle(c, o, W, H, L, D, u, kaynak, duz, t){
  var gir = easeInOut(kis(L / .5, 0, 1)), cik = easeInOut(kis((L - (D - .4)) / .4, 0, 1)), q = gir * (1 - cik);
  if (q <= 0) return null;
  var kopya = efSnapshot(c, W, H);
  c.save(); efZemin(c, W, H);
  var sc = 1 - .4 * q, cy = H / 2 + q * H * .1;
  efCerceveli(c, kopya, W, H, W / 2, cy, sc, u, u * .7 * q);
  var ya = kis((L - .3) / .4, 0, 1) * (1 - cik);
  if (ya > 0) {
    c.globalAlpha = ya; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    var ty = H * .17, fs = 9 * u;
    c.font = efFont(500, fs, EF_SERIF);
    var gr = c.createLinearGradient(0, ty - fs, 0, ty); gr.addColorStop(0, '#F6E7BE'); gr.addColorStop(1, '#C9A55E');
    c.fillStyle = gr;
    if ('letterSpacing' in c) c.letterSpacing = ((1 - easeOut(ya)) * u * 1.2).toFixed(1) + 'px';
    c.fillText(efBuyuk(o.metin || 'Title card'), W / 2, ty);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.font = efFont(700, u * 1.9, 'ui-monospace, Menlo, monospace'); c.fillStyle = '#E9D29A'; c.fillText(efZamanKodu(t), W / 2, ty - fs * 1.15);
    var lw = W * .32 * easeOut(ya); c.fillStyle = 'rgba(233,210,154,.7)'; c.fillRect(W / 2 - lw / 2, ty + u * 1.6, lw, Math.max(1, u * .18));
    if (o.metin2) { c.font = efFont(600, u * 2.4, EF_SERIF, true); c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText(o.metin2, W / 2, ty + u * 5); }
  }
  c.restore();
  return null;
}

/* ---------- 15 Reel feed (sahne): video akıştaki bir reel kartına dönüşür, akış kayar ---------- */
function efReelFeed(c, o, W, H, L, D, u, kaynak, duz, t){
  var gir = easeInOut(kis(L / .45, 0, 1)), cik = easeInOut(kis((L - (D - .4)) / .4, 0, 1)), q = gir * (1 - cik);
  if (q <= 0) return null;
  var kopya = efSnapshot(c, W, H), sc = 1 - .3 * q, kh = H * sc, ara = u * 4;
  var kay = easeInOut(kis((L - .45) / .6, 0, 1)), cy = H / 2 + (1 - kay) * (kh + ara) * .55 * q;
  c.save(); efZemin(c, W, H);
  /* bir önceki reel: resim varsa o, yoksa bulanık kare */
  var onceki = o.srcs && o.srcs[0] ? resimAl(o.srcs[0]) : null, py = cy - kh - ara;
  c.save(); yuvarlak(c, W / 2 - W * sc / 2, py - kh / 2, W * sc, kh, u * 2.2 * sc); c.clip();
  if (onceki) efKapla(c, onceki, W / 2 - W * sc / 2, py - kh / 2, W * sc, kh, .3);
  else bulanikla(c, W, H, u * 1.5, function(cc){ cc.drawImage(kopya, W / 2 - W * sc / 2, py - kh / 2, W * sc, kh); });
  c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(W / 2 - W * sc / 2, py - kh / 2, W * sc, kh);
  c.restore();
  efCerceveli(c, kopya, W, H, W / 2, cy, sc, u, u * .5 * q);
  /* yan ikonlar */
  var ix = W / 2 + W * sc / 2 - u * 4, iy = cy + kh * .1;
  c.globalAlpha = q; c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = u * .45;
  efGolge(c, u * .6, .5);
  c.beginPath(); var hx = ix, hy = iy, hs = u * 1.6; c.moveTo(hx, hy + hs * .9); c.bezierCurveTo(hx - hs * 1.6, hy - hs * .1, hx - hs * .7, hy - hs * 1.4, hx, hy - hs * .45); c.bezierCurveTo(hx + hs * .7, hy - hs * 1.4, hx + hs * 1.6, hy - hs * .1, hx, hy + hs * .9); c.fill();
  c.beginPath(); c.arc(ix, iy + u * 5, u * 1.4, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(ix - u * 1.4, iy + u * 10.6); c.lineTo(ix + u * 1.5, iy + u * 9.2); c.lineTo(ix, iy + u * 12); c.closePath(); c.stroke();
  efGolgesiz(c);
  if (o.metin) { c.font = efFont(800, u * 2, EF_KALIN); c.textAlign = 'left'; c.textBaseline = 'middle'; efGolge(c, u * .6, .6); c.fillText(o.metin, W / 2 - W * sc / 2 + u * 3, cy + kh / 2 - u * 4); }
  c.restore();
  return null;
}

/* ---------- 16 Video card: küçük video kartı, oynat düğmesi ve ilerleme ---------- */
function efVideoCard(c, o, W, H, L, D, u, kaynak){
  var w = 30 * u, th = w * 1.05, h = th + u * 8.5, cx = o.x * W, cy = o.y * H;
  var g = efGiris(L, 0, .4), a = efCikis(L, D) * kis(g * 2, 0, 1), p = kis(L / Math.max(.5, D), 0, 1);
  c.save(); c.globalAlpha = a; c.translate(cx - (1 - easeOut(g)) * u * 12, cy); c.rotate((1 - easeOut(g)) * -.08);
  efGolge(c, u, .45); yuvarlak(c, -w / 2, -h / 2, w, h, u * 2.2); c.fillStyle = 'rgba(20,20,24,.95)'; c.fill(); efGolgesiz(c);
  c.save(); yuvarlak(c, -w / 2 + u, -h / 2 + u, w - u * 2, th - u, u * 1.5); c.clip(); efKapla(c, efResim(o, 0, kaynak), -w / 2 + u, -h / 2 + u, w - u * 2, th - u, .25);
  var gr = c.createLinearGradient(0, -h / 2 + th * .55, 0, -h / 2 + th); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); c.fillStyle = gr; c.fillRect(-w / 2, -h / 2, w, th);
  c.restore();
  if (o.metin3) efEtiket(c, o.metin3, -w / 2 + u * 4, -h / 2 + u * 3.6, u * 1.7, '#111', o.renk || EF_SARI);
  var bq = kis((L - .35) / .3, 0, 1), pr = u * 3 * easeBack(bq);
  if (bq > 0) {
    c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(0, -h / 2 + th * .5, pr, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.moveTo(-pr * .3, -h / 2 + th * .5 - pr * .42); c.lineTo(pr * .45, -h / 2 + th * .5); c.lineTo(-pr * .3, -h / 2 + th * .5 + pr * .42); c.fill();
  }
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#F4EBDD'; c.font = efFont(600, u * 3, EF_SERIF, true); c.fillText(o.metin || 'Video card', -w / 2 + u * 1.6, -h / 2 + th + u * 3.6);
  c.fillStyle = 'rgba(255,255,255,.55)'; c.font = efFont(600, u * 1.5, EF_KALIN); c.fillText(o.metin2 || 'takipçiler · 0:58', -w / 2 + u * 1.6, -h / 2 + th + u * 6.2);
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-w / 2 + u * 1.6, h / 2 - u * 1.4, w - u * 3.2, u * .5);
  c.fillStyle = o.renk || EF_SARI; c.fillRect(-w / 2 + u * 1.6, h / 2 - u * 1.4, (w - u * 3.2) * p, u * .5);
  c.restore();
  return { x: o.x, y: o.y, w: w / W, h: h / H };
}

/* ---------- 17 Comment CTA: italik serif + kalın satır, anahtar kelime sarı, yorum kutusuna yazılır ---------- */
function efYorumKutusu(c, x, y, w, u, yazi, imlec){
  var h = u * 6.4;
  efGolge(c, u, .25); yuvarlak(c, x - w / 2, y - h / 2, w, h, u * 1.6); c.fillStyle = '#fff'; c.fill(); efGolgesiz(c);
  var g = c.createLinearGradient(x - w / 2 + u * 2, y - u * 1.2, x - w / 2 + u * 4.4, y + u * 1.2); g.addColorStop(0, '#F58529'); g.addColorStop(.5, '#DD2A7B'); g.addColorStop(1, '#515BD4');
  c.fillStyle = g; c.beginPath(); c.arc(x - w / 2 + u * 3.2, y, u * 1.3, 0, Math.PI * 2); c.fill();
  c.textBaseline = 'middle'; c.textAlign = 'left';
  if (yazi) { c.fillStyle = '#111'; c.font = efFont(800, u * 1.9, EF_KALIN); c.fillText(yazi, x - w / 2 + u * 6, y); }
  else { c.fillStyle = '#9CA0A8'; c.font = efFont(500, u * 1.8, EF_KALIN); c.fillText('Yorum ekle…', x - w / 2 + u * 6, y); }
  if (imlec) { var cw = c.measureText(yazi || '').width; c.fillStyle = '#111'; c.fillRect(x - w / 2 + u * 6 + (yazi ? cw + u * .3 : 0), y - u * 1.2, u * .3, u * 2.4); }
  c.fillStyle = '#4AA8FF'; c.font = efFont(700, u * 1.7, EF_KALIN); c.textAlign = 'right'; c.fillText('Paylaş', x + w / 2 - u * 2.2, y);
}
function efCTA(c, o, W, H, L, D, u){
  var cx = o.x * W, cy = o.y * H, a = efCikis(L, D), anahtar = efBuyuk(o.kelime || 'EFEKT');
  var s1 = o.metin || 'Listenin tamamı için', s2 = (o.metin2 || 'yorumlara {k} yaz').replace('{k}', anahtar);
  c.save(); c.globalAlpha = a; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  /* 1. satır: soldan sağa açılan el yazısı hissi */
  c.font = efFont(600, u * 4.6, EF_SERIF, true); var w1 = c.measureText(s1).width, q1 = kis(L / .9, 0, 1);
  c.save(); c.beginPath(); c.rect(cx - w1 / 2 - u, cy - u * 7, (w1 + u * 2) * easeInOut(q1), u * 9); c.clip();
  efGolge(c, u, .35); c.fillStyle = '#EAD9B0'; c.fillText(s1, cx - w1 / 2, cy - u * 1.8); c.restore();
  /* 2. satır: kelime kelime */
  c.font = efFont(800, u * 5, EF_KALIN); var kel = s2.split(' '), bos = c.measureText(' ').width, gen = 0, ws = kel.map(function(k){ var w = c.measureText(k).width; gen += w + bos; return w; }); gen -= bos;
  var x = cx - gen / 2, b2 = .75;
  kel.forEach(function(k, i){
    var q = kis((L - b2 - i * .16) / .2, 0, 1);
    if (q > 0) { c.save(); c.globalAlpha = a * kis(q * 2, 0, 1); var sc = 1 + (1 - easeOut(q)) * .25; c.translate(x + ws[i] / 2, cy + u * 4); c.scale(sc, sc); efGolge(c, u, .4);
      c.fillStyle = efBuyuk(k) === anahtar ? (o.renk || EF_SARI) : '#fff'; c.textAlign = 'center'; c.fillText(k, 0, 0); c.restore(); }
    x += ws[i] + bos;
  });
  /* yorum kutusu */
  var kq = efGiris(L, .35, .35), yb = b2 + kel.length * .16 + .15, n = Math.min(anahtar.length, Math.max(0, Math.floor((L - yb) / .09)));
  c.globalAlpha = a * kq; efYorumKutusu(c, cx, cy + u * 14 + (1 - easeOut(kq)) * u * 3, u * 80, u, anahtar.slice(0, n), L > yb && Math.floor(L / .4) % 2 === 0);
  c.restore();
  return { x: o.x, y: o.y + u * 5 / H, w: Math.max(w1, gen, u * 80) / W, h: u * 26 / H };
}

/* ---------- 18 Comment drop: yorum düşer, hesap yanıt verir, kalp kırmızı olur ---------- */
function efKalp(c, x, y, s, dolu){
  c.beginPath(); c.moveTo(x, y + s * .9); c.bezierCurveTo(x - s * 1.6, y - s * .1, x - s * .7, y - s * 1.4, x, y - s * .45); c.bezierCurveTo(x + s * .7, y - s * 1.4, x + s * 1.6, y - s * .1, x, y + s * .9);
  if (dolu) { c.fillStyle = '#FF3040'; c.fill(); } else { c.strokeStyle = '#9CA0A8'; c.lineWidth = s * .2; c.stroke(); }
}
function efCommentDrop(c, o, W, H, L, D, u){
  var w = 80 * u, cx = o.x * W, cy = o.y * H, a = efCikis(L, D), anahtar = efBuyuk(o.kelime || 'EFEKT');
  var dq = kis(L / .5, 0, 1), yq = kis((L - .55) / .35, 0, 1), kq = kis((L - 1) / .3, 0, 1);
  var h = u * 10 + u * 7.5 * easeOut(yq) + u * 6.4;
  c.save(); c.globalAlpha = a * kis(dq * 3, 0, 1); c.translate(cx, cy - (1 - efZiplama(dq)) * u * 18);
  efGolge(c, u, .3); yuvarlak(c, -w / 2, -h / 2, w, h, u * 2); c.fillStyle = '#fff'; c.fill(); efGolgesiz(c);
  var x0 = -w / 2 + u * 2.2, y = -h / 2 + u * 3;
  var g = c.createLinearGradient(x0, y, x0 + u * 2.6, y + u * 2.6); g.addColorStop(0, '#F58529'); g.addColorStop(1, '#515BD4'); c.fillStyle = g; c.beginPath(); c.arc(x0 + u * 1.2, y + u * .4, u * 1.2, 0, Math.PI * 2); c.fill();
  c.textBaseline = 'middle'; c.textAlign = 'left';
  c.fillStyle = '#111'; c.font = efFont(800, u * 1.6, EF_KALIN); c.fillText(o.metin3 || 'sen', x0 + u * 3.4, y - u * .4);
  c.fillStyle = '#9CA0A8'; c.font = efFont(500, u * 1.4, EF_KALIN); c.fillText('şimdi', x0 + u * 3.4 + c.measureText(o.metin3 || 'sen').width + u * 2.6, y - u * .4);
  c.fillStyle = '#111'; c.font = efFont(700, u * 2, EF_KALIN); c.fillText(anahtar, x0 + u * 3.4, y + u * 2.1);
  var ks = 1 + Math.sin(kq * Math.PI) * .45; c.save(); c.translate(w / 2 - u * 3, y + u * .6); c.scale(ks, ks); efKalp(c, 0, 0, u * 1.1, kq > .3); c.restore();
  if (yq > 0) {
    c.save(); c.globalAlpha = a * yq; var ry = y + u * 7 - (1 - easeOut(yq)) * u * 2, rx = x0 + u * 3.4;
    c.fillStyle = '#111'; c.beginPath(); c.arc(rx + u * 1.1, ry, u * 1.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = efFont(800, u * 1.2, EF_KALIN); c.textAlign = 'center'; c.fillText(efBuyuk((o.metin2 || 'hesabin').charAt(0)), rx + u * 1.1, ry + u * .05);
    c.textAlign = 'left'; c.fillStyle = '#111'; c.font = efFont(800, u * 1.5, EF_KALIN); c.fillText(o.metin2 || 'hesabin', rx + u * 3, ry - u * .7);
    var aw = c.measureText(o.metin2 || 'hesabin').width; c.fillStyle = '#9CA0A8'; c.font = efFont(500, u * 1.3, EF_KALIN); c.fillText('yanıt verdi', rx + u * 3.6 + aw, ry - u * .7);
    c.fillStyle = '#111'; c.font = efFont(600, u * 1.7, EF_KALIN); c.fillText(o.metin || 'Gönderildi, DM’ine bak 📩', rx + u * 3, ry + u * 1.5);
    c.restore();
  }
  c.save(); c.translate(0, h / 2 - u * 3.6); c.globalAlpha = a; c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(-w / 2 + u * 2, -u * 3, w - u * 4, Math.max(1, u * .12)); c.restore();
  efYorumKutusu(c, 0, h / 2 - u * 3.4, w - u * .5, u * .9, '', false);
  c.restore();
  return { x: o.x, y: o.y, w: w / W, h: h / H };
}

/* ---------- Kayıt defteri ---------- */
/* alan: formda gösterilecek alanlar → [anahtar, etiket, varsayılan] */
var EFEKTLER = {
  gravity:  { no: 1,  ad: 'Gravity drop',     tr: 'Harfler yukarıdan düşüp zıplar', ciz: efGravity, sure: 2.2, x: .5, y: .2, arka: true,
              alan: [['metin', 'Kelime', 'DROP'], ['metin2', 'Üstteki küçük yazı', 'gravity']] },
  strike:   { no: 2,  ad: 'Icon strike',      tr: 'İkonların üstü kırmızı çizgiyle çizilir', ciz: efStrike, sure: 2, x: .16, y: .16, resim: 'İkon resimleri',
              alan: [['metin', 'İkon adları (her satıra bir)', 'CapCut\nEdits']] },
  kinetic:  { no: 3,  ad: 'Kinetic hook',     tr: 'İki satır, harf harf çarparak yazılır', ciz: efKinetic, sure: 2, x: .5, y: .2, arka: true, renk: EF_SARI,
              alan: [['metin', '1. satır (beyaz)', 'KINETIC'], ['metin2', '2. satır (renkli)', 'HOOK']] },
  grade:    { no: 4,  ad: 'Grade slider',     tr: 'Önce / sonra renk çizgisi kayar', ciz: efGrade, sahne: true, sure: 1.6, x: .5, y: .78, renk: EF_SARI,
              alan: [['metin', 'Sol etiket', 'Sonra'], ['metin2', 'Sağ etiket', 'Önce']] },
  prompt:   { no: 5,  ad: 'Prompt bar',       tr: 'Yapay zeka kutusuna yazı yazılır', ciz: efPrompt, sure: 1.8, x: .4, y: .08, renk: EF_SARI,
              alan: [['metin', 'Yazılacak metin', 'prompt bar']] },
  grid:     { no: 6,  ad: 'Playing grid',     tr: 'Oynayan kartlar yelpaze gibi açılır', ciz: efGrid, sure: 1.5, x: .22, y: .2, resim: 'Kart resimleri (yoksa videonun kendisi)', alan: [] },
  giant:    { no: 7,  ad: 'Giant captions',   tr: 'Dev kelime + altında italik yazı', ciz: efGiant, sure: 1.8, x: .5, y: .17, arka: true, renk: '#F3D34A',
              alan: [['metin', 'Dev kelime', 'GIANT'], ['metin2', 'İtalik alt yazı', 'captions.']] },
  filedrop: { no: 8,  ad: 'File drop',        tr: 'Dosya kutuya düşer, videoya dönüşür', ciz: efFileDrop, sure: 2, x: .2, y: .25, renk: EF_SARI, resim: 'Küçük resim (yoksa videonun kendisi)',
              alan: [['metin', 'Kutudaki yazı', 'Ham görüntüyü\nburaya bırak'], ['metin2', 'Dosya adı', '1101.mp4'], ['metin3', 'Dosya bilgisi', '53 MB · 0:29'], ['kelime', 'Sonraki etiket', '0:29 ham görüntü']] },
  timeline: { no: 9,  ad: 'NLE timeline',     tr: 'Kurgu programı zaman şeridi', ciz: efTimeline, sure: 1.8, x: .5, y: .8, renk: EF_SARI,
              alan: [['metin', 'Başlık', 'Timeline']] },
  film:     { no: 10, ad: 'Film look',        tr: 'Sinema bantları, sıcak renk, gren, REC', ciz: efFilm, sahne: true, sure: 1.6, renk: '#FF9A3C',
              alan: [['metin', 'Alt yazı', '35MM · 24 FPS']] },
  deck:     { no: 11, ad: 'Storyboard deck',  tr: 'Kartlar desteden sıraya dağıtılır', ciz: efDeck, sure: 1.8, x: .5, y: .86, resim: 'Kart resimleri (yoksa videonun kendisi)', alan: [] },
  jiggle:   { no: 12, ad: 'Jiggle delete',    tr: 'Titreyen ikonlar tek tek silinir', ciz: efJiggle, sure: 2.2, x: .5, y: .78, resim: 'İkon resimleri',
              alan: [['metin', 'İkon adları (her satıra bir)', 'CapCut\nEdits\nInShot\nPremiere'], ['metin2', 'Üst başlık', 'Edit mode'], ['metin3', 'Sayaç eki', 'uygulama']] },
  eyedrop:  { no: 13, ad: 'Eyedropper grade', tr: 'Damlalık renk alır, palet çıkar', ciz: efEyedrop, sahne: true, sure: 2.2, x: .45, y: .3, alan: [] },
  title:    { no: 14, ad: 'Title card',       tr: 'Video karta küçülür, üstte başlık', ciz: efTitle, sahne: true, sure: 2,
              alan: [['metin', 'Başlık', 'TITLE CARD'], ['metin2', 'Alt başlık (isteğe bağlı)', '']] },
  reel:     { no: 15, ad: 'Reel feed',        tr: 'Video akıştaki bir reel kartına dönüşür', ciz: efReelFeed, sahne: true, sure: 2, resim: 'Önceki reel resmi (isteğe bağlı)',
              alan: [['metin', 'Kart altı yazı (isteğe bağlı)', '']] },
  vcard:    { no: 16, ad: 'Video card',       tr: 'Oynat düğmeli küçük video kartı', ciz: efVideoCard, sure: 2, x: .22, y: .22, renk: EF_SARI, resim: 'Kapak resmi (yoksa videonun kendisi)',
              alan: [['metin', 'Başlık', 'Video card'], ['metin2', 'Alt bilgi', 'takipçiler · 0:58'], ['metin3', 'Köşe rozeti', '01']] },
  cta:      { no: 17, ad: 'Comment CTA',      tr: 'Yorum çağrısı, kutuya anahtar kelime yazılır', ciz: efCTA, sure: 3, x: .5, y: .62, renk: EF_SARI,
              alan: [['metin', 'İtalik satır', 'Listenin tamamı için'], ['metin2', 'Kalın satır ({k} = anahtar kelime)', 'yorumlara {k} yaz'], ['kelime', 'Anahtar kelime', 'EFEKT']] },
  cdrop:    { no: 18, ad: 'Comment drop',     tr: 'Yorum düşer, hesap yanıt verir, kalp', ciz: efCommentDrop, sure: 2.5, x: .5, y: .78,
              alan: [['kelime', 'Yorum', 'EFEKT'], ['metin2', 'Yanıt veren hesap', 'dogusremax'], ['metin', 'Yanıt', 'Gönderildi, DM’ine bak 📩'], ['metin3', 'Yorum yapan', 'sen']] }
};
var EFEKT_SIRA = Object.keys(EFEKTLER).sort(function(a, b){ return EFEKTLER[a].no - EFEKTLER[b].no; });

function efektYeni(alt, bas, bit){
  var e = EFEKTLER[alt], o = { tur: 'efekt', alt: alt, x: e.x == null ? .5 : e.x, y: e.y == null ? .5 : e.y, boyut: 10, bas: bas, bit: bit, arka: !!e.arka, srcs: [] };
  if (e.renk) o.renk = e.renk;
  e.alan.forEach(function(a){ o[a[0]] = a[2]; });
  return o;
}
/* bir efekt öğesini çizer; düzenleme ekranında seçim kutusunu döndürür */
function efektCiz(ctx, o, W, H, t, duzenleme, kaynak){
  var e = EFEKTLER[o.alt]; if (!e) return null;
  var D = Math.max(.2, o.bit - o.bas), ic = t >= o.bas && t <= o.bit, secik = duzenleme && o.id === secili && video.paused;
  if (!ic && !secik) return null;
  /* durdurulmuş ve seçiliyken efektin başında hiçbir şey görünmez: düzenlerken efekt "orta pozunda" gösterilir */
  var poz = secik && (!ic || t - o.bas < .15), L = poz ? Math.min(D * .6, 1.6) : t - o.bas, u = W / 100 * (o.boyut || 10) / 10;
  ctx.save(); if (!ic) ctx.globalAlpha = .5;
  var k = null;
  try { k = e.ciz(ctx, o, W, H, L, D, u, kaynak, duzenleme, o.bas + L); } catch(err) { console.log('efekt', o.alt, err); }
  ctx.restore();
  return k;
}
/* sahne efektleri: kare tamamen çizildikten sonra sırayla uygulanır */
function sahneEfektleri(ctx, W, H, t, duzenleme, kaynak){
  for (var i = 0; i < ogeler.length; i++) {
    var o = ogeler[i]; if (o.tur !== 'efekt' || !EFEKTLER[o.alt] || !EFEKTLER[o.alt].sahne) continue;
    var k = efektCiz(ctx, o, W, H, t, duzenleme, kaynak);
    if (duzenleme && k) kutular[o.id] = k;
  }
}
function efektSahneMi(o){ return o && o.tur === 'efekt' && EFEKTLER[o.alt] && EFEKTLER[o.alt].sahne; }

/* ---------- Arayüz ---------- */
function efektlerKur(){
  var k = f('efektler'); if (!k) return;
  EFEKT_SIRA.forEach(function(ad){
    var e = EFEKTLER[ad], b = document.createElement('button'); b.className = 'efekt'; b.type = 'button';
    b.innerHTML = '<i></i><b></b><small></small>';
    b.querySelector('i').textContent = (e.no < 10 ? '0' : '') + e.no + (e.sahne ? ' · TÜM EKRAN' : '');
    b.querySelector('b').textContent = e.ad; b.querySelector('small').textContent = e.tr;
    b.onclick = function(){ efektEkle(ad); };
    k.appendChild(b);
  });
  f('eRenk').addEventListener('input', function(){ var o = bul(secili); if (!o || o.tur !== 'efekt') return; o.renk = f('eRenk').value; cizdir(); kaydet(); });
  f('eBoyut').addEventListener('input', function(){ var o = bul(secili); if (!o || o.tur !== 'efekt') return; o.boyut = parseFloat(f('eBoyut').value); f('eBoyutD').textContent = Math.round(o.boyut * 10) + '%'; cizdir(); kaydet(); });
  var ed = f('efektEkDosya');
  ed.addEventListener('change', function(){
    var o = bul(secili); if (!o || o.tur !== 'efekt') return;
    dosyalariOku(ed.files, function(srcs){ o.srcs = (o.srcs || []).concat(srcs); formDoldur(); cizdir(); kaydet(); listele(); });
    ed.value = '';
  });
}
function efektEkle(alt){
  var e = EFEKTLER[alt]; if (!e) return;
  if (!video.src) { bildir('Önce bir video seçin'); return; }
  video.pause();
  var z = yeniZaman(e.sure), o = efektYeni(alt, z.bas, z.bit); o.id = sayac++;
  ogeler.push(o); sekmeAc('pOge'); sec(o.id); kaydet(); listele();
  bildir(e.ad + ' eklendi · ' + zmn(o.bas) + '–' + zmn(o.bit) + ' · oynatıp izleyin');
  if (o.arka) segIste();
}
function efektFormDoldur(o){
  var e = EFEKTLER[o.alt] || { alan: [] };
  f('eTanim').textContent = e.tr + (e.sahne ? ' · Bütün ekranı etkiler.' : ' · Kutuyu sürükleyerek yerini, köşesinden boyutunu değiştirin.');
  var k = f('eAlanlar'), imza = o.id + ':' + o.alt;
  if (k.dataset.imza !== imza) {
    k.dataset.imza = imza; k.innerHTML = '';
    e.alan.forEach(function(a){
      var sat = document.createElement('div'); sat.className = 'satir';
      var lb = document.createElement('label'); lb.textContent = a[1];
      var cok = /\n/.test(a[2]) || /satıra/.test(a[1]), g = document.createElement(cok ? 'textarea' : 'input');
      g.dataset.alan = a[0]; g.placeholder = a[2]; g.style.cssText = 'flex:1;border:1px solid var(--line);border-radius:10px;padding:8px;background:transparent'; if (cok) g.style.minHeight = '64px';
      g.addEventListener('input', function(){ var x = bul(secili); if (!x || x.tur !== 'efekt') return; x[a[0]] = g.value; cizdir(); kaydet(); listele(); });
      sat.appendChild(lb); sat.appendChild(g); k.appendChild(sat);
    });
  }
  Array.prototype.forEach.call(k.querySelectorAll('[data-alan]'), function(g){ if (document.activeElement !== g) g.value = o[g.dataset.alan] == null ? '' : o[g.dataset.alan]; });
  f('eRenkSatir').classList.toggle('gizli', !e.renk); if (e.renk) f('eRenk').value = o.renk || e.renk;
  f('eBoyutSatir').classList.toggle('gizli', !!e.sahne && o.alt !== 'grade' && o.alt !== 'eyedrop');
  f('eBoyut').value = o.boyut || 10; f('eBoyutD').textContent = Math.round((o.boyut || 10) * 10) + '%';
  f('eResimSatir').classList.toggle('gizli', !e.resim); f('eResimEt').textContent = e.resim || '';
  var r = f('eResimler'); r.innerHTML = '';
  (o.srcs || []).forEach(function(src, i){ var im = document.createElement('img'); im.src = src; im.style.cssText = 'width:34px;height:48px;object-fit:cover;border-radius:6px;cursor:pointer'; im.title = 'Kaldırmak için dokunun'; im.onclick = function(){ o.srcs.splice(i, 1); formDoldur(); cizdir(); kaydet(); }; r.appendChild(im); });
}
