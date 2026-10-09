// Google yorumlarından "Sizlerden Gelenler" story'si (<tarih>-<n>.png) ve gönderi karuseli (<tarih>-<n>-k1..3.png) üretir → sizlerden-story/
// Kural: her yorum yalnızca bir kez paylaşılır (sizlerden-story/.gecmis.json), tekrar yok.
//  - Yeni gelen yorum (YENI_SINIR'dan sonra arşive düşen): 08:00–23:00 arası ilk çalışmada (15 dk'da bir) paylaşılır; gece gelen sabah 08:00'de.
//  - Eski (stok) yorumlar: haftada bir, ÇARŞAMBA 12:00'den sonraki ilk çalışmada bir tane; her hafta sıradaki danışman
//    (eskiSon'dan devam, stoğu bitmiş danışman atlanır). Bitince sadece yeni yorumlar paylaşılır. SADECE_YENI=1 iken stok atlanır.
// SITE: sayfaların okunduğu adres (workflow yerel sunucu verir; yeni commit'lenen yorum Pages'e düşmeden görsel üretilebilsin).
// `node sizlerden-story.js sec` sadece seçim yapar (.secim.json), argümansız çalışınca seçimi görsele çevirir.
const fs = require('fs');

const DIR = 'sizlerden-story', GECMIS = DIR + '/.gecmis.json', SECIM = DIR + '/.secim.json';
const SIRA = ['evsen', 'gizem', 'orhan', 'aysun', 'ozlem_varol', 'gamze', 'irem', 'aysegul_alpay'];  // sayfadaki çip sırası
const YENI_SINIR = '2026-10-06T00:00:00Z';
const SITE = (process.env.SITE || 'https://dogusportal.com').replace(/\/$/, '');
const SIGAN = 210;   // kartta ~6 satır × 35 karakter; bundan kısa yorumlar kesilmeden sığar

// "Canan Akşar" → "Canan A." (soyadın sadece baş harfi)
const kisaAd = a => { const p = String(a || '').trim().split(/\s+/); return p.length < 2 ? p[0] || '' : p.slice(0, -1).map(w => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1)).join(' ') + ' ' + p[p.length - 1].charAt(0).toLocaleUpperCase('tr') + '.'; };
const oku = (f, v) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return v; } };
const sil = f => { try { fs.unlinkSync(f); } catch (e) {} };
const simdi = new Date();
const bugun = simdi.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
const saat = +simdi.toLocaleString('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false });
const carsamba = simdi.toLocaleDateString('en-US', { timeZone: 'Europe/Istanbul', weekday: 'short' }) === 'Wed';
const gunFark = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);

