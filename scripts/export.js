// GitHub Actions: dogusportal.com/performans.html sayfasını açar, 6 slaytı 1080x1440 (3:4) PNG olarak performans/YYYY-MM/ altına yazar.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  let ay = process.argv[2];
  if (!ay) { const d = new Date(); d.setMonth(d.getMonth() - 1); ay = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  const out = path.join('performans', ay); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1080 / 420 });
  await page.goto(`https://dogusportal.com/performans.html?ay=${ay}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-ready]', { timeout: 90000 });
  await page.waitForTimeout(1500);
  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({ path: path.join(out, `slide_${i + 1}.png`) });
    console.log('✓', ay, 'slide', i + 1);
  }
  fs.writeFileSync('performans/.son', ay);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
