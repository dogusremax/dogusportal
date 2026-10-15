// Haftalık yatırım astrolojisi karuseli (@remaxdogus, her Pazartesi).
//   node scripts/yatirim-astro.js uret  → haftanın gök olaylarını hesaplar (scripts/gok-hafta.py), Gemini ile 12 burç
//                                          yorumunu yazar → data/yatirim-astroloji.json (+ yatirim-astroloji/.gecmis.json)
//   node scripts/yatirim-astro.js ciz   → yatirim-astroloji.html'den 8 kare (1080×1440) → yatirim-astroloji/<hafta>-<n>.png + <hafta>-story.png (9:16, gönderiye yönlendirir) + .media
// HAFTA=yyyy-mm-dd ile hafta seçilir (varsayılan: içinde bulunulan haftanın Pazartesi'si, Türkiye saati).
// Tekrar olmasın diye son 6 haftanın yorumları Gemini'ye gösterilir ve her hafta farklı bir ana tema seçilir.
const fs = require('fs');
const { execFileSync } = require('child_process');

const DIR = 'yatirim-astroloji', VERI = 'data/yatirim-astroloji.json', GECMIS = DIR + '/.gecmis.json';
const GECMIS_HAFTA = 6;
const SITE = (process.env.SITE || 'https://dogusportal.com').replace(/\/$/, '');
// "-latest" takma adları Google'ın en güncel modeline gider; önce Pro (haftada tek istek), olmazsa Flash
const MODELLER = ['gemini-pro-latest', 'gemini-flash-latest', 'gemini-2.5-pro', 'gemini-2.5-flash'];
const BURCLAR = [['koc', 'Koç'], ['boga', 'Boğa'], ['ikizler', 'İkizler'], ['yengec', 'Yengeç'], ['aslan', 'Aslan'], ['basak', 'Başak'],
  ['terazi', 'Terazi'], ['akrep', 'Akrep'], ['yay', 'Yay'], ['oglak', 'Oğlak'], ['kova', 'Kova'], ['balik', 'Balık']];
// Her hafta farklı bir ana tema: yorumlar aynı kalıba oturmasın
const TEMALAR = ['kira getirisi ve nakit akışı', 'kentsel dönüşüm ve uzun vade', 'ilk ev ve ilk adım', 'pazarlık ve doğru fiyat',
  'portföy çeşitlendirme', 'değerleme ve piyasa verisi', 'tapu, evrak ve düzen', 'zamanlama ve sabır',
  'konum ve çevre seçimi', 'yenileme ve değer artışı', 'iş yeri ve ticari mülk', 'birikim ve planlama'];

const oku = (f, v) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return v; } };
const wait = ms => new Promise(r => setTimeout(r, ms));

function buHaftaPazartesi() {
  if (process.env.HAFTA) return process.env.HAFTA;
  const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const d = new Date(bugun + 'T12:00:00Z'), gun = (d.getUTCDay() + 6) % 7;   // 0=Pzt
  return new Date(d.getTime() - gun * 864e5).toISOString().slice(0, 10);
}

