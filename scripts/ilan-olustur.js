// İlan önizleme sayfası üretir: ilan/<kod>/index.html + veri.json + kapak.jpg
// Girdi (ortam): GIRDI (link ya da ilan no), DANISMAN (id), KOD, VERI (isteğe bağlı: danışmanın
// telefonundaki "Doğuş İlan" düğmesinin topladığı JSON; varsa siteye gidilmez).
// Workflow: .github/workflows/ilan-olustur.yml (Danışman Takip Apps Script'i tetikler).
const fs = require("fs");
const path = require("path");
const O = require("./ilan-oku.js");

const KOK = path.join(__dirname, "..");
const UA_TARAYICI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_WA = "WhatsApp/2.23.20.0";   // sahibinden bağlantı önizleme botuna kısa sayfa ve arama sonucu veriyor

const KOD = String(process.env.KOD || "").trim();
const DANISMAN = String(process.env.DANISMAN || "").trim();
const GIRDI = String(process.env.GIRDI || "").trim();
const VERI = String(process.env.VERI || "").trim();
if (!/^[a-z0-9]{5,12}$/.test(KOD)) { console.error("KOD geçersiz"); process.exit(1); }
const DIZIN = path.join(KOK, "ilan", KOD);
fs.mkdirSync(DIZIN, { recursive: true });

class Hata extends Error { constructor(kod, mesaj) { super(mesaj); this.kod = kod; } }

async function getir(url, ua) {
  const r = await fetch(url, { headers: { "User-Agent": ua, "Accept-Language": "tr-TR,tr;q=0.9", Accept: "text/html,application/xhtml+xml" }, redirect: "follow" });
  return { kod: r.status, html: await r.text(), url: r.url };
}

async function oku() {
  if (VERI) {
    let v; try { v = JSON.parse(VERI); } catch (e) { throw new Error("veri okunamadı"); }
    return v;
  }
  const k = O.ilanKaynak_(GIRDI);
  if (!k) throw new Hata("girdi", "Link ya da ilan numarası anlaşılamadı.");
  if (k.site === "remax") {
    const r = await getir(k.url, UA_TARAYICI);
    if (r.kod !== 200) throw new Hata("bulunamadi", "remax.com.tr ilanı açılmadı (" + r.kod + ").");
    return O.ilanRemax_(r.html);
  }
  if (k.site === "emlakjet") {
    const r = await getir(k.url, UA_TARAYICI);
    if (r.kod !== 200) throw new Hata("bulunamadi", "emlakjet ilanı açılmadı (" + r.kod + ").");
    return O.ilanEmlakjet_(r.html);
  }
  if (k.site === "sahibinden") {
    if (!k.no) throw new Hata("girdi", "sahibinden ilan numarası bulunamadı.");
    const a = await getir("https://www.sahibinden.com/emlak?query_text=" + k.no, UA_WA);
    let v = a.kod === 200 ? O.ilanSahibindenArama_(a.html, k.no) : null;
    let detay = k.url;
    if (!detay && a.kod === 200) { const m = a.html.match(new RegExp('href="(/ilan/[^"]*-' + k.no + '/detay)"')); if (m) detay = "https://www.sahibinden.com" + m[1]; }
    if (detay) {
      const d = await getir(detay, UA_WA);
      if (d.kod === 200) v = O.ilanBirlestir_(v, O.ilanSahibindenDetay_(d.html));
    }
    if (!v) throw new Hata("sahibinden", "sahibinden bu ilanı vermedi. İlan yayından kalkmış olabilir; olmazsa Doğuş İlan düğmesini kullan.");
    v.kisa = true;   // yalnız kapak fotoğrafı ve temel bilgiler
    return v;
  }
  if (k.site === "hepsiemlak") {
    const r = await getir(k.url, UA_TARAYICI);
    if (r.kod !== 200) throw new Hata("hepsiemlak", "hepsiemlak sunuculardan gelen istekleri engelliyor. İlanı telefonda açıp Doğuş İlan düğmesine bas.");
    return O.ilanGenel_(r.html);
  }
  const r = await getir(k.url, UA_TARAYICI);
  if (r.kod !== 200) throw new Hata("bulunamadi", "Sayfa açılmadı (" + r.kod + ").");
  return O.ilanGenel_(r.html);
}

function paraYaz(f, p) {
  if (!f) return "";
  const s = Math.round(f).toLocaleString("tr-TR");
  return p === "USD" ? s + " $" : p === "EUR" ? s + " €" : p === "GBP" ? s + " £" : s + " TL";
}
function ozDeger(il, ...adlar) {
  for (const a of adlar) { const r = il.ozellik.find((x) => x[0].toLocaleLowerCase("tr-TR").startsWith(a)); if (r) return r[1]; }
  return "";
}
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

