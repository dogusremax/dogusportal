// Her gün 12:00: sıradaki danışmanın Google yorumundan "Sizlerden Gelenler" story'si üretir → sizlerden-story/YYYY-MM-DD.png
// Danışmanlar sizlerden-gelenler.html'deki sırayla döner; yorumu olmayan atlanır. Her danışmanın yorumları bitene kadar
// aynı yorum tekrar paylaşılmaz (sizlerden-story/.gecmis.json), bitince o danışmanın listesi baştan başlar.
const { chromium } = require('playwright');
const fs = require('fs');

const DIR = 'sizlerden-story', GECMIS = DIR + '/.gecmis.json';
const SIRA = ['evsen', 'gizem', 'orhan', 'aysun', 'ozlem_varol', 'gamze', 'irem', 'aysegul_alpay'];  // sayfadaki çip sırası
const SIGAN = 210;   // kartta ~6 satır × 35 karakter; bundan kısa yorumlar kesilmeden sığar

(async () => {
  const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  fs.mkdirSync(DIR, { recursive: true });
  const oku = (f, v) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return v; } };
  try { if (fs.readFileSync(DIR + '/.pub', 'utf8').trim() === bugun) { console.log('Bugün zaten yayınlanmış:', bugun); return; } } catch (e) {}

  // Yedek çalışma: bugünün seçimi yapılmış ama paylaşılamamışsa aynı yorumu tekrar dene, yenisini seçme
  const onceki = oku(DIR + '/.media', null);
  let secim = onceki && onceki.date === bugun ? onceki.secim : null;

  if (!secim) {
    const danismanlar = oku('data/danismanlar.json', []);
    const yorumlar = (oku('data/google-yorumlar.json', {}).yorumlar || []).filter(r => r.puan >= 4 && r.metin && r.metin.trim());
    const gecmis = oku(GECMIS, { son: null, paylasilan: {} });
    const bas = SIRA.indexOf(gecmis.son) + 1;
    for (let k = 0; k < SIRA.length && !secim; k++) {
      const id = SIRA[(bas + k) % SIRA.length];
      const d = danismanlar.find(x => x.id === id);
      const hepsi = yorumlar.filter(r => (r.danismanlar || []).includes(id));
      if (!d || !hepsi.length) continue;
      let kalan = hepsi.filter(r => !(gecmis.paylasilan[id] || []).includes(r.id));
      if (!kalan.length) { gecmis.paylasilan[id] = []; kalan = hepsi; }   // hepsi paylaşıldı: baştan
      // Önce karta sığan yorumlar, sonra en yeni
      kalan.sort((a, b) => (a.metin.length > SIGAN) - (b.metin.length > SIGAN) || (b.tarih || '').localeCompare(a.tarih || ''));
      const r = kalan[0];
      secim = { danisman: id, ad: d.ad, yorumId: r.id, yazar: r.yazar, metin: r.metin.replace(/\s+/g, ' ').trim() };
      gecmis.son = id;
      (gecmis.paylasilan[id] = gecmis.paylasilan[id] || []).push(r.id);
    }
    if (!secim) { console.log('Paylaşılacak yorum bulunamadı.'); try { fs.unlinkSync(DIR + '/.media'); } catch (e) {} return; }
    fs.writeFileSync(GECMIS, JSON.stringify(gecmis, null, 1));
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.addInitScript(() => sessionStorage.setItem('perfAuth', 'ok'));
  await page.goto('https://dogusportal.com/sizlerden-gelenler.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.chip', { timeout: 60000 });
  const png = await page.evaluate(async s => {
    await document.fonts.load('bold 25px Poppins'); await document.fonts.load('22px Poppins');
    const chip = [...document.querySelectorAll('.chip')].find(c => c.textContent.trim() === s.ad);
    if (!chip) throw new Error('Sayfada danışman yok: ' + s.ad);
    document.getElementById('n1').value = s.yazar;
    document.getElementById('t1').value = s.metin;
    chip.click();
    for (let i = 0; i < 100 && !cache[cur.i]; i++) await new Promise(r => setTimeout(r, 100));
    if (!cache[cur.i]) throw new Error('Şablon görseli yüklenmedi');
    render();
    return cv.toDataURL('image/png').split(',')[1];
  }, secim);
  await browser.close();

  const dosya = `${DIR}/${bugun}.png`;
  fs.writeFileSync(dosya, Buffer.from(png, 'base64'));
  fs.writeFileSync(DIR + '/.media', JSON.stringify({ date: bugun, isVideo: false, url: 'https://dogusportal.com/' + dosya, secim }, null, 1));
  fs.writeFileSync(DIR + '/.son', `${bugun} ${secim.ad} · ${secim.yazar}`);
  console.log('✓ story', bugun, '|', secim.ad, '|', secim.yazar, '|', secim.metin.slice(0, 80));
})().catch(e => { console.error(e); process.exit(1); });
