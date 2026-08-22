// GitHub Actions: dogusportal.com/performans.html sayfasını açar, 6 slaytı 1080x1440 (3:4) PNG olarak performans/YYYY-MM/ altına yazar.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  let ay = process.argv[2];
  if (!ay) { const d = new Date(); d.setMonth(d.getMonth() - 1); ay = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  const browser = await chromium.launch();
  for (const set of ['puan', 'birinci']) {
    const out = path.join('performans', ay, set); fs.mkdirSync(out, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1080 / 420 });
    await page.goto(`https://dogusportal.com/performans-gorsel.html?set=${set}&ay=${ay}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('body[data-ready]', { timeout: 90000 });
    await page.waitForTimeout(1500);
    const slides = await page.$$('.slide');
    for (let i = 0; i < slides.length; i++) {
      await slides[i].screenshot({ path: path.join(out, `slide_${i + 1}.png`) });
      console.log('✓', ay, set, 'slide', i + 1);
    }
    await page.close();
  }
  fs.writeFileSync('performans/.son', ay);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