function sec() {
  fs.mkdirSync(DIR, { recursive: true });
  sil(SECIM);
  // Önceki story üretildi ama paylaşılamadıysa önce onu tekrar dene
  const onceki = oku(DIR + '/.media', null);
  let pub = ''; try { pub = fs.readFileSync(DIR + '/.pub', 'utf8').trim(); } catch (e) {}
  if (onceki && onceki.key !== pub) {
    if (onceki.date === bugun) { fs.writeFileSync(SECIM, JSON.stringify({ ...onceki.secim, tekrar: true })); return console.log('Paylaşılamamış story tekrar denenecek:', onceki.key); }
    sil(DIR + '/.media');   // eski günün paylaşılamamış story'si: atla
  }

  const danismanlar = oku('data/danismanlar.json', []);
  const gecmis = oku(GECMIS, { son: null, sonGun: null, paylasilan: [] });
  const adaylar = (oku('data/google-yorumlar.json', {}).yorumlar || [])
    .filter(r => r.puan >= 4 && r.metin && r.metin.trim() && !gecmis.paylasilan.includes(r.id)
      && (r.danismanlar || []).some(id => SIRA.includes(id) && danismanlar.some(d => d.id === id)));
  // Stok yorum sırası kendi alanında tutulur (yeni yorum paylaşımları sırayı kaydırmaz)
  const eskiSon = gecmis.eskiSon !== undefined ? gecmis.eskiSon : gecmis.son;
  const eskiSonGun = gecmis.eskiSonGun !== undefined ? gecmis.eskiSonGun : gecmis.sonGun;
  const bas = SIRA.indexOf(eskiSon) + 1;
  const sirali = Array.from({ length: SIRA.length }, (_, k) => SIRA[(bas + k) % SIRA.length]);

  let r = null, id = null;
  const yeniler = adaylar.filter(x => (x.ilkGorulme || '') >= YENI_SINIR).sort((a, b) => a.ilkGorulme.localeCompare(b.ilkGorulme));
  if (yeniler.length && saat >= 8 && saat < 23) {
    r = yeniler[0];
    id = sirali.find(i => r.danismanlar.includes(i));
  } else if (!yeniler.length && process.env.SADECE_YENI !== '1' && carsamba && saat >= 12 && (!eskiSonGun || gunFark(bugun, eskiSonGun) >= 6)) {
    for (const i of sirali) {
      const l = adaylar.filter(x => x.danismanlar.includes(i));
      if (!l.length) continue;
      // Önce karta sığan yorumlar, sonra en yeni
      l.sort((a, b) => (a.metin.length > SIGAN) - (b.metin.length > SIGAN) || (b.tarih || '').localeCompare(a.tarih || ''));
      r = l[0]; id = i; gecmis.eskiSon = i; gecmis.eskiSonGun = bugun; break;
    }
  }
  if (!r) return console.log(adaylar.length ? 'Şu an paylaşım zamanı değil.' : 'Paylaşılmamış yorum yok.');

  gecmis.son = id; gecmis.sonGun = bugun; gecmis.paylasilan.push(r.id);
  fs.writeFileSync(GECMIS, JSON.stringify(gecmis, null, 1));
  const { ad } = danismanlar.find(d => d.id === id);
  fs.writeFileSync(SECIM, JSON.stringify({ danisman: id, ad, yorumId: r.id, yazar: kisaAd(r.yazar), metin: r.metin.replace(/\s+/g, ' ').trim(), yeni: r.ilkGorulme >= YENI_SINIR }));
  console.log('Seçildi:', r.ilkGorulme >= YENI_SINIR ? 'YENİ' : 'eski', '|', ad, '|', kisaAd(r.yazar), '|', r.metin.slice(0, 80));
}

async function uret() {
  const secim = oku(SECIM, null);
  if (!secim) return console.log('Seçim yok, story üretilmedi.');
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  // Story: danışmanın kendi şablonu (sizlerden-gelenler.html) — sadece zemini gönderiyle aynı
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.addInitScript(() => sessionStorage.setItem('perfAuth', 'ok'));
  await page.goto(SITE + '/sizlerden-gelenler.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.chip', { timeout: 60000 });
  const png = await page.evaluate(async s => {
    await document.fonts.load('bold 25px Poppins'); await document.fonts.load('22px Poppins');
    await document.fonts.load('800 100px "Plus Jakarta Sans"');
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
  await page.close();

  // Gönderi karuseli (sizlerden-karusel.html, 1080x1440 kareler)
  const cek = async fmt => {
    const p = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1080 / 420 });
    await p.goto(`${SITE}/sizlerden-karusel.html?oto=1&fmt=${fmt}&yorum=${encodeURIComponent(secim.yorumId)}&danisman=${secim.danisman}&v=${Date.now()}`, { waitUntil: 'networkidle' });
    await p.waitForSelector('body[data-ready]', { timeout: 60000 });
    await p.waitForTimeout(1000);
    const sl = p.locator('.slide'), l = [];
    for (let i = 0; i < await sl.count(); i++) l.push(await sl.nth(i).screenshot());
    await p.close();
    return l;
  };
  const kareler = await cek('feed');
  await browser.close();

  const no = fs.readdirSync(DIR).filter(f => f.startsWith(bugun) && /^[\d-]+\.png$/.test(f) && !/-k\d\.png$/.test(f)).length + (secim.tekrar ? 0 : 1);
  const dosya = `${DIR}/${bugun}-${Math.max(no, 1)}.png`;
  fs.writeFileSync(dosya, Buffer.from(png, 'base64'));
  const feed = kareler.map((b, i) => { const f = dosya.replace('.png', `-k${i + 1}.png`); fs.writeFileSync(f, b); return 'https://dogusportal.com/' + f; });
  fs.writeFileSync(DIR + '/.media', JSON.stringify({ date: bugun, key: secim.yorumId, isVideo: false, url: 'https://dogusportal.com/' + dosya, feed, secim }, null, 1));
  fs.writeFileSync(DIR + '/.son', `${bugun} ${secim.ad} · ${secim.yazar}`);
  console.log('✓ story', dosya, '|', secim.ad, '|', secim.yazar);
}

if (process.argv[2] === 'sec') sec();
else uret().catch(e => { console.error(e); process.exit(1); });
