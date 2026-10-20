/* İlan önizleme sayfasını window.ILAN verisinden çizer (veri: scripts/ilan-olustur.js).
 * Hazır bekleyen sayfada (window.ILAN_KOD, havuz) veri yayını beklemeden GitHub'dan (raw) okunur. */
var ILAN_RAW = "https://raw.githubusercontent.com/dogusremax/dogusportal/main/ilan/";
(function () {
  if (window.ILAN) return ilanCiz(window.ILAN);
  var kod = window.ILAN_KOD, bas = Date.now();
  document.getElementById("sayfa").innerHTML = '<div class="hazirlaniyor"><img src="/assets/dogus-logo.webp" alt="RE/MAX Doğuş"><p>İlan hazırlanıyor…</p></div>';
  (function dene() {
    fetch(ILAN_RAW + kod + "/ilan.json?cb=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) { if (v) ilanCiz(v); else if (Date.now() - bas < 300000) setTimeout(dene, 2500); })
      .catch(function () { if (Date.now() - bas < 300000) setTimeout(dene, 3000); });
  })();
})();
function ilanCiz(V) {
  var il = V.ilan, d = V.danisman;
  var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var oz = function () { for (var i = 0; i < arguments.length; i++) { var a = arguments[i]; for (var j = 0; j < il.ozellik.length; j++) if (il.ozellik[j][0].toLocaleLowerCase("tr-TR").indexOf(a) === 0) return il.ozellik[j][1]; } return ""; };
  var tel = String(d.tel || "").replace(/\D/g, "").replace(/^0/, "90");
  var konum = [il.mahalle, il.ilce, il.il].filter(Boolean).join(", ");
  var waMetin = "Merhaba, " + (il.baslik || "ilan") + " hakkında bilgi almak istiyorum.\n" + location.href.split("?")[0];
  var wa = "https://wa.me/" + tel + "?text=" + encodeURIComponent(waMetin);
  var foto = "/assets/ekip/yuz/" + d.foto + ".webp";
  var fotolar = il.fotolar.length ? il.fotolar : [];

  var m2 = oz("m² (brüt)", "m² brüt", "brüt", "m²");
  var kutucuk = [
    [oz("oda"), "Oda"],
    [m2 && (/m²/.test(m2) ? m2.replace(/\s*m²/, "") : m2), "m² Brüt"],
    [oz("bulunduğu kat", "kat"), "Kat"],
    [oz("bina yaşı", "bina yapım yılı", "yapım yılı"), /yapım/.test(il.ozellik.map(function (x) { return x[0].toLocaleLowerCase("tr-TR"); }).join("|")) && !oz("bina yaşı") ? "Yapım Yılı" : "Bina Yaşı"]
  ].filter(function (x) { return x[0]; });

  var pin = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  var telIk = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
  var waIk = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4z"/></svg>';

  var seritHtml = function () { return fotolar.map(function (u, i) { return '<img src="' + e(u) + '" alt="Fotoğraf ' + (i + 1) + '" loading="' + (i < 2 ? "eager" : "lazy") + '" referrerpolicy="no-referrer" data-i="' + i + '">'; }).join(""); };
  var h = "";
  h += '<header class="ust"><img class="logo" src="/assets/dogus-logo.webp" onerror="this.onerror=null;this.src=\'/assets/dogus-logo.png\'" alt="RE/MAX Doğuş"><span class="remax">RE/MAX Doğuş</span></header>';
  h += '<main class="kap">';
  if (fotolar.length) {
    h += '<div class="galeri"><div class="seritler" id="serit">' + seritHtml() + '</div>';
    if (il.islem) h += '<span class="etiket">' + e(il.islem) + '</span>';
    if (fotolar.length > 1) h += '<span class="sayac" id="sayac">1 / ' + fotolar.length + '</span><button class="ok sol" data-y="-1" aria-label="Önceki">‹</button><button class="ok sag" data-y="1" aria-label="Sonraki">›</button>';
    h += '</div>';
  }
  h += '<section class="kart">';
  if (V.fiyatYazi) h += '<div class="fiyat">' + e(V.fiyatYazi) + '</div>';
  h += '<h1>' + e(il.baslik) + '</h1>';
  if (konum) h += '<div class="konum">' + pin + e(konum) + '</div>';
  if (kutucuk.length) h += '<div class="ozet">' + kutucuk.map(function (k) { return '<div><b>' + e(k[0]) + '</b><span>' + e(k[1]) + '</span></div>'; }).join("") + '</div>';
  h += '</section>';
  var tablo = il.ozellik.slice();
  if (il.islem || il.tip) tablo.unshift(["İlan Türü", [il.islem, il.tip].filter(Boolean).join(" ")]);
  if (tablo.length > 2) h += '<section class="kart"><h2>Özellikler</h2><div class="tablo">' + tablo.map(function (r) { return '<div><span>' + e(r[0]) + '</span><b>' + e(r[1]) + '</b></div>'; }).join("") + '</div></section>';
  if (il.aciklama) h += '<section class="kart"><h2>Açıklama</h2><div class="aciklama" id="aciklama">' + e(il.aciklama) + '</div><button class="devam" id="devam" hidden>Devamını oku</button></section>';
  h += '<section class="kart"><h2>İlan danışmanı</h2><div class="danisman"><img src="' + foto + '" alt="' + e(d.ad) + '"><div><div class="ad">' + e(d.ad) + '</div><div class="unvan">' + e(d.unvan) + '</div><div class="ofis">RE/MAX DOĞUŞ</div></div></div>';
  h += '<div class="dugmeler"><a class="dg ara" href="tel:+' + tel + '">' + telIk + 'Ara</a><a class="dg wa" href="' + wa + '" target="_blank" rel="noopener">' + waIk + 'WhatsApp</a></div></section>';
  h += '<footer class="son"><img src="/assets/dogus-logo-koyu.webp" onerror="this.onerror=null;this.src=\'/assets/dogus-logo-koyu.png\'" alt="RE/MAX Doğuş">RE/MAX Doğuş · Fikirtepe, Kadıköy / İstanbul<br>Her ofis bağımsız olarak sahiplenilmiş ve işletilmektedir.</footer>';
  h += '</main>';
  h += '<div class="alt"><div class="ic"><img src="' + foto + '" alt=""><div class="kim"><b>' + e(d.ad) + '</b>RE/MAX Doğuş</div><a class="dg ara" href="tel:+' + tel + '" aria-label="Ara">' + telIk + '</a><a class="dg wa" href="' + wa + '" target="_blank" rel="noopener">' + waIk + 'WhatsApp</a></div></div>';
  h += '<div class="kutu" id="kutu"><button class="kapat" id="kapat" aria-label="Kapat">×</button><div class="seritler" id="kserit">' + seritHtml() + '</div><span class="sayac" id="ksayac"></span></div>';
  document.getElementById("sayfa").innerHTML = h;

  var $ = function (id) { return document.getElementById(id); };
  var bagla = function (serit, sayac) {
    if (!serit) return function () {};
    var guncelle = function () { var i = Math.round(serit.scrollLeft / serit.clientWidth); if (sayac) sayac.textContent = (i + 1) + " / " + fotolar.length; };
    serit.addEventListener("scroll", function () { requestAnimationFrame(guncelle); }, { passive: true });
    return function (i) { serit.scrollTo({ left: i * serit.clientWidth }); guncelle(); };
  };
  var git = bagla($("serit"), $("sayac"));
  var kgit = bagla($("kserit"), $("ksayac"));
  document.querySelectorAll(".ok").forEach(function (b) { b.onclick = function () { var s = $("serit"); s.scrollBy({ left: +b.dataset.y * s.clientWidth, behavior: "smooth" }); }; });
  if ($("serit")) $("serit").addEventListener("click", function (ev) {
    var i = ev.target.dataset && ev.target.dataset.i; if (i == null) return;
    $("kutu").classList.add("acik"); document.body.style.overflow = "hidden"; requestAnimationFrame(function () { kgit(+i); });
  });
  $("kapat").onclick = function () { $("kutu").classList.remove("acik"); document.body.style.overflow = ""; };
  // kırık fotoğrafları (kaynakta silinmiş) gizle
  document.querySelectorAll(".seritler img").forEach(function (im) {
    im.onerror = function () {
      // yayına yeni giren fotoğraf henüz sitede yoksa GitHub'dan; o da yoksa gizle
      var u = im.getAttribute("src");
      if (u.indexOf("https://dogusportal.com/ilan/") === 0) im.src = ILAN_RAW + u.slice(29); else im.remove();
    };
  });
  // görüntülenme sayacı: danışmanın kendi açtıkları sayılmaz (ilan-olustur.html listesi aynı tarayıcıda)
  try {
    var benim = JSON.parse(localStorage.getItem("ilan_liste") || "[]").some(function (x) { return x.kod === V.kod; });
    var cihaz = localStorage.getItem("ilan_cihaz") || Math.random().toString(36).slice(2, 12);
    localStorage.setItem("ilan_cihaz", cihaz);
    if (!benim && navigator.sendBeacon) navigator.sendBeacon("https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec",
      JSON.stringify({ action: "ilanGor", kod: V.kod, d: d.id, cihaz: cihaz }));
  } catch (err) {}
  var ac = $("aciklama");
  if (ac && ac.scrollHeight > 230) { ac.classList.add("kisalt"); $("devam").hidden = false; $("devam").onclick = function () { ac.classList.remove("kisalt"); this.remove(); }; }
}
