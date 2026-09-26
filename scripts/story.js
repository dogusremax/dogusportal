// Her sabah: bugünün nöbetçi story'sini 1080x1920 PNG üretir → nobet-story/YYYY-MM-DD.png
// Nöbetçi yoksa ya da ofis nöbeti günüyse hiçbir şey üretmez (exit 0). Instagram yayını Meta token'ı eklenince buraya bağlanacak.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1080 / 405 });
  await page.goto('https://dogusportal.com/nobet-story.html?k=1520', { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-ready]', { timeout: 90000 });
  await page.waitForTimeout(1200);
  // Önceki günün .media dosyası kalırsa yanlışlıkla paylaşılmasın
  const atla = msg => { try { fs.unlinkSync('nobet-story/.media'); } catch (e) {} console.log(msg); };
  if (await page.getAttribute('body', 'data-empty')) { atla('Bugün nöbetçi yok, story üretilmedi.'); await browser.close(); return; }
  // Ofis nöbeti günleri iptal: story üretilmez, Instagram'a hiçbir şey paylaşılmaz
  const kim = await page.evaluate(() => (window.CUR && CUR.name) || '');
  if (/^ofis/i.test(kim.trim())) { atla('Bugün ofis nöbeti, story üretilmedi ve paylaşılmayacak.'); await browser.close(); return; }
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  fs.mkdirSync('nobet-story', { recursive: true });
  const vid = await page.evaluate(() => (window.CUR && CUR.video) || null);
  let mediaPath, isVideo;
  if (vid) { mediaPath = path.join('nobet-story', date + '.mp4'); fs.copyFileSync(path.join(...vid.split('/')), mediaPath); isVideo = true; console.log('✓ video story', date); }
  else { mediaPath = path.join('nobet-story', date + '.png'); await page.locator('#story').screenshot({ path: mediaPath }); isVideo = false; }
  fs.writeFileSync('nobet-story/.media', JSON.stringify({ date, isVideo, url: 'https://dogusportal.com/' + mediaPath.replace(/\\/g, '/') }));
  fs.writeFileSync('nobet-story/.son', date);
  console.log('✓ story', date);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
