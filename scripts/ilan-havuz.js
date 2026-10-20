// Danışman başına önceden yayında bekleyen boş ilan sayfaları (havuz). Danışman ilan oluşturunca Apps Script
// (IlanOnizleme.js) sıradaki kodu verir; sayfa zaten yayında olduğundan link hemen açılır, ilan verisi
// GitHub'dan (raw) okunur, Pages yayını beklenmez. Kullanım: ADET=20 node scripts/ilan-havuz.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const KOK = path.join(__dirname, "..");
const ADET = +process.env.ADET || 20, ALT = +process.env.ALT || 8;
const kisiler = JSON.parse(fs.readFileSync(path.join(KOK, "data", "ilan-danisman.json"), "utf8"));
const hp = path.join(KOK, "data", "ilan-havuz.json");
const havuz = fs.existsSync(hp) ? JSON.parse(fs.readFileSync(hp, "utf8")) : {};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
// kullanılan kodlar: sayfası artık hazır bekleyen değil (veri.json yazılmış). Workflow seyrek checkout
// yaptığından dosyaya değil git dizinine de bakılır.
let dolu = new Set();
try {
  dolu = new Set(require("child_process").execFileSync("git", ["ls-files", "ilan/*/veri.json"], { cwd: KOK, encoding: "utf8" })
    .split("\n").filter(Boolean).map((f) => f.split("/")[1]));
} catch (e) {}
const bos = (k) => !dolu.has(k) && !fs.existsSync(path.join(KOK, "ilan", k, "veri.json"));
let yeni = 0;
for (const [id, d] of Object.entries(kisiler)) {
  const l = (havuz[id] || []).filter(bos);   // kullanılanlar listeden çıkar
  havuz[id] = l;
  if (l.length >= ALT) continue;
  for (let i = 0; i < ADET; i++) {
    const kod = crypto.randomBytes(5).toString("hex").slice(0, 8);
    const dz = path.join(KOK, "ilan", kod);
    if (fs.existsSync(dz)) continue;
    fs.mkdirSync(dz, { recursive: true });
    const url = "https://dogusportal.com/ilan/" + kod + "/";
    fs.writeFileSync(path.join(dz, "index.html"), `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#050A30">
<title>${esc(d.ad)} | RE/MAX Doğuş</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="RE/MAX Doğuş">
<meta property="og:title" content="Sizin için seçtiğim ilan · ${esc(d.ad)}">
<meta property="og:description" content="${esc(d.unvan || "Gayrimenkul Danışmanı")} · RE/MAX Doğuş">
<meta property="og:image" content="https://raw.githubusercontent.com/dogusremax/dogusportal/main/ilan/${kod}/kapak.jpg">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/app-ikon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/ilan/ilan.css?v=3">
</head>
<body>
<div id="sayfa"></div>
<script>window.ILAN_KOD="${kod}";</script>
<script src="/ilan/ilan.js?v=3"></script>
</body>
</html>
`);
    l.push(kod); yeni++;
  }
  havuz[id] = l.filter(bos);
}
fs.writeFileSync(hp, JSON.stringify(havuz, null, 1));
console.log("yeni boş sayfa:", yeni);
