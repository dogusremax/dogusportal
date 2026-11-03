/* Video Düzenle · Konuşmadan yazı yardımcıları (saf fonksiyonlar, DOM'a dokunmaz)
   - altyaziParcala: 16 kHz sesi Whisper'ın 30 sn penceresine sığan, sessiz yerlerden bölünmüş parçalara ayırır.
     transformers.js'in kendi 30 sn/5 sn kaydırmalı parçalamasında parça sınırında kelimeler tekrar ediyor ya da
     kayboluyordu; sessizlikte bölünce hiçbir kelime ortadan kesilmez. Tamamen sessiz parçalar atlanır
     (Whisper sessizlikte "Altyazı M.K." gibi uydurma cümleler yazıyor).
   - altyaziTemizle: Whisper'ın bilinen uydurmalarını ve döngüye girip aynı kelimeleri tekrarlamasını temizler,
     zamanları sıraya sokar.
   - altyaziHizala: Kullanıcının düzelttiği metni eski zamanlı kelimelerle eşleştirir; zamanlar ve seçilen
     stiller korunur, yeni eklenen kelimelerin zamanı komşularından hesaplanır.
   video-duzenle.html'den önce yüklenir; Node'da test için module.exports da verir. */
(function(kok){
  function altyaziParcala(a, sr){
    sr = sr || 16000;
    var kare = Math.round(sr * .02), n = Math.floor(a.length / kare), e = new Float32Array(n), i, j;
    for (i = 0; i < n; i++) { var t = 0; for (j = i * kare; j < (i + 1) * kare; j++) t += a[j] * a[j]; e[i] = Math.sqrt(t / kare); }
    var sirali = Array.prototype.slice.call(e).sort(function(x, y){ return x - y; });
    var taban = sirali[Math.floor(n * .1)] || 0, tepe = sirali[Math.floor(n * .95)] || 0;
    var esik = Math.max(taban * 2.5, tepe * .08, .002);
    var EN = Math.round(28 / .02), EN_AZ = Math.round(14 / .02), YAR = 5;
    var sinirlar = [], bas = 0;
    while (bas < n) {
      var son;
      if (n - bas <= EN) son = n;
      else {
        /* 14-28 sn arasındaki en sessiz yer (yarım saniyelik ortalama) */
        var enIyi = bas + EN, minV = Infinity;
        for (i = bas + EN_AZ; i < bas + EN; i++) {
          var top = 0, say = 0;
          for (j = Math.max(0, i - YAR); j <= Math.min(n - 1, i + YAR); j++) { top += e[j]; say++; }
          var v = top / say;
          if (v < minV - 1e-9) { minV = v; enIyi = i; }
        }
        son = enIyi;
      }
      var konusma = 0;
      for (i = bas; i < son; i++) if (e[i] > esik) konusma++;
      sinirlar.push({ s: bas * kare / sr, e: Math.min(a.length, son * kare) / sr, bas: bas * kare, son: son >= n ? a.length : son * kare, sessiz: konusma * .02 < .3 });
      bas = son;
    }
    return sinirlar;
  }

  function kucuk(m){ return String(m || '').toLocaleLowerCase('tr').replace(/[^0-9a-zçğıöşüâîû]+/g, ''); }

  /* Whisper'ın Türkçede sık uydurduğu, konuşmada geçmeyen kalıplar */
  var UYDURMA = [/^altyaz[ıi]mk$/, /^altyaz[ıi]lar?mk$/];

  function altyaziTemizle(k, sure){
    var w = k.filter(function(x){ return x && String(x.m || '').trim(); }).map(function(x){ return { m: String(x.m).trim(), s: x.s, e: x.e, stil: x.stil || null }; });
    /* "Altyazı M.K." ve benzerleri (2-3 kelimeye bölünmüş olabilir) */
    for (var i = 0; i < w.length; i++) {
      for (var u = 3; u >= 1; u--) {
        if (i + u > w.length) continue;
        var birlesik = kucuk(w.slice(i, i + u).map(function(x){ return x.m; }).join(''));
        if (UYDURMA.some(function(r){ return r.test(birlesik); })) { w.splice(i, u); i--; break; }
      }
    }
    /* Döngü: aynı 1-4 kelimelik grup arka arkaya çok kez tekrarlanıyorsa bire indir */
    for (var g = 1; g <= 4; g++) {
      var enAz = g === 1 ? 4 : 3;
      for (i = 0; i + g * enAz <= w.length; i++) {
        var anah = w.slice(i, i + g).map(function(x){ return kucuk(x.m); }).join(' ');
        if (!anah.replace(/ /g, '')) continue;
        var tekrar = 1;
        while (i + (tekrar + 1) * g <= w.length && w.slice(i + tekrar * g, i + (tekrar + 1) * g).map(function(x){ return kucuk(x.m); }).join(' ') === anah) tekrar++;
        if (tekrar >= enAz) w.splice(i + g, (tekrar - 1) * g);
      }
    }
    /* Zamanlar: sıralı, makul uzunlukta */
    var onceki = 0;
    for (i = 0; i < w.length; i++) {
      var s = isFinite(w[i].s) ? w[i].s : onceki;
      s = Math.max(s, onceki);
      if (sure) s = Math.min(s, Math.max(0, sure - .1));
      var e = isFinite(w[i].e) ? w[i].e : s + .3;
      e = Math.min(Math.max(e, s + .08), s + 1.5);
      if (sure) e = Math.min(e, sure);
      w[i].s = +s.toFixed(2); w[i].e = +Math.max(e, s + .05).toFixed(2);
      onceki = w[i].s;
    }
    for (i = 0; i + 1 < w.length; i++) if (w[i].e > w[i + 1].s && w[i + 1].s > w[i].s) w[i].e = +Math.max(w[i].s + .05, w[i + 1].s).toFixed(2);
    return w;
  }

  /* İki kelime arasındaki benzerlik (0-1), harf düzeyinde düzenleme uzaklığından */
  function benzerlik(a, b){
    a = kucuk(a); b = kucuk(b);
    if (a === b) return 1;
    if (!a || !b) return 0;
    var p = [], i, j;
    for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) {
      var q = [i];
      for (j = 1; j <= b.length; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      p = q;
    }
    return 1 - p[b.length] / Math.max(a.length, b.length);
  }

  function altyaziHizala(eski, metin){
    var yeni = String(metin || '').split(/\s+/).filter(Boolean);
    var n = eski.length, m = yeni.length, i, j;
    if (!m) return [];
    if (!n) return yeni.map(function(x, k){ return { m: x, s: +(k * .4).toFixed(2), e: +(k * .4 + .35).toFixed(2), stil: null }; });
    /* Kelime düzeyinde hizalama: eşleşme 0, benzer kelimeyle değiştirme 0-1, ekleme/silme 1 */
    var D = [], Y = [];
    for (i = 0; i <= n; i++) { D[i] = new Float64Array(m + 1); Y[i] = new Uint8Array(m + 1); }
    for (i = 1; i <= n; i++) { D[i][0] = i; Y[i][0] = 1; }
    for (j = 1; j <= m; j++) { D[0][j] = j; Y[0][j] = 2; }
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
      var deg = D[i - 1][j - 1] + (1 - benzerlik(eski[i - 1].m, yeni[j - 1])) * 1.6;
      var sil = D[i - 1][j] + 1, ekle = D[i][j - 1] + 1;
      if (deg <= sil && deg <= ekle) { D[i][j] = deg; Y[i][j] = 0; }
      else if (sil <= ekle) { D[i][j] = sil; Y[i][j] = 1; }
      else { D[i][j] = ekle; Y[i][j] = 2; }
    }
    var es = new Array(m); /* yeni kelime -> eski kelime (ya da -1) */
    i = n; j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && Y[i][j] === 0) { es[j - 1] = i - 1; i--; j--; }
      else if (i > 0 && (j === 0 || Y[i][j] === 1)) { i--; }
      else { es[j - 1] = -1; j--; }
    }
    var cikti = yeni.map(function(x, k){
      var o = es[k] >= 0 ? eski[es[k]] : null;
      return { m: x, s: o ? o.s : null, e: o ? o.e : null, stil: o && o.stil ? o.stil : null };
    });
    /* Eşleşmeyen kelimeler: önceki ve sonraki zamanlı kelime arasına eşit dağıt */
    for (var k = 0; k < cikti.length; k++) {
      if (cikti[k].s != null) continue;
      var a = k; while (a < cikti.length && cikti[a].s == null) a++;
      var once = k > 0 ? cikti[k - 1].e : (a < cikti.length ? Math.max(0, cikti[a].s - .4 * (a - k)) : 0);
      var sonra = a < cikti.length ? cikti[a].s : once + .4 * (a - k);
      var adim = Math.max(.08, (sonra - once) / (a - k));
      for (var t = k; t < a; t++) { var s = once + (t - k) * adim; cikti[t].s = +s.toFixed(2); cikti[t].e = +(s + adim * .9).toFixed(2); }
      k = a - 1;
    }
    return altyaziTemizle(cikti);
  }

  var api = { altyaziParcala: altyaziParcala, altyaziTemizle: altyaziTemizle, altyaziHizala: altyaziHizala, altyaziBenzerlik: benzerlik };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  for (var ad in api) kok[ad] = api[ad];
})(typeof window !== 'undefined' ? window : this);
