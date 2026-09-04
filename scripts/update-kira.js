#!/usr/bin/env node
/**
 * TCMB EVDS'ten TÜFE endeksini çeker, kira artışında kullanılan
 * "12 aylık ortalamalara göre değişim" oranını hesaplar ve
 * kira-artis.html içindeki veri listesini günceller.
 *
 * Çalıştırma: EVDS_API_KEY=xxxx node scripts/update-kira.js
 * Test için:  node scripts/update-kira.js --dry
 */
const fs = require('fs');
const path = require('path');

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const SERIES = process.env.EVDS_SERIES || 'TP.FG.J0';   // TÜFE genel endeks (2003=100)
const KEY = process.env.EVDS_API_KEY;
const HTML = path.join(__dirname, '..', 'kira-artis.html');
const LOG  = path.join(__dirname, '..', 'data', 'kira-artis.json');
const DRY  = process.argv.includes('--dry');

if (!KEY) { console.error('EVDS_API_KEY tanımlı değil.'); process.exit(1); }

const iki = n => String(n).padStart(2, '0');

async function istek(url, headers) {
  const r = await fetch(url, { headers: Object.assign({
    'User-Agent': 'Mozilla/5.0 (compatible; dogus-bot/1.0)',
    'Accept': 'application/json'
  }, headers || {}) });
  const govde = await r.text();
  return { ok: r.ok, status: r.status, govde };
}

async function evds() {
  const bugun = new Date();
  const bas = new Date(bugun.getFullYear() - 4, bugun.getMonth(), 1);
  const fmt = d => `${iki(d.getDate())}-${iki(d.getMonth() + 1)}-${d.getFullYear()}`;
  const temel = `https://evds2.tcmb.gov.tr/service/evds/series=${SERIES}`
              + `&startDate=${fmt(bas)}&endDate=${fmt(bugun)}&type=json`;

  // EVDS anahtarı hem başlıkta hem adres satırında kabul edebiliyor; ikisini de dene.
  const denemeler = [
    { ad: 'header',      url: temel,                                 headers: { key: KEY } },
    { ad: 'query param', url: `${temel}&key=${encodeURIComponent(KEY)}`, headers: {} }
  ];

  let son = null;
  for (const d of denemeler) {
    const c = await istek(d.url, d.headers);
    son = { ...c, ad: d.ad };
    if (!c.ok) { console.error(`[${d.ad}] HTTP ${c.status}`); continue; }
    let j;
    try { j = JSON.parse(c.govde); }
    catch (e) { console.error(`[${d.ad}] JSON değil. İlk 400 karakter:\n` + c.govde.slice(0, 400)); continue; }
    const items = j.items || j.Items || [];
    if (!items.length) { console.error(`[${d.ad}] items boş. Yanıt:\n` + JSON.stringify(j).slice(0, 400)); continue; }

    console.log(`[${d.ad}] başarılı — ${items.length} kayıt. Alanlar: ${Object.keys(items[0]).join(', ')}`);
    const alan = Object.keys(items[0]).find(k => !['Tarih','UNIXTIME','YEARWEEK'].includes(k));
    const seri = items.map(it => {
        const [y, m] = String(it.Tarih).split('-').map(Number);
        const v = parseFloat(String(it[alan]).replace(',', '.'));
        return { y, m, v };
      })
      .filter(x => x.y && x.m && !isNaN(x.v))
      .sort((a, b) => (a.y * 12 + a.m) - (b.y * 12 + b.m));
    if (seri.length < 24) throw new Error(`Yeterli veri yok (${seri.length} ay, en az 24 gerekli).`);
    return seri;
  }

  throw new Error('EVDS\'ten veri alınamadı. Son yanıt (' + son.ad + ', HTTP ' + son.status + '):\n'
    + String(son.govde).slice(0, 600));
}

// Resmî formül: son 12 ayın endeks ortalaması / önceki 12 ayın ortalaması - 1
function onIkiAylikOrtalama(seri) {
  const ort = a => a.reduce((t, x) => t + x.v, 0) / a.length;
  const son = seri.slice(-12), onceki = seri.slice(-24, -12);
  const oran = (ort(son) / ort(onceki) - 1) * 100;
  const t = seri[seri.length - 1];
  return { yil: t.y, ay: t.m, oran: Math.round(oran * 10) / 10 };
}

function htmlGuncelle(sonuc) {
  let html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/(<textarea id="veri">)([\s\S]*?)(<\/textarea>)/);
  if (!m) throw new Error('kira-artis.html içinde veri kutusu bulunamadı.');

  const etiket = `${AYLAR[sonuc.ay - 1]} ${sonuc.yil}`;
  const yeni = `${etiket} = ${String(sonuc.oran).replace('.', ',')}`;

  let satirlar = m[2].split('\n').map(s => s.trim()).filter(Boolean);
  const i = satirlar.findIndex(s => s.split('=')[0].trim() === etiket);

  if (i >= 0) {
    if (satirlar[i] === yeni) { console.log(`Değişiklik yok: ${yeni}`); return false; }
    satirlar[i] = yeni;                 // boş bırakılmış ayı doldur / düzelt
  } else {
    satirlar.unshift(yeni);             // yeni ay
  }

  html = html.slice(0, m.index) + m[1] + satirlar.join('\n') + m[3] + html.slice(m.index + m[0].length);
  if (!DRY) fs.writeFileSync(HTML, html);
  console.log(`Güncellendi: ${yeni}`);
  return true;
}

function logYaz(sonuc) {
  if (DRY) return;
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  let kayit = [];
  try { kayit = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch (e) {}
  const anahtar = `${sonuc.yil}-${iki(sonuc.ay)}`;
  kayit = kayit.filter(x => x.donem !== anahtar);
  kayit.push({ donem: anahtar, oran: sonuc.oran, kaynak: 'TCMB EVDS ' + SERIES, cekilme: new Date().toISOString() });
  kayit.sort((a, b) => a.donem.localeCompare(b.donem));
  fs.writeFileSync(LOG, JSON.stringify(kayit, null, 2));
}

(async () => {
  try {
    const seri = await evds();
    const sonuc = onIkiAylikOrtalama(seri);
    console.log(`Son dönem: ${AYLAR[sonuc.ay - 1]} ${sonuc.yil} — %${sonuc.oran}`);
    const degisti = htmlGuncelle(sonuc);
    logYaz(sonuc);
    fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `degisti=${degisti}\n`);
  } catch (e) {
    console.error('HATA:', e.message);
    process.exit(1);
  }
})();
