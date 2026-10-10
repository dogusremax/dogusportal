// Çeyrek şampiyonları: biten çeyreğin gönderi (1080x1440) ve story (1080x1920) görsellerini üretir
// → performans/ceyrek/YYYY-Qn/{gonderi,story}_N.jpg + performans/ceyrek/.media (yayın listesi).
// Kullanım: node scripts/ceyrek.js [YYYY-Qn]  (boş = son tamamlanan çeyrek, Türkiye saatiyle)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const RAW = 'https://raw.githubusercontent.com/dogusremax/dogusportal/main/';
function bitenCeyrek() {
  const ay = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }).slice(0, 7);
  const y = +ay.slice(0, 4), q = Math.floor((+ay.slice(5) - 1) / 3);
  return q === 0 ? `${y - 1}-Q4` : `${y}-Q${q}`;
}
(async () => {
  const q = process.argv[2] || bitenCeyrek();
  if (!/^\d{4}-Q[1-4]$/.test(q)) throw new Error('Geçersiz çeyrek: ' + q);
  try { const pub = JSON.parse(fs.readFileSync('performans/ceyrek/.pub', 'utf8')); if (pub.q === q && pub.tamam) { console.log('Zaten yayınlanmış, atlandı:', q); return; } } catch (e) {}
  const out = path.join('performans', 'ceyrek', q); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const media = { q, caption: '', gonderi: [], story: [] };
  for (const [tur, ek] of [['gonderi', ''], ['story', '&fmt=story']]) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1080 / 420 });
    await page.addInitScript(() => sessionStorage.setItem('perfAuth', 'ok'));
    await page.goto(`https://dogusportal.com/performans-gorsel.html?set=birinci&donem=ceyrek&ay=${q}${ek}&cb=${Date.now()}`, { waitUntil: 'networkidle' });
    try { await page.waitForSelector('body[data-ready]', { timeout: 180000 }); }
    catch (e) { throw new Error(`${tur} sayfası hazır olmadı: ${await page.textContent('#status').catch(() => '?')}`); }
    await page.waitForTimeout(1500);
    if (!media.caption) media.caption = await page.evaluate(() => igCaption());
    const slides = await page.$$('.slide');
    if (slides.length < 2) throw new Error(`${tur}: yetersiz slayt (${slides.length})`);
    for (let i = 0; i < Math.min(slides.length, 10); i++) {   // Instagram carousel en fazla 10
      const f = path.join(out, `${tur}_${i + 1}.jpg`);
      await slides[i].screenshot({ path: f, type: 'jpeg', quality: 95 });
      media[tur].push(RAW + f.replace(/\\/g, '/'));
      console.log('✓', q, tur, i + 1);
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync('performans/ceyrek/.media', JSON.stringify(media, null, 1));
})().catch(e => { console.error(e.message || e); process.exit(1); });