// Kapak: WhatsApp kartı için en fazla 1200 px jpg (sharp, workflow'da kurulur)
async function kapakYap(url) {
  const sharp = require("sharp");
  const denenecek = [url];
  if (/i\.remax\.com\.tr\/.*\.webp$/i.test(url)) denenecek.unshift(url.replace(/\.webp$/i, ".jpg"));
  for (const u of denenecek) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA_TARAYICI } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const ham = Buffer.from(await r.arrayBuffer());
      await sharp(ham).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 76, mozjpeg: true }).toFile(path.join(DIZIN, "kapak.jpg"));
      return "kapak.jpg";
    } catch (e) { console.log("kapak alınamadı:", u, e.message.slice(0, 200)); }
  }
  return "";
}

function sayfa(veri) {
  const il = veri.ilan, d = veri.danisman;
  const oda = ozDeger(il, "oda");
  const m2 = ozDeger(il, "m² (brüt)", "m² brüt", "brüt", "m²");
  const konum = [il.mahalle, il.ilce].filter(Boolean).join(", ");
  const baslikKisa = [il.islem, oda, il.tip].filter(Boolean).join(" ") || il.baslik;
  const ogBaslik = [baslikKisa, veri.fiyatYazi].filter(Boolean).join(" · ");
  const ogAciklama = [konum, m2 && (/m²/.test(m2) ? m2 : m2 + " m²"), d.ad + " · RE/MAX Doğuş"].filter(Boolean).join(" · ");
  const url = "https://dogusportal.com/ilan/" + KOD + "/";
  const resim = veri.kapak ? url + veri.kapak : (il.fotolar[0] || "https://dogusportal.com/assets/og-kare.png");
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#050A30">
<title>${esc(ogBaslik)} | RE/MAX Doğuş</title>
<meta name="description" content="${esc(ogAciklama)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="RE/MAX Doğuş">
<meta property="og:title" content="${esc(ogBaslik)}">
<meta property="og:description" content="${esc(ogAciklama)}">
<meta property="og:image" content="${esc(resim)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/app-ikon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/ilan/ilan.css?v=2">
</head>
<body>
<div id="sayfa"><noscript>${esc(il.baslik)} · ${esc(veri.fiyatYazi)} · ${esc(d.ad)} ${esc(d.tel)}</noscript></div>
<script>window.ILAN=${JSON.stringify(veri).replace(/</g, "\\u003c")};</script>
<script src="/ilan/ilan.js?v=2"></script>
</body>
</html>
`;
}

(async () => {
  const yaz = (o) => fs.writeFileSync(path.join(DIZIN, "veri.json"), JSON.stringify(o));
  try {
    const kisiler = JSON.parse(fs.readFileSync(path.join(KOK, "data", "ilan-danisman.json"), "utf8"));
    const d = kisiler[DANISMAN];
    if (!d) throw new Hata("danisman", "Danışman bulunamadı: " + DANISMAN);
    const ham = await oku();
    const il = O.ilanSon_(ham);
    if (!il.baslik && !il.fotolar.length) throw new Hata("bos", "İlandan bilgi çıkmadı. Link doğru mu?");
    const veri = {
      kod: KOD, tarih: new Date().toISOString(), kisa: !!ham.kisa,
      danisman: { id: DANISMAN, ad: d.ad, tel: d.tel, foto: d.foto, unvan: d.unvan || "Gayrimenkul Danışmanı" },
      ilan: il, fiyatYazi: paraYaz(il.fiyat, il.para), kapak: ""
    };
    if (il.fotolar[0]) veri.kapak = await kapakYap(il.fotolar[0]);
    fs.writeFileSync(path.join(DIZIN, "index.html"), sayfa(veri));
    yaz({ ok: true, kod: KOD, baslik: il.baslik, fiyatYazi: veri.fiyatYazi, islem: il.islem, tip: il.tip,
      oda: ozDeger(il, "oda"), konum: [il.mahalle, il.ilce].filter(Boolean).join(", "), foto: il.fotolar.length, kisa: veri.kisa });
    console.log("tamam", KOD, il.baslik, il.fotolar.length, "foto");
  } catch (e) {
    console.error(e);
    yaz({ ok: false, kod: KOD, hata: e.kod || "hata", mesaj: e.kod ? e.message : "Önizleme oluşturulamadı: " + e.message });
  }
})();
