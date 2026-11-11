/* Canlı Kıbrıs Yarışması — ortak istemci (sunucu ekranı + telefon).
   Arka uç: apps-script projects/kibris-katalog/Yarisma.js (CacheService panosu). */
(function () {
  var PROD = 'https://script.google.com/macros/s/AKfycbwnyN9V87vndjSd2KIohl2XO6h_gn72W8fGSvjHoaCjDETSbrAmOJQH3Dgx0OLrc8dO/exec';
  var qs = new URLSearchParams(location.search);
  var API = qs.get('api') || PROD; // ?api= yalnız yerel test için
  var ofs = 0, ofsOk = false;        // sunucu saati - yerel saat

  function saat(t0, sn) {
    if (!sn) return;
    var t1 = Date.now(), o = sn - (t0 + t1) / 2;
    if (!ofsOk || t1 - t0 < 800) { ofs = ofsOk ? (ofs * 0.6 + o * 0.4) : o; ofsOk = true; }
  }
  function zamanAsimi(ms) {
    var c = typeof AbortController !== 'undefined' ? new AbortController() : null;
    return { sinyal: c && c.signal, iptal: setTimeout(function () { c && c.abort(); }, ms) };
  }
  function get(par) {
    var u = API + '?' + new URLSearchParams(par).toString() + '&_=' + Date.now();
    var t0 = Date.now(), z = zamanAsimi(12000);
    return fetch(u, { cache: 'no-store', signal: z.sinyal }).then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(z.iptal); saat(t0, j.sn); return j; });
  }
  function post(b) {
    var t0 = Date.now(), z = zamanAsimi(15000);
    return fetch(API, { method: 'POST', body: JSON.stringify(b), signal: z.sinyal }).then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(z.iptal); saat(t0, j.sn); return j; });
  }
  window.YZ = {
    api: API,
    get: get, post: post,
    simdi: function () { return Date.now() + ofs; },
    rastgele: function (n, abc) {
      abc = abc || 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
      var a = new Uint32Array(n), s = ''; (window.crypto || window.msCrypto).getRandomValues(a);
      for (var i = 0; i < n; i++) s += abc[a[i] % abc.length];
      return s;
    },
    SEKIL: ['▲', '◆', '●', '■'],
    HARF: ['A', 'B', 'C', 'D']
  };
})();
