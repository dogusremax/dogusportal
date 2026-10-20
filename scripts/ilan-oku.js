/* İlan okuyucu: remax.com.tr, emlakjet, sahibinden (kısa sayfa) ve diğer sitelerin ilan sayfasını
 * ortak bir biçime çevirir. ilan-olustur.js (workflow ilan-olustur.yml) kullanır.
 * Kaynak sitenin adı, ilan sahibinin adı/telefonu ilnTemizle_ ile metinden silinir. */
/* ---------- yardımcılar ---------- */
function ilnHtmlCoz_(s) {
  return String(s == null ? "" : s)
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); })
    .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); });
}
function ilnDuz_(s) { return ilnHtmlCoz_(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
// HTML açıklamayı paragraflı düz metne çevirir
function ilnMetin_(h) {
  var s = String(h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h\d|li)>/gi, "\n").replace(/<li[^>]*>/gi, "• ");
  s = ilnHtmlCoz_(s.replace(/<[^>]+>/g, ""));
  return s.split("\n").map(function (x) { return x.replace(/[ \t]+/g, " ").trim(); })
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function ilnMeta_(h, ad) {
  var re = new RegExp('<meta[^>]+(?:property|name)="' + ad.replace(/[:.]/g, "\\$&") + '"[^>]*content="([^"]*)"', "i");
  var m = h.match(re); if (m) return ilnHtmlCoz_(m[1]);
  re = new RegExp('<meta[^>]+content="([^"]*)"[^>]*(?:property|name)="' + ad.replace(/[:.]/g, "\\$&") + '"', "i");
  m = h.match(re); return m ? ilnHtmlCoz_(m[1]) : "";
}
function ilnLdJson_(h) {
  var out = [], re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi, m;
  while ((m = re.exec(h))) {
    try {
      var j = JSON.parse(m[1]);
      (Array.isArray(j) ? j : [j]).forEach(function (x) { (x["@graph"] || [x]).forEach(function (y) { out.push(y); }); });
    } catch (e) {}
  }
  return out;
}
function ilnSayi_(s) { var d = String(s == null ? "" : s).replace(/[^\d]/g, ""); return d ? +d : 0; }
function ilnTekil_(a) { var g = {}; return a.filter(function (x) { if (!x || g[x]) return false; g[x] = 1; return true; }); }
function ilnCiftTekil_(a) { var g = {}; return a.filter(function (p) { var k = p[0]; if (!p[1] || g[k]) return false; g[k] = 1; return true; }); }

// Kaynak sitenin, ilan sahibinin ve iletişim bilgilerinin izlerini metinden siler
function ilnTemizle_(s, gizle) {
  s = String(s || "");
  s = s.replace(/https?:\/\/\S+|www\.\S+/gi, "");
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "");
  s = s.replace(/(\+?90[\s.-]?)?\(?0?\s?[2-5]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g, "");
  s = s.replace(/(^|\s)tek yetkili(den|dir)?\b|(^|\s)TEK YETKİLİ(DEN|DİR)?(?=\s|$)|(^|\s)yetkili ofis(ten)?\b/gi, " ");
  s = s.replace(/\b(sahibinden(\.com)?|hepsiemlak(\.com)?|emlakjet(\.com)?|re\s?\/?\s?max(\.com\.tr)?( türkiye)?|zingat)\b/gi, "");
  (gizle || []).forEach(function (g) {
    g = String(g || "").trim(); if (g.length < 4) return;
    s = s.split(g).join("").split(g.toLocaleUpperCase("tr-TR")).join("");
  });
  // iletişim çağrısı satırlarını at (danışmanın kendi butonları var)
  s = s.split("\n").filter(function (x) { return !/(iletişim|irtibat|arayınız|ara(yın)?\s*:|tel\s*:|gsm|whatsapp|portföy\s*no|ilan\s*no)/i.test(x) || x.length > 160; }).join("\n");
  return s.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------- girdiyi tanı ---------- */
function ilanKaynak_(girdi) {
  var g = String(girdi || "").trim();
  var url = (g.match(/https?:\/\/\S+/) || [""])[0].replace(/[),.]+$/, "");
  if (url) {
    if (/remax\.com\.tr/i.test(url)) { var p = url.match(/P\d{6,}/i); return { site: "remax", url: p ? "https://remax.com.tr/tr/portfoy/" + p[0].toUpperCase() : url }; }
    if (/sahibinden\.com/i.test(url)) { var n = url.match(/(\d{9,11})(?:\/detay)?(?:[/?#]|$)/); return { site: "sahibinden", url: url, no: n ? n[1] : "" }; }
    if (/emlakjet\.com/i.test(url)) return { site: "emlakjet", url: url };
    if (/hepsiemlak\.com/i.test(url)) return { site: "hepsiemlak", url: url };
    return { site: "diger", url: url };
  }
  var t = g.replace(/\s+/g, "");
  if (/^P\d{6,}$/i.test(t)) return { site: "remax", url: "https://remax.com.tr/tr/portfoy/" + t.toUpperCase() };
  if (/^\d{9,11}$/.test(t)) return { site: "sahibinden", url: "", no: t };
  if (/^\d{5,8}$/.test(t)) return { site: "emlakjet", url: "https://www.emlakjet.com/ilan/" + t };
  return null;
}

/* ---------- site ayrıştırıcıları: hepsi aynı biçimi döndürür ----------
 * {baslik, islem, tip, fiyat, para, il, ilce, mahalle, ozellik:[[ad,deger]], aciklama, fotolar:[], gizle:[]} */
var ILN_ATLA_RE_ = /^(portföy no|ilan no|ilan numarası|yayınlanma tarihi|ilan tarihi|ilan güncelleme tarihi|güncelleme tarihi|ada|parsel|pafta|ada no|parsel no|kategori|emlak tipi|kimden)$/;
var ILN_ATLA_ = { test: function (k) { return ILN_ATLA_RE_.test(String(k).trim().toLocaleLowerCase("tr-TR")); } };

function ilanRemax_(h) {
  var ld = ilnLdJson_(h).filter(function (x) { return x["@type"] === "RealEstateListing"; })[0] || {};
  var rows = [], re = /property-detail-label">([\s\S]*?)<\/div><div class="property-detail-value">([\s\S]*?)<\/div>/g, m;
  while ((m = re.exec(h))) rows.push([ilnDuz_(m[1]), ilnDuz_(m[2])]);
  rows = ilnCiftTekil_(rows);
  var tipIslem = (rows.filter(function (r) { return r[0] === "Emlak Tipi"; })[0] || [])[1] || "";
  var ti = tipIslem.split("/").map(function (x) { return x.trim(); });
  var aciklama = "";
  var d = h.indexOf('description-content">');
  if (d > 0) { var son = h.indexOf("</div>", d); aciklama = ilnMetin_(h.slice(d + 21, son)); }
  if (!aciklama) aciklama = ilnHtmlCoz_(ld.description || "");
  var konum = function (k) { var x = h.match(new RegExp('\\\\?"' + k + '\\\\?":\\\\?"([^"\\\\]+)')); return x ? x[1] : ""; };
  var il = (konum("cityName") || (ld.address || {}).addressRegion || "").replace(/\s+(Anadolu|Avrupa)$/i, "");
  var ilce = konum("townName");
  var mah = konum("neighborhoodName") || (ld.address || {}).addressLocality || "";
  var gizle = [];
  var ofis = h.match(/\\?"officeName\\?":\\?"([^"\\]+)/); if (ofis) gizle.push(ofis[1]);
  var ajan = h.match(/\\?"(?:consultantName|agentName|fullName)\\?":\\?"([^"\\]+)/); if (ajan) gizle.push(ajan[1]);
  return {
    baslik: ilnHtmlCoz_(ld.name || ilnMeta_(h, "og:title").replace(/\s*-\s*RE\/MAX Türkiye$/i, "")),
    islem: ti[1] || "", tip: ti[0] || "",
    fiyat: ((ld.offers || {}).price) || 0, para: ((ld.offers || {}).priceCurrency) || "TRY",
    il: il, ilce: ilce, mahalle: mah,
    ozellik: rows.filter(function (r) { return !ILN_ATLA_.test(r[0]); }),
    aciklama: aciklama,
    fotolar: ilnTekil_((ld.image || []).concat(ilnMeta_(h, "og:image") ? [ilnMeta_(h, "og:image")] : [])),
    gizle: gizle
  };
}

function ilanEmlakjet_(h) {
  var ld = ilnLdJson_(h);
  var urun = ld.filter(function (x) { return x["@type"] === "Product"; })[0] || {};
  var rel = ld.filter(function (x) { return x["@type"] === "RealEstateListing"; })[0] || {};
  var ad = rel.address || {};
  var rows = [], re = /<p class="text-sm leading-tight font-semibold[^"]*">([^<]+)<\/p><p class="text-xs leading-tight[^"]*">([^<]+)<\/p>/g, m;
  while ((m = re.exec(h))) rows.push([ilnHtmlCoz_(m[2]).trim(), ilnHtmlCoz_(m[1]).trim()]);
  ((rel.itemOffered || {}).additionalProperty || []).forEach(function (p) { rows.push([p.name, String(p.value)]); });
  rows = ilnCiftTekil_(rows).map(function (r) { return r[0] === "Brüt" ? ["m² (Brüt)", r[1]] : r[0] === "Net" ? ["m² (Net)", r[1]] : r; });
  var kat = (rows.filter(function (r) { return r[0] === "Kategori"; })[0] || [])[1] || "";
  var km = kat.match(/^(Satılık|Kiralık|Devren Satılık|Günlük Kiralık)\s+(.*)$/i) || [];
  var ofis = (ilnMeta_(h, "og:title").split(/\s+(?=\S+ \S+ \S+ Mahallesi)/)[0] || "");
  return {
    baslik: ilnHtmlCoz_(urun.name || ""), islem: km[1] || "", tip: km[2] || "",
    fiyat: ((urun.offers || {}).price) || 0, para: ((urun.offers || {}).priceCurrency) || "TRY",
    il: ad.addressRegion || "", ilce: ad.addressLocality || "", mahalle: ad.streetAddress || "",
    ozellik: rows.filter(function (r) { return !ILN_ATLA_.test(r[0]); }),
    aciklama: ilnHtmlCoz_(urun.description || ""),
    fotolar: ilnTekil_(urun.image || []),
    gizle: [ofis].filter(function (x) { return x && x.length < 60; })
  };
}

// sahibinden: arama sonucu satırı (fiyat, m², oda, il/ilçe, kapak) + kısa detay sayfası (mahalle)
function ilanSahibindenArama_(h, no) {
  var re = new RegExp('<tr[^>]*data-id="' + no + '"[^>]*>([\\s\\S]*?)</tr>'), m = h.match(re);
  if (!m) return null;
  var r = m[1];
  var baslik = ilnDuz_((r.match(/class=" ?classifiedTitle ?"[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
  var attrs = []; var ar = /searchResultsAttributeValue">([\s\S]*?)<\/td>/g, a;
  while ((a = ar.exec(r))) attrs.push(ilnDuz_(a[1]));
  var fiyatYazi = ilnDuz_((r.match(/searchResultsPriceValue">([\s\S]*?)<\/td>/) || [])[1]);
  var konum = ((r.match(/searchResultsLocationValue[^>]*>([\s\S]*?)<\/td>/) || [])[1] || "").split(/<br\s*\/?>/i).map(ilnDuz_);
  var kapak = (r.match(/https:\/\/i\d\.shbdn\.com\/photos\/[^"]+?\.jpg/) || [""])[0].replace(/\/(lthmb|thmb|x5|big)_/, "/");
  var magaza = (r.match(/class="titleIcon store-icon"[^>]*title="([^"]+)"/) || [])[1];
  var oz = [];
  if (attrs[0]) oz.push(["m² (Brüt)", attrs[0]]);
  if (attrs[1]) oz.push(["Oda Sayısı", attrs[1]]);
  return {
    baslik: baslik, fiyat: ilnSayi_(fiyatYazi), para: /USD|\$/.test(fiyatYazi) ? "USD" : /EUR|€/.test(fiyatYazi) ? "EUR" : /GBP|£/.test(fiyatYazi) ? "GBP" : "TRY",
    il: konum[0] || "", ilce: konum[1] || "", ozellik: oz, fotolar: kapak ? [kapak] : [],
    gizle: magaza ? [ilnHtmlCoz_(magaza)] : []
  };
}
function ilanSahibindenDetay_(h) {
  var t = ilnMeta_(h, "og:title");
  var d = ilnMeta_(h, "description");
  var km = t.match(/ - (Satılık|Kiralık|Devren Satılık|Günlük Kiralık) ([^-]+?) İlanları/i) || [];
  var mah = (d.match(/^(.+?) (Mh\.|Mah\.)/) || [])[1];
  var img = ilnMeta_(h, "og:image");
  return {
    baslik: t.replace(/ - (Satılık|Kiralık|Devren Satılık|Günlük Kiralık).*$/i, "").trim(),
    islem: km[1] || "", tip: (km[2] || "").trim(),
    mahalle: mah ? mah + " Mah." : "",
    fotolar: img ? [img.replace(/\/(lthmb|thmb|x5|big)_/, "/")] : []
  };
}

// hepsiemlak ve tanınmayan siteler: sayfadaki ortak etiketler (ld+json, og)
function ilanGenel_(h) {
  var ld = ilnLdJson_(h).filter(function (x) { return /RealEstateListing|Product|Residence|Apartment|House|Offer/.test(String(x["@type"])); })[0] || {};
  var img = ld.image ? (Array.isArray(ld.image) ? ld.image : [ld.image]) : [];
  img = img.map(function (x) { return typeof x === "string" ? x : x.url; });
  if (ilnMeta_(h, "og:image")) img.push(ilnMeta_(h, "og:image"));
  var ad = ld.address || {};
  return {
    baslik: ilnHtmlCoz_(ld.name || ilnMeta_(h, "og:title")), fiyat: +((ld.offers || {}).price || 0), para: (ld.offers || {}).priceCurrency || "TRY",
    il: ad.addressRegion || "", ilce: ad.addressLocality || "", mahalle: ad.streetAddress || "",
    ozellik: [], aciklama: ilnHtmlCoz_(ld.description || ilnMeta_(h, "og:description")), fotolar: ilnTekil_(img), gizle: []
  };
}

function ilanBirlestir_(a, b) {
  var o = {};
  [a || {}, b || {}].forEach(function (x) { Object.keys(x).forEach(function (k) {
    var v = x[k];
    if (Array.isArray(v)) o[k] = (o[k] || []).concat(v);
    else if (v !== "" && v != null && v !== 0) o[k] = v;
    else if (!(k in o)) o[k] = v;
  }); });
  return o;
}

// BÜYÜK HARFLE yazılmış başlığı Başlık Düzenine çevirir
function ilnBuyukHarfDuzelt_(s) {
  var h = String(s || "").replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
  if (!h || h.replace(/[^A-ZÇĞİÖŞÜ]/g, "").length / h.length < 0.7) return s;
  return s.toLocaleLowerCase("tr-TR").replace(/(^|[\s(\/-])(\S)/g, function (_, a, b) { return a + b.toLocaleUpperCase("tr-TR"); })
    .replace(/\b(\d\+\d)\b/g, "$1");
}

// Ayrıştırılmış ilanı yayına hazır hale getirir: metinleri temizler, eksikleri doldurur
function ilanSon_(v) {
  var gizle = v.gizle || [];
  var son = {
    baslik: ilnBuyukHarfDuzelt_(ilnTemizle_(String(v.baslik || "").replace(/\s+-\s+[^-]*İlanları.*$/i, "").replace(/\s+-\s+RE\/MAX Türkiye$/i, ""), gizle).replace(/\s*[!]{2,}/g, "!")).slice(0, 140),
    islem: v.islem || "", tip: v.tip || "",
    fiyat: +v.fiyat || 0, para: v.para || "TRY",
    il: v.il || "", ilce: v.ilce || "", mahalle: v.mahalle || "",
    ozellik: ilnCiftTekil_((v.ozellik || []).map(function (r) { return [String(r[0]).trim().replace(/^m2\b/i, "m²"), ilnTemizle_(String(r[1]), gizle)]; }))
      .filter(function (r) { return r[1] && !ILN_ATLA_.test(r[0]); }).slice(0, 30),
    aciklama: ilnTemizle_(v.aciklama || "", gizle).slice(0, 4000),
    fotolar: ilnTekil_((v.fotolar || []).map(function (u) { return String(u).replace(/(shbdn\.com\/photos\/\d+\/\d+\/\d+\/)(?:(?:lthmb|thmb|x5|big)_)?/, "$1big_"); })).filter(function (u) { return /^https:\/\//.test(u); }).slice(0, 40)
  };
  if (!son.islem) { var m = (son.baslik + " " + son.aciklama).match(/\b(satılık|kiralık)\b/i); if (m) son.islem = m[1].charAt(0).toLocaleUpperCase("tr-TR") + m[1].slice(1).toLowerCase(); }
  return son;
}

if (typeof module !== "undefined") module.exports = { ilanKaynak_: ilanKaynak_, ilanRemax_: ilanRemax_, ilanEmlakjet_: ilanEmlakjet_, ilanSahibindenArama_: ilanSahibindenArama_, ilanSahibindenDetay_: ilanSahibindenDetay_, ilanGenel_: ilanGenel_, ilanBirlestir_: ilanBirlestir_, ilanSon_: ilanSon_, ilnTemizle_: ilnTemizle_ };
