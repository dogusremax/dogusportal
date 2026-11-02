// Google yorumlarından "Sizlerden Gelenler" story'si (<tarih>-<n>.png) ve gönderi karuseli (<tarih>-<n>-k1..3.png) üretir → sizlerden-story/
// Kural: her yorum yalnızca bir kez paylaşılır (sizlerden-story/.gecmis.json), tekrar yok.
//  - Yeni gelen yorum (YENI_SINIR'dan sonra arşive düşen): 10:00–21:00 arası ilk çalışmada (15 dk'da bir) paylaşılır; akşam 21:00'den sonra gelen ertesi sabah 10:00'da.
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
  if (yeniler.length && saat >= 10 && saat < 21) {
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
  fs.writeFileSync(SECIM, JSON.stringify({ danisman: id, ad, yorumId: r.id, puan: r.puan, yazar: kisaAd(r.yazar), metin: r.metin.replace(/\s+/g, ' ').trim(), yeni: r.ilkGorulme >= YENI_SINIR }));
  console.log('Seçildi:', r.ilkGorulme >= YENI_SINIR ? 'YENİ' : 'eski', '|', ad, '|', kisaAd(r.yazar), '|', r.metin.slice(0, 80));
}

// Yeni tasarım (sizlerden-yeni.html): kapak + yorum sayfa(lar)ı + teşekkür. Story her sayfayı ayrı story olarak,
// gönderi aynı sayfaları 1080x1440 karusel olarak paylaşır. Sadece sizlerden-story/.yeni-tasarim dosyası varken.
// Kapak rengi: Instagram ızgarasındaki son gönderinin TERSİ (3 sütunda dama). Okunamazsa son Sizlerden renginin tersi.
// Fotoğraf: danışmanın o renkteki kapakları arasında sırayla (.gecmis.json → kapakSira).
async function sonIzgaraRengi(browser) {
  const T = process.env.IG_TOKEN, U = process.env.IG_USER_ID;
  if (!T || !U) return null;
  try {
    const j = await (await fetch(`https://graph.facebook.com/v23.0/${U}/media?fields=media_url,thumbnail_url,media_type&limit=1&access_token=${T}`)).json();
    const m = j.data && j.data[0]; const url = m && (m.thumbnail_url || m.media_url);
    if (!url) return null;
    const p = await browser.newPage();
    const b64 = Buffer.from(await (await fetch(url)).arrayBuffer()).toString('base64');
    const ort = await p.evaluate(async src => {
      const i = new Image(); i.src = src; await i.decode();
      const c = document.createElement('canvas'); c.width = 60; c.height = 60; const x = c.getContext('2d');
      x.drawImage(i, 0, 0, 60, 60); const d = x.getImageData(0, 0, 60, 60).data; let r = 0, b = 0;
      for (let k = 0; k < d.length; k += 4) { r += d[k]; b += d[k + 2]; }
      return { r, b };
    }, 'data:image/jpeg;base64,' + b64);
    await p.close();
    return ort.r > ort.b ? 'R' : 'B';
  } catch (e) { console.log('! Izgara rengi okunamadı:', e.message); return null; }
}

