/* "Doğuş İlan" düğmesi: danışman ilanı kendi telefonunun tarayıcısında açıp bu yer imine dokunur.
 * Kod ilan sayfasında çalışır, fotoğrafları ve bilgileri toplar, dogusportal.com/ilan-olustur.html'i
 * verilerle (adresin # kısmında, sunucuya gitmez) açar. sahibinden ve hepsiemlak sunuculardan gelen
 * istekleri engellediği için tam veri ancak böyle, danışmanın kendi tarayıcısından alınabiliyor.
 * ilan-olustur.html bu dosyayı okuyup "javascript:" yer imine çevirir; tek satırlık yorum kullanma. */
(function () {
  var D = document, H = location.hostname, metin = function (el) { return el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : ""; };
  var hepsi = function (s, k) { return Array.prototype.slice.call((k || D).querySelectorAll(s)); };
  var meta = function (a) { var m = D.querySelector('meta[property="' + a + '"],meta[name="' + a + '"]'); return m ? m.getAttribute("content") || "" : ""; };
  var v = { kaynak: location.href, baslik: "", fiyat: 0, para: "TRY", il: "", ilce: "", mahalle: "", islem: "", tip: "", ozellik: [], aciklama: "", fotolar: [], gizle: [] };

  /* ld+json */
  hepsi('script[type="application/ld+json"]').forEach(function (s) {
    try {
      var j = JSON.parse(s.textContent); (Array.isArray(j) ? j : [j]).forEach(function (x) {
        (x["@graph"] || [x]).forEach(function (y) {
          if (!/RealEstateListing|Product|Residence|Apartment|House|SingleFamilyResidence|Offer/.test(String(y["@type"]))) return;
          v.baslik = v.baslik || y.name || ""; v.aciklama = v.aciklama || y.description || "";
          var o = y.offers || {}; if (o.price && !v.fiyat) { v.fiyat = +o.price; v.para = o.priceCurrency || "TRY"; }
          var a = y.address || {}; v.il = v.il || a.addressRegion || ""; v.ilce = v.ilce || a.addressLocality || "";
          [].concat(y.image || []).forEach(function (u) { v.fotolar.push(typeof u === "string" ? u : u.url); });
        });
      });
    } catch (e) {}
  });

  /* başlık, fiyat */
  var h1 = D.querySelector(".classifiedDetailTitle h1, h1");
  v.baslik = metin(h1) || v.baslik || meta("og:title");
  if (!v.fiyat) {
    var fy = hepsi('.classified-price-wrapper, .classifiedInfo h3, [class*="price"], [class*="Price"], [class*="fiyat"]')
      .map(metin).filter(function (t) { return /\d[\d.]{3,}\s*(TL|₺|USD|\$|EUR|€|GBP|£)/.test(t); })[0];
    if (fy) {
      var m = fy.match(/(\d[\d.]{3,})\s*(TL|₺|USD|\$|EUR|€|GBP|£)/);
      v.fiyat = +m[1].replace(/\./g, ""); v.para = /USD|\$/.test(m[2]) ? "USD" : /EUR|€/.test(m[2]) ? "EUR" : /GBP|£/.test(m[2]) ? "GBP" : "TRY";
    }
  }

  /* özellikler: etiket/değer çiftleri */
  var cift = function (k, d) { k = (k || "").replace(/:$/, "").trim(); d = (d || "").trim(); if (k && d && k.length < 40 && d.length < 80 && k !== d) v.ozellik.push([k, d]); };
  hepsi(".classifiedInfoList li, ul.classifiedInfoList li").forEach(function (li) { cift(metin(li.querySelector("strong")), metin(li.querySelector("span"))); });
  if (!v.ozellik.length) {
    hepsi("li, tr, dl > div").forEach(function (el) {
      var c = Array.prototype.slice.call(el.children).filter(function (x) { return metin(x); });
      if (c.length === 2 && !el.querySelector("li, a[href*='ilan'], img")) cift(metin(c[0]), metin(c[1]));
    });
    hepsi("dt").forEach(function (dt) { var dd = dt.nextElementSibling; if (dd && dd.tagName === "DD") cift(metin(dt), metin(dd)); });
  }
  var oz = function (re) { var r = v.ozellik.filter(function (x) { return re.test(x[0]); })[0]; return r ? r[1] : ""; };
  var emlakTipi = oz(/^emlak tipi$/i);
  if (emlakTipi) { var p = emlakTipi.match(/(Satılık|Kiralık|Devren Satılık|Günlük Kiralık)\s*(.*)/i); if (p) { v.islem = p[1]; v.tip = p[2]; } }

  /* konum (sahibinden: başlığın altındaki il / ilçe / mahalle linkleri) */
  var kl = hepsi(".classifiedInfo h2 a, .classified-location a, [class*='location'] a, [class*='Location'] a").map(metin).filter(Boolean);
  if (kl.length >= 2) { v.il = kl[0]; v.ilce = kl[1]; v.mahalle = kl[2] || ""; }

  /* açıklama */
  var ac = D.querySelector("#classifiedDescription, .classifiedDescription, [class*='description-content'], [class*='Description'], [class*='description']");
  var acMetin = ac ? (ac.innerText || "").trim() : "";
  if (acMetin.length > (v.aciklama || "").length) v.aciklama = acMetin;
  v.aciklama = String(v.aciklama || meta("og:description")).slice(0, 6000);

  /* ilan sahibi / mağaza adı (sayfada gösterilmesin diye) */
  hepsi(".classifiedOtherBoxes .username-info-area h5, .storeInfo h3, [class*='store-name'], [class*='storeName'], [class*='agent-name'], [class*='owner-name'], [class*='firm-name']")
    .forEach(function (el) { var t = metin(el); if (t && t.length < 60) v.gizle.push(t); });

  /* fotoğraflar: sayfadaki tüm görsel adresleri, ilan fotoğraflarının sunucusundakiler */
  var urls = [];
  hepsi("img, source, a[href]").forEach(function (el) {
    ["src", "data-src", "data-source", "data-lazy", "data-original", "href"].forEach(function (a) { var x = el.getAttribute(a); if (x) urls.push(x); });
    var ss = el.getAttribute("srcset") || el.getAttribute("data-srcset"); if (ss) ss.split(",").forEach(function (p) { urls.push(p.trim().split(" ")[0]); });
  });
  (D.documentElement.innerHTML.match(/https?:\\?\/\\?\/[^"'\s()<>]+?\.(?:jpe?g|webp|png|avif)/gi) || []).forEach(function (u) { urls.push(u.replace(/\\\//g, "/")); });
  urls = urls.map(function (u) { try { return new URL(u, location.href).href; } catch (e) { return ""; } })
    .filter(function (u) { return /^https:/.test(u) && /\.(jpe?g|webp|png|avif)(\?|$)/i.test(u) && !/logo|icon|avatar|profile|banner|badge|sprite|placeholder|store|harita|map|flag|emoji|svg/i.test(u); });
  var ilanNo = (location.pathname.match(/(\d{9,11})(?:\/detay)?\/?$/) || [])[1];
  if (/sahibinden\.com$/.test(H)) {
    urls = urls.filter(function (u) { return /shbdn\.com\/photos\//.test(u) && (!ilanNo || u.indexOf("_" + ilanNo) > 0 || u.indexOf("/" + ilanNo) > 0); })
      .map(function (u) { return u.replace(/\/(?:lthmb|thmb|x5|x16|big|mid)_/, "/big_").replace(/\.avif$/, ".jpg").replace(/(\/photos\/\d+\/\d+\/\d+\/)(?!big_)/, "$1big_"); });
  } else if (v.fotolar.length) {
    urls = [];   /* ld+json fotoğrafları yeterli; sayfadaki benzer ilanlar karışmasın */
  } else {
    /* en büyük görsellerin sunucusu = ilan fotoğraflarının sunucusu */
    var buyuk = hepsi("img").filter(function (im) { return (im.naturalWidth || im.width) >= 300; }).map(function (im) { try { return new URL(im.currentSrc || im.src).hostname; } catch (e) { return ""; } });
    var say = {}; buyuk.forEach(function (h) { if (h) say[h] = (say[h] || 0) + 1; });
    var sunucu = Object.keys(say).sort(function (a, b) { return say[b] - say[a]; })[0];
    if (sunucu) urls = urls.filter(function (u) { return new URL(u).hostname === sunucu; });
  }
  var gor = {}, tek = [];
  v.fotolar.concat(urls).forEach(function (u) {
    if (!u) return;
    var anahtar = u.replace(/\?.*$/, "").replace(/\/(?:lthmb|thmb|x5|x16|big|mid)_/, "/").replace(/\.(jpe?g|webp|png|avif)$/i, "").replace(/\/(?:\d{2,4}x\d{2,4}|[SMLX]{1,2})\//, "/");
    if (gor[anahtar]) return; gor[anahtar] = 1; tek.push(u);
  });
  v.fotolar = tek.slice(0, 40);

  if (!v.baslik && !v.fotolar.length) { alert("Bu sayfada ilan bulunamadı. İlanın kendi sayfasını açıp tekrar dene."); return; }
  var veri = JSON.stringify(v);
  if (veri.length > 55000) { v.aciklama = v.aciklama.slice(0, 2500); veri = JSON.stringify(v); }
  var hedef = "https://dogusportal.com/ilan-olustur.html?cb=" + Date.now() + "#v=" + encodeURIComponent(veri);
  var w = window.open(hedef, "_blank");
  if (!w) location.href = hedef;
})();