function istem(gok, tema, gecmis) {
  const eski = gecmis.length ? BURCLAR.map(([k, ad]) => {
    const l = gecmis.map(g => g.burclar?.[k]).filter(Boolean).map(y => `${y.baslik} / ${y.yorum} / odak: ${y.odak}`);
    return l.length ? `${ad}: ${l.join(' | ')}` : '';
  }).filter(Boolean).join('\n') : '';
  return `RE/MAX Doğuş emlak ofisinin Instagram hesabı için her Pazartesi paylaşılan "Bu haftanın yatırım astrolojisi" karuselinin metinlerini yaz.

Bu haftanın GERÇEK gök olayları (Türkiye tarihleriyle; tarih ve olay uydurma, yalnızca bunları kullan):
${gok.olaylar.length ? gok.olaylar.map(o => '- ' + o).join('\n') : '- Bu hafta öne çıkan bir burç geçişi, retro başlangıcı/bitişi ya da Yeni Ay/Dolunay yok.'}
Hafta başında gezegenlerin konumu: ${gok.durum.join(', ')}.

Bu haftanın ana teması: "${tema}". Yorumları bu temanın etrafında kur ama temayı kelimesi kelimesine tekrar etme.
${eski ? `TEKRARA DÜŞME: Son haftalarda her burca yazılanlar aşağıda. Bu cümleleri, ana fikirleri, benzetmeleri ve odakları bu hafta KULLANMA.\n${eski}\n` : ''}
Kurallar:
- 12 burcun her biri için: "baslik" (bu haftanın özü, 3-6 kelime, en fazla 34 karakter), "yorum" (2 cümle, en fazla 210 karakter), "odak" (1-3 kelimelik yatırım odağı, ör. "Kira sözleşmesi", "Portföy gözden geçirme"; en fazla 22 karakter), "yildiz" (bu haftanın yatırım enerjisi, 3 ile 5 arası tam sayı).
- Her yorum burcun karakterinden ve yukarıdaki gerçek gök olaylarından en az birinden yola çıksın, konuyu gayrimenkul ve birikime bağlasın (ev bakmak, kira, pazarlık, tapu/evrak, kentsel dönüşüm, değerleme, birikim planı gibi).
- Eğlenceli, sıcak, umut veren bir dil. Okura "sen" diye seslen. Korku, kriz, kayıp gibi olumsuz ifade kullanma.
- YASAK: kesin kazanç, getiri ya da fiyat artışı vaadi; "al", "sat", "hemen yatırım yap" gibi doğrudan yatırım tavsiyesi; yüzde, fiyat ve para miktarı (gök olayının tarihini yazabilirsin); faiz, döviz, altın, borsa, kripto; emoji ve hashtag.
- Merkür retrosunu "sözleşmeyi iki kez oku" gibi hafif bir dikkat notu olarak anlatabilirsin ama korkutma.
- On iki burcun cümleleri birbirine benzemesin; aynı kalıpla başlamasın. Türkçe imla ve dilbilgisi kusursuz olsun.
- Ayrıca "ozet": haftanın gökyüzünü yatırım diliyle anlatan tek cümle (en fazla 170 karakter, gönderi açıklamasında kullanılacak).

Sadece JSON döndür:
{"ozet":"","burclar":{${BURCLAR.map(([k]) => `"${k}":{"baslik":"","yorum":"","odak":"","yildiz":4}`).join(',')}}}`;
}