async function uretYeni(secim, browser) {
  const gecmis = oku(GECMIS, { paylasilan: [] });
  const veri = oku('data/sizlerden-kapaklar.json', {})[secim.danisman];
  if (!veri) throw new Error('Kapak verisi yok: ' + secim.danisman);
  const son = await sonIzgaraRengi(browser);
  let renk = son ? (son === 'R' ? 'B' : 'R') : (gecmis.sonRenk === 'R' ? 'B' : 'R');
  let aday = veri.kapaklar.map((k, i) => ({ k, i })).filter(x => x.k.renk === renk);
  if (!aday.length) { aday = veri.kapaklar.map((k, i) => ({ k, i })); renk = aday[0].k.renk; }
  gecmis.kapakSira = gecmis.kapakSira || {};
  const anahtar = secim.danisman + '-' + renk, sira = gecmis.kapakSira[anahtar] || 0;
  const kapak = aday[sira % aday.length].i;
  console.log('Izgara son:', son || '?', '→ kapak rengi', renk, '| kapak', kapak);
  const q = `danisman=${secim.danisman}&kapak=${kapak}&yazar=${encodeURIComponent(secim.yazar)}&puan=${secim.puan}&metin=${encodeURIComponent(secim.metin)}&v=${Date.now()}`;
  const cek = async fmt => {
    const p = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
    await p.goto(`${SITE}/sizlerden-yeni.html?fmt=${fmt}&${q}`, { waitUntil: 'networkidle' });
    await p.waitForSelector('body[data-ready]', { timeout: 60000 });
    await p.waitForTimeout(800);
    const sl = p.locator('.slide'), l = [];
    for (let i = 0; i < await sl.count(); i++) l.push(await sl.nth(i).screenshot());
    await p.close();
    return l;
  };
  const story = await cek('story'), kareler = await cek('feed');
  gecmis.kapakSira[anahtar] = sira + 1; gecmis.sonRenk = renk;
  fs.writeFileSync(GECMIS, JSON.stringify(gecmis, null, 1));
  return { story, kareler };
}

async function uret() {
  const secim = oku(SECIM, null);
  if (!secim) return console.log('Seçim yok, story üretilmedi.');
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  if (fs.existsSync(DIR + '/.yeni-tasarim')) {
    const { story, kareler } = await uretYeni(secim, browser);
    await browser.close();
    const no = fs.readdirSync(DIR).filter(f => f.startsWith(bugun) && /^[\d-]+\.png$/.test(f) && !/-[ks]\d\.png$/.test(f)).length + (secim.tekrar ? 0 : 1);
    const dosya = `${DIR}/${bugun}-${Math.max(no, 1)}.png`;
    fs.writeFileSync(dosya, story[0]);
    const yaz = (l, h) => l.map((b, i) => { const f = dosya.replace('.png', `-${h}${i + 1}.png`); fs.writeFileSync(f, b); return 'https://dogusportal.com/' + f; });
    const stories = yaz(story, 's'), feed = yaz(kareler, 'k');
    fs.writeFileSync(DIR + '/.media', JSON.stringify({ date: bugun, key: secim.yorumId, isVideo: false, url: 'https://dogusportal.com/' + dosya, stories, feed, secim }, null, 1));
    fs.writeFileSync(DIR + '/.son', `${bugun} ${secim.ad} · ${secim.yazar}`);
    return console.log('✓ yeni tasarım', dosya, '|', stories.length, 'story,', feed.length, 'kare |', secim.ad);
  }
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

  const no = fs.readdirSync(DIR).filter(f => f.startsWith(bugun) && /^[\d-]+\.png$/.test(f) && !/-[ks]\d\.png$/.test(f)).length + (secim.tekrar ? 0 : 1);
  const dosya = `${DIR}/${bugun}-${Math.max(no, 1)}.png`;
  fs.writeFileSync(dosya, Buffer.from(png, 'base64'));
  const feed = kareler.map((b, i) => { const f = dosya.replace('.png', `-k${i + 1}.png`); fs.writeFileSync(f, b); return 'https://dogusportal.com/' + f; });
  fs.writeFileSync(DIR + '/.media', JSON.stringify({ date: bugun, key: secim.yorumId, isVideo: false, url: 'https://dogusportal.com/' + dosya, feed, secim }, null, 1));
  fs.writeFileSync(DIR + '/.son', `${bugun} ${secim.ad} · ${secim.yazar}`);
  console.log('✓ story', dosya, '|', secim.ad, '|', secim.yazar);
}

if (process.argv[2] === 'sec') sec();
else uret().catch(e => { console.error(e); process.exit(1); });
