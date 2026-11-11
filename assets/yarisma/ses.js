/* Canlı Kıbrıs Yarışması — sunucu ekranı sesleri. Dosya yok, hepsi Web Audio ile üretilir (telifsiz).
   YZS.muzik('lobi'|'soru'|null), YZS.hizlan(), YZS.efekt(ad), YZS.efektAcik / YZS.muzikAcik */
(function () {
  var AC = null, ana, komp, muzikBus, duck, efektBus, gurultu = null;
  function taban() { var v = parseFloat(localStorage.getItem('yzMuzikSes')); return isNaN(v) ? 0.55 : v; } // ↑/↓ ile ayarlanan müzik sesi
  var S = { efektAcik: localStorage.getItem('yzSes') !== '0', muzikAcik: localStorage.getItem('yzMuzik') !== '0' };

  function hazirla() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      komp = AC.createDynamicsCompressor(); komp.threshold.value = -14; komp.ratio.value = 4; komp.connect(AC.destination);
      ana = AC.createGain(); ana.gain.value = 1.6; ana.connect(komp); // salon hoparlörü için yüksek, kompresör tepeleri tutar
      muzikBus = AC.createGain(); muzikBus.gain.value = S.muzikAcik ? taban() : 0;
      duck = AC.createGain(); duck.gain.value = 1; muzikBus.connect(duck); duck.connect(ana); // duck: sunucu konuşurken kısma
      efektBus = AC.createGain(); efektBus.gain.value = S.efektAcik ? 1 : 0; efektBus.connect(ana);
      var n = AC.sampleRate * 2; gurultu = AC.createBuffer(1, n, AC.sampleRate);
      var d = gurultu.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }

  /* ---------- yapı taşları ---------- */
  function osc(hedef, t, f, sure, tip, vol, atak, f2) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = tip || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + sure);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (atak || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    o.connect(g); g.connect(hedef); o.start(t); o.stop(t + sure + 0.05);
  }
  function grlt(hedef, t, sure, vol, tip, frek, q, atak) {
    var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = gurultu; f.type = tip || 'highpass'; f.frequency.value = frek || 6000; f.Q.value = q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (atak || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    s.connect(f); f.connect(g); g.connect(hedef); s.start(t, Math.random()); s.stop(t + sure + 0.05);
    return f;
  }
  function kick(h, t, v) { osc(h, t, 150, 0.28, 'sine', v || 0.9, 0.003, 42); }
  function snare(h, t, v) { grlt(h, t, 0.16, v || 0.35, 'bandpass', 1900, 0.8); osc(h, t, 210, 0.09, 'triangle', (v || 0.35) * 0.6); }
  function hat(h, t, v) { grlt(h, t, 0.045, v || 0.12, 'highpass', 8500); }
  function pluck(h, t, f, v, sure) { osc(h, t, f, sure || 0.22, 'triangle', v || 0.12, 0.004); osc(h, t, f * 2, (sure || 0.22) * 0.6, 'sine', (v || 0.12) * 0.35, 0.004); }
  function bas(h, t, f, sure, v) { osc(h, t, f, sure, 'sawtooth', (v || 0.16) * 0.5, 0.01); osc(h, t, f, sure, 'sine', v || 0.16, 0.01); }
  function ped(h, t, f, sure, v) { [-6, 0, 6].forEach(function (c) { var o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = c; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v || 0.035, t + sure * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + sure); o.connect(g); g.connect(h); o.start(t); o.stop(t + sure + 0.05); }); }
  var N = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  /* ---------- müzik: adım sıralayıcı ---------- */
  var DESEN = {
    // sakin bekleme müziği (Re majör, 96 bpm): D A Bm G
    lobi: { bpm: 96, akor: [[62, 66, 69], [61, 64, 69], [59, 62, 66], [59, 62, 67]], kok: [38, 45, 35, 43],
      adim: function (h, t, a, k, i, d) {
        if (i === 0) ped(h, t, N(a[0] + 12), d * 16, 0.05), ped(h, t, N(a[2] + 12), d * 16, 0.04);
        if (i % 8 === 0) bas(h, t, N(k), d * 6, 0.17);
        if (i % 4 === 2) hat(h, t, 0.07);
        if ([0, 3, 6, 10, 12].indexOf(i) >= 0) pluck(h, t, N(a[(i / 2 | 0) % 3] + 12), 0.1, 0.4);
      } },
    // gerilimli soru müziği (La minör, 120 → son 5 sn 150 bpm): Am F C G
    soru: { bpm: 120, akor: [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]], kok: [33, 29, 36, 31],
      adim: function (h, t, a, k, i, d, hizli) {
        if (i % 4 === 0) kick(h, t, 0.7);
        if (i === 4 || i === 12) snare(h, t, 0.22);
        hat(h, t, i % 2 ? 0.06 : 0.035);
        if ([0, 3, 6, 8, 11, 14].indexOf(i) >= 0) bas(h, t, N(k + (i === 14 ? 12 : 0)), d * 1.6, 0.17);
        pluck(h, t, N(a[i % 3] + 12 + (i % 8 >= 6 ? 12 : 0)), hizli ? 0.07 : 0.05, 0.16);
        if (hizli && i % 2 === 0) osc(h, t, N(81), d * 0.9, 'square', 0.025);
      } }
  };
  var calan = null, zam = null, sonraki = 0, adimNo = 0, hizli = false, muzikGain = null;
  /* ---------- kendi müzik dosyanız (bilgisayardan seçilir, siteye yüklenmez; IndexedDB'de bu tarayıcıda saklanır) ---------- */
  var dosyaEl = null, dosyaGain = null, dosyaAd = '', dosyaZam = null;
  function dosyaKur(blob, ad) {
    if (!hazirla()) return;
    if (dosyaEl) { try { dosyaEl.pause(); } catch (e) {} }
    if (!dosyaGain) { dosyaGain = AC.createGain(); dosyaGain.gain.value = 0; dosyaGain.connect(muzikBus); }
    dosyaEl = new Audio(); dosyaEl.loop = true; dosyaEl.preload = 'auto'; dosyaEl.src = URL.createObjectURL(blob); dosyaAd = ad || 'müzik';
    AC.createMediaElementSource(dosyaEl).connect(dosyaGain);
    var c = calan; calan = null; if (c) muzik(c);
  }
  function db(fn) {
    try { var r = indexedDB.open('yzMuzik', 1); r.onupgradeneeded = function () { r.result.createObjectStore('d'); };
      r.onsuccess = function () { fn(r.result.transaction('d', 'readwrite').objectStore('d')); }; } catch (e) {}
  }
  function muzik(ad) {
    if (!hazirla()) return;
    if (calan === ad) return;
    if (dosyaEl) { // seçilen şarkı: duraklatılmaz, kaldığı yerden sürer; lobi/sıralamada daha kısık
      clearInterval(zam); zam = null; if (muzikGain) durdurSentez(0.15);
      calan = ad; clearTimeout(dosyaZam);
      if (!ad) return durdur();
      var t = AC.currentTime; dosyaGain.gain.cancelScheduledValues(t); dosyaGain.gain.setValueAtTime(dosyaGain.gain.value, t);
      dosyaGain.gain.linearRampToValueAtTime(ad === 'soru' ? 0.9 : 0.45, t + 0.8);
      var p = dosyaEl.play(); if (p && p.catch) p.catch(function () {});
      return;
    }
    durdur();
    if (!ad || !DESEN[ad]) return;
    calan = ad; adimNo = 0; hizli = false; sonraki = AC.currentTime + 0.08;
    muzikGain = AC.createGain(); muzikGain.gain.value = 1; muzikGain.connect(muzikBus);
    var g = muzikGain;
    zam = setInterval(function () {
      var D = DESEN[calan]; if (!D) return;
      var d = 60 / (hizli ? 150 : D.bpm) / 4;
      while (sonraki < AC.currentTime + 0.12) {
        var bar = (adimNo / 16 | 0) % 4, i = adimNo % 16;
        D.adim(g, sonraki, D.akor[bar], D.kok[bar], i, d, hizli);
        sonraki += d; adimNo++;
      }
    }, 25);
  }
  function durdur(yavas) {
    clearInterval(zam); zam = null; calan = null;
    if (dosyaEl && dosyaGain) {
      var t0 = AC.currentTime; dosyaGain.gain.cancelScheduledValues(t0); dosyaGain.gain.setValueAtTime(dosyaGain.gain.value, t0);
      dosyaGain.gain.linearRampToValueAtTime(0.0001, t0 + (yavas || 0.4));
      clearTimeout(dosyaZam); dosyaZam = setTimeout(function () { if (!calan && dosyaEl) dosyaEl.pause(); }, ((yavas || 0.4) + 0.2) * 1000);
    }
    durdurSentez(yavas);
  }
  function durdurSentez(yavas) {
    if (muzikGain) { var g = muzikGain, t = AC.currentTime; g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + (yavas || 0.15)); setTimeout(function () { try { g.disconnect(); } catch (e) {} }, 1500); muzikGain = null; }
  }

  /* ---------- efektler ---------- */
  var E = {
    katil: function (h, t) { osc(h, t, N(84), 0.12, 'triangle', 0.18); osc(h, t + 0.06, N(91), 0.16, 'triangle', 0.15); },
    soru: function (h, t) { // vınlama + vuruş + yükselen akor
      var f = grlt(h, t, 0.7, 0.25, 'bandpass', 400, 1.5, 0.5); f.frequency.exponentialRampToValueAtTime(5000, t + 0.6);
      kick(h, t + 0.6, 0.6); grlt(h, t + 0.6, 0.6, 0.14, 'highpass', 5000);
      [57, 64, 69, 72].forEach(function (m, j) { osc(h, t + 0.6 + j * 0.05, N(m), 0.9, 'sawtooth', 0.05); });
    },
    siklar: function (h, t) { [76, 79, 83, 88].forEach(function (m, j) { pluck(h, t + j * 0.07, N(m), 0.14, 0.3); }); },
    tik: function (h, t) { osc(h, t, 1800, 0.035, 'square', 0.05); },
    tikSon: function (h, t) { osc(h, t, 1250, 0.09, 'square', 0.16); osc(h, t, 2500, 0.05, 'sine', 0.1); },
    // saat tik-tak'ı (tahta blok): ek = [yüksek mi, ses]
    tiktak: function (h, t, ek) { var y = ek && ek[0], v = (ek && ek[1]) || 0.1; osc(h, t, y ? 1320 : 990, 0.06, 'sine', v); osc(h, t, y ? 2640 : 1980, 0.025, 'triangle', v * 0.5); grlt(h, t, 0.02, v * 0.6, 'bandpass', y ? 3500 : 2600, 4); },
    kalp: function (h, t, v) { v = v || 0.7; osc(h, t, 70, 0.16, 'sine', v, 0.004, 40); osc(h, t + 0.2, 64, 0.2, 'sine', v * 0.75, 0.004, 38); },
    gerilim: function (h, t, sure) { // son saniyelerde yükselen gerilim
      sure = sure || 5; var o = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
      o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(440, t + sure);
      o2.frequency.setValueAtTime(116.5, t); o2.frequency.exponentialRampToValueAtTime(466, t + sure);
      f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(4000, t + sure);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + sure * 0.9); g.gain.linearRampToValueAtTime(0.0001, t + sure + 0.05);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(h); o.start(t); o2.start(t); o.stop(t + sure + 0.1); o2.stop(t + sure + 0.1);
    },
    bitti: function (h, t) { // süre doldu gongu
      [196, 247, 294].forEach(function (f) { osc(h, t, f, 1.6, 'sawtooth', 0.09, 0.005); });
      kick(h, t, 0.7); grlt(h, t, 1.2, 0.16, 'bandpass', 3000, 0.6);
    },
    davul: function (h, t, sure) { // trampet sesi (açıklama öncesi)
      sure = sure || 1.4; var n = Math.floor(sure / 0.045);
      for (var i = 0; i < n; i++) { var v = 0.08 + 0.3 * i / n; grlt(h, t + i * 0.045, 0.07, v, 'bandpass', 2200, 0.9); }
    },
    dogru: function (h, t) { // zil + parlak akor
      [72, 76, 79, 84].forEach(function (m, j) { osc(h, t + j * 0.06, N(m), 1.4, 'triangle', 0.16); osc(h, t + j * 0.06, N(m + 12), 0.8, 'sine', 0.06); });
      grlt(h, t, 1.4, 0.12, 'highpass', 7000); kick(h, t, 0.8);
    },
    siralama: function (h, t) {
      var f = grlt(h, t, 0.9, 0.22, 'bandpass', 300, 2, 0.6); f.frequency.exponentialRampToValueAtTime(6000, t + 0.85);
      [0, 4, 7, 12].forEach(function (s, j) { pluck(h, t + 0.9 + j * 0.09, N(67 + s), 0.15, 0.5); });
    },
    satir: function (h, t) { osc(h, t, N(88), 0.08, 'triangle', 0.08); },
    final: function (h, t) { // davul + fanfar + alkış
      E.davul(h, t, 2.2); var b = t + 2.25;
      kick(h, b, 0.6); grlt(h, b, 2, 0.2, 'highpass', 4000);
      var not = [[60, 0, .25], [64, .25, .25], [67, .5, .25], [72, .75, .7], [67, 1.5, .25], [72, 1.75, 1.6]];
      not.forEach(function (n) { [0, 4, 7].forEach(function (s) { osc(h, b + n[1], N(n[0] + s), n[2] + 0.3, 'sawtooth', 0.06, 0.01); }); osc(h, b + n[1], N(n[0] - 24), n[2] + 0.3, 'sine', 0.2); });
      for (var i = 0; i < 260; i++) { var ta = Math.random() * 5; grlt(h, b + 0.3 + ta, 0.04, (0.1 + Math.random() * 0.14) * (ta < 4 ? 1 : (5 - ta)), 'bandpass', 1200 + Math.random() * 2400, 1.4); } // alkış
    }
  };
  function efekt(ad, gec, ek) {
    if (!S.efektAcik || !hazirla() || !E[ad]) return;
    E[ad](efektBus, AC.currentTime + 0.01 + (gec || 0), ek);
  }

  // Önizleme dosyası üretmek için (OfflineAudioContext): müziği ve efektleri zamana yazar
  function onizleme(ctx, plan) {
    AC = ctx; komp = ctx.createDynamicsCompressor(); komp.threshold.value = -14; komp.ratio.value = 4; komp.connect(ctx.destination);
    ana = ctx.createGain(); ana.gain.value = 0.9; ana.connect(komp);
    muzikBus = ctx.createGain(); muzikBus.gain.value = 0.55; muzikBus.connect(ana); efektBus = ctx.createGain(); efektBus.connect(ana);
    var n = ctx.sampleRate * 2; gurultu = ctx.createBuffer(1, n, ctx.sampleRate); var dd = gurultu.getChannelData(0); for (var i = 0; i < n; i++) dd[i] = Math.random() * 2 - 1;
    plan.forEach(function (p) {
      if (p.muzik) { var D = DESEN[p.muzik], t = p.t, k = 0, mg = ctx.createGain(); mg.gain.value = p.vol || 1; mg.connect(muzikBus); while (t < p.t + p.sure) { var hz = p.hizli != null && t >= p.hizli, d = 60 / (hz ? 150 : D.bpm) / 4, bar = (k / 16 | 0) % 4; D.adim(mg, t, D.akor[bar], D.kok[bar], k % 16, d, hz); t += d; k++; } }
      else E[p.efekt](efektBus, p.t, p.ek);
    });
  }

  window.YZS = {
    _onizleme: onizleme,
    ac: hazirla,
    muzik: muzik,
    durdur: function (yavas) { if (AC) durdur(yavas); },
    hizlan: function () { hizli = true; },
    dosyaSec: function (file) { dosyaKur(file, file.name); db(function (st) { st.put({ blob: file, ad: file.name }, 'sarki'); }); },
    dosyaYukle: function (cb) { db(function (st) { var r = st.get('sarki'); r.onsuccess = function () { if (r.result) { dosyaKur(r.result.blob, r.result.ad); cb && cb(r.result.ad); } }; }); },
    dosyaSil: function () { if (dosyaEl) { dosyaEl.pause(); dosyaEl = null; } dosyaAd = ''; db(function (st) { st.delete('sarki'); }); var c = calan; calan = null; if (c) muzik(c); },
    dosyaAdi: function () { return dosyaAd; },
    _dosya: function () { return dosyaEl && { paused: dosyaEl.paused, t: dosyaEl.currentTime, g: dosyaGain.gain.value }; },
    efekt: efekt,
    efektAyar: function (v) { S.efektAcik = v; localStorage.setItem('yzSes', v ? '1' : '0'); if (efektBus) efektBus.gain.value = v ? 1 : 0; },
    muzikAyar: function (v) { S.muzikAcik = v; localStorage.setItem('yzMuzik', v ? '1' : '0'); if (muzikBus) muzikBus.gain.value = v ? taban() : 0; },
    // Müzik seviyesi (konuşma için kısma): 0..1, yumuşak geçiş
    seviye: function (x, sure) { if (!AC || !duck) return; var t = AC.currentTime; duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(duck.gain.value, t); duck.gain.linearRampToValueAtTime(Math.max(0.0001, x), t + (sure || 0.6)); },
    muzikSes: function (d) { var v = Math.max(0.05, Math.min(1, Math.round((taban() + d) * 100) / 100)); localStorage.setItem('yzMuzikSes', v); if (muzikBus && S.muzikAcik) muzikBus.gain.value = v; return Math.round(v / 0.55 * 100); },
    durum: S
  };
})();