const YASAK = /(%|₺|(?<!\p{L})TL(?!\p{L})|garanti|kesin kazan|kripto|borsa|bitcoin|(?<!\p{L})altın(?!d)|döviz|(?<!\p{L})faiz|#|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/iu;
function dogrula(j) {
  const sorun = [];
  const temiz = s => String(s || '').replace(/\s+/g, ' ').trim();
  const sonuc = { ozet: temiz(j?.ozet), burclar: {} };
  if (!sonuc.ozet || sonuc.ozet.length > 200 || YASAK.test(sonuc.ozet)) sorun.push('ozet');
  for (const [k, ad] of BURCLAR) {
    const y = j?.burclar?.[k] || {};
    const o = { baslik: temiz(y.baslik), yorum: temiz(y.yorum), odak: temiz(y.odak), yildiz: Math.round(+y.yildiz) };
    if (!o.baslik || o.baslik.length > 40) sorun.push(ad + ' başlık');
    if (!o.yorum || o.yorum.length > 240) sorun.push(ad + ' yorum');
    if (!o.odak || o.odak.length > 26) sorun.push(ad + ' odak');
    if (!(o.yildiz >= 3 && o.yildiz <= 5)) o.yildiz = 4;
    if (YASAK.test(o.baslik + ' ' + o.yorum + ' ' + o.odak)) sorun.push(ad + ' yasak ifade');
    sonuc.burclar[k] = o;
  }
  return { sonuc, sorun };
}

async function gemini(anahtar, metin) {
  for (const model of MODELLER) for (let d = 0; d < 3; d++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': anahtar },
      body: JSON.stringify({ contents: [{ parts: [{ text: metin }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json', maxOutputTokens: 32768 } }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r && (r.status === 429 || r.status === 503)) { await wait(30000); continue; }
    if (!r || !r.ok) { console.error('Gemini hatası', model, r?.status, j.error?.message?.slice(0, 150)); break; }
    const t = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (t) return t;
  }
  return null;
}

async function uret() {
  let anahtar = process.env.GEMINI_API_KEY;
  if (!anahtar) try { anahtar = JSON.parse(process.env.GOOGLE_PLACES_KEY || '').gemini; } catch (e) {}
  if (!anahtar) throw new Error('Gemini anahtarı yok');
  const hafta = buHaftaPazartesi();
  const gok = JSON.parse(execFileSync('python3', ['scripts/gok-hafta.py', hafta], { encoding: 'utf8' }));
  const gecmis = oku(GECMIS, []).filter(g => g.hafta < hafta).slice(-GECMIS_HAFTA);
  const tema = TEMALAR[Math.floor(Date.parse(hafta + 'T12:00:00Z') / (7 * 864e5)) % TEMALAR.length];
  console.log('Hafta:', hafta, '· Tema:', tema, '\nGök olayları:', gok.olaylar.join(' · ') || '(yok)');
  let sonuc = null;
  for (let deneme = 1; deneme <= 3 && !sonuc; deneme++) {
    const t = await gemini(anahtar, istem(gok, tema, gecmis));
    if (!t) continue;
    let j; try { j = JSON.parse(t); } catch (e) { console.error('JSON okunamadı, tekrar deneniyor'); continue; }
    const { sonuc: s, sorun } = dogrula(j);
    if (sorun.length) { console.error(`Deneme ${deneme}: kurala uymayan alanlar →`, sorun.join(', ')); continue; }
    sonuc = s;
  }
  if (!sonuc) throw new Error('Gemini geçerli yorum üretemedi');
  const veri = { hafta, tema, olaylar: gok.olaylar, durum: gok.durum, ...sonuc, uretildi: new Date().toISOString() };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(VERI, JSON.stringify(veri, null, 1));
  const yeni = oku(GECMIS, []).filter(g => g.hafta !== hafta).concat([{ hafta, burclar: veri.burclar }])
    .sort((a, b) => a.hafta.localeCompare(b.hafta)).slice(-(GECMIS_HAFTA + 2));
  fs.writeFileSync(GECMIS, JSON.stringify(yeni, null, 1));
  console.log('✓ Yorumlar yazıldı:', VERI);
}

async function ciz() {
  const { chromium } = require('playwright');
  const veri = oku(VERI, null);
  if (!veri) throw new Error(VERI + ' yok');
  fs.mkdirSync(DIR, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1080 / 420 });
  await page.goto(`${SITE}/yatirim-astroloji.html?v=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-hazir="1"]', { timeout: 60000 });
  await page.waitForTimeout(1500);   // font ve logo yüklensin
  const slides = page.locator('.slide'), n = await slides.count();
  const dosyalar = [];
  for (let i = 0; i < n; i++) {
    const f = `${DIR}/${veri.hafta}-${i + 1}.png`;
    await slides.nth(i).screenshot({ path: f });
    dosyalar.push(f);
  }
  const story = `${DIR}/${veri.hafta}-story.png`;
  await page.locator('.story').first().screenshot({ path: story });
  const aciklama = await page.evaluate(() => aciklamaMetni(window.VERI));
  await browser.close();
  fs.writeFileSync(DIR + '/.media', JSON.stringify({
    hafta: veri.hafta, feed: dosyalar.map(f => 'https://dogusportal.com/' + f),
    story: 'https://dogusportal.com/' + story, aciklama }, null, 2));
  console.log(`✓ ${n} kare üretildi:`, veri.hafta);
}

const islem = process.argv[2];
(islem === 'uret' ? uret() : islem === 'ciz' ? ciz() : Promise.reject(new Error('Kullanım: uret | ciz')))
  .catch(e => { console.error(e.message || e); process.exit(1); });
