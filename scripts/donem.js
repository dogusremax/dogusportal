// Aylık ve haftalık paylaşım görselleri — çeyrekteki (scripts/ceyrek.js) akışın aynısı.
//   ay    → "Ayın Şampiyonları" gönderi carousel'i (set=birinci, 1080x1440), anahtar YYYY-MM (boş = geçen ay)
//   hafta → "Haftalık Sıralama" story'leri (set=puan&donem=hafta, 1080x1920), anahtar YYYY-MM-DD Pazartesi (boş = geçen hafta)
// Çıktı: performans/oto/<donem>/<anahtar>/{gonderi,story}_N.jpg + performans/oto/<donem>/.media
// Yayın: PAYLASIM_DIR=performans/oto/<donem> node scripts/ceyrek-ig.js
// Kullanım: node scripts/donem.js ay|hafta [anahtar]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const RAW = 'https://raw.githubusercontent.com/dogusremax/dogusportal/main/';
const BASE = process.env.DONEM_BASE || 'https://dogusportal.com/';
const bugunTR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
function varsayilan(donem) {
  const b = bugunTR();
  if (donem === 'ay') { const d = new Date(b + 'T12:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); }
  const d = new Date(b + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7); return d.toISOString().slice(0, 10);
}
(async () => {
  const donem = process.argv[2], key = process.argv[3] || varsayilan(donem);
  if (donem === 'ay' ? !/^\d{4}-\d{2}$/.test(key) : donem === 'hafta' ? !/^\d{4}-\d{2}-\d{2}$/.test(key) : true) throw new Error('Geçersiz dönem/anahtar: ' + donem + ' ' + key);
  const kok = path.join('performans', 'oto', donem);
  try { const pub = JSON.parse(fs.readFileSync(path.join(kok, '.pub'), 'utf8')); if (pub.q === key && pub.tamam) { console.log('Zaten yayınlanmış, atlandı:', key); return; } } catch (e) {}
  const out = path.join(kok, key); fs.mkdirSync(out, { recursive: true });
  const [tur, sorgu] = donem === 'ay' ? ['gonderi', `set=birinci&ay=${key}`] : ['story', `set=puan&donem=hafta&ay=${key}`];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1080 / 420 });
  await page.addInitScript(() => sessionStorage.setItem('perfAuth', 'ok'));
  await page.goto(`${BASE}performans-gorsel.html?${sorgu}&cb=${Date.now()}`, { waitUntil: 'networkidle' });
  const durum = () => page.textContent('#status').catch(() => '?');
  // Kayıt yoksa sayfa data-ready vermez, "kayıt bulunamadı" yazar → paylaşacak bir şey yok
  for (let i = 0; i < 90 && !(await page.$('body[data-ready]')); i++) {
    const s = await durum();
    if (/kayıt bulunamadı/i.test(s)) { console.log('Paylaşılacak kayıt yok:', s); await browser.close(); return; }
    if (/^Hata/i.test(s)) throw new Error('Sayfa hatası: ' + s);
    await page.waitForTimeout(2000);
  }
  if (!(await page.$('body[data-ready]'))) throw new Error('Sayfa hazır olmadı: ' + await durum());
  await page.waitForTimeout(1500);
  const media = { q: key, caption: await page.evaluate(() => igCaption()), gonderi: [], story: [] };
  const slides = await page.$$('.slide');
  if (slides.length < 2) throw new Error(`yetersiz slayt (${slides.length})`);
  for (let i = 0; i < Math.min(slides.length, 10); i++) {
    const f = path.join(out, `${tur}_${i + 1}.jpg`);
    await slides[i].screenshot({ path: f, type: 'jpeg', quality: 95 });
    media[tur].push(RAW + f.replace(/\\/g, '/'));
    console.log('✓', donem, key, tur, i + 1);
  }
  await browser.close();
  fs.writeFileSync(path.join(kok, '.media'), JSON.stringify(media, null, 1));
})().catch(e => { console.error(e.message || e); process.exit(1); });
