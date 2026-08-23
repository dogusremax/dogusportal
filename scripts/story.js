// Her sabah: bugünün nöbetçi story'sini 1080x1920 PNG üretir → nobet-story/YYYY-MM-DD.png
// Nöbetçi yoksa hiçbir şey üretmez (exit 0). Instagram yayını Meta token'ı eklenince buraya bağlanacak.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1080 / 405 });
  await page.goto('https://dogusportal.com/nobet-story.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-ready]', { timeout: 90000 });
  await page.waitForTimeout(1200);
  if (await page.getAttribute('body', 'data-empty')) { console.log('Bugün nöbetçi yok, story üretilmedi.'); await browser.close(); return; }
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  fs.mkdirSync('nobet-story', { recursive: true });
  const vid = await page.evaluate(() => (window.CUR && CUR.video) || null);
  if (vid) { fs.copyFileSync(path.join(...vid.split('/')), path.join('nobet-story', date + '.mp4')); console.log('✓ video story', date); }
  else await page.locator('#story').screenshot({ path: path.join('nobet-story', date + '.png') });
  fs.writeFileSync('nobet-story/.son', date);
  console.log('✓ story', date);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
