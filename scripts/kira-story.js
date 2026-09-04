// Kira artış görsellerini üretir: story (1080x1920) + feed karusel (3x1080x1440)
const { chromium } = require('playwright');
const fs = require('fs');

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

(async () => {
  const browser = await chromium.launch();
  const donem = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }).slice(0, 7);
  fs.mkdirSync('kira-story', { recursive: true });

  const cek = async (mod, yuk, dosyalar) => {
    const page = await browser.newPage({
      viewport: { width: 900, height: 1200 },
      deviceScaleFactor: 1080 / 420
    });
    await page.goto('https://dogusportal.com/kira-artis.html?v=' + Date.now(), { waitUntil: 'networkidle' });
    await page.waitForSelector('.slide', { timeout: 60000 });
    if (mod === 'story') {
      await page.selectOption('#fmt', 'story');
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1500);          // font ve logo yüklensin
    const slides = await page.locator('.slide');
    for (let i = 0; i < dosyalar.length; i++) {
      await slides.nth(i).screenshot({ path: dosyalar[i] });
    }
    // en üstteki ayı ve oranı oku
    const bilgi = await page.evaluate(() => {
      const l = (typeof parse === 'function') ? parse().filter(x => x.oran) : [];
      return l.length ? { ay: l[0].ay, oran: l[0].oran } : null;
    });
    await page.close();
    return bilgi;
  };

  const story = [1, 2, 3].map(n => `kira-story/${donem}-story-${n}.png`);
  const bilgi = await cek('story', 1920, story);

  const feed = [1, 2, 3].map(n => `kira-story/${donem}-${n}.png`);
  await cek('feed', 1440, feed);

  if (!bilgi) { console.log('Sayfada veri yok, çıkılıyor.'); await browser.close(); process.exit(0); }

  const kok = 'https://dogusportal.com/';
  fs.writeFileSync('kira-story/.media', JSON.stringify({
    donem, ay: bilgi.ay, oran: bilgi.oran,
    story: story.map(f => kok + f),
    feed: feed.map(f => kok + f)
  }, null, 2));
  fs.writeFileSync('kira-story/.son', donem);
  console.log('✓ Görseller üretildi:', bilgi.ay, '%' + bilgi.oran);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
