// Haftalık yatırım astrolojisi karuselini @remaxdogus'a paylaşır (yatirim-astroloji/.media).
// Önce karusel, ardından gönderiye yönlendiren story. Her parça ayrı işaretlenir (.pub / .pub-story):
// biri hata verirse tekrar denemede yayınlanmış olan yeniden atılmaz.
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
if (!TOKEN || !UID) { console.log('IG_TOKEN / IG_USER_ID yok, paylaşım atlandı.'); process.exit(0); }
const G = 'https://graph.facebook.com/v23.0', DIR = 'yatirim-astroloji';
// STORY_MOD=elle (varsayılan): story otomatik atılmaz; görsel + gönderi linki Umut'a mail olarak gider,
// o da link çıkartmasını ekleyip elle paylaşır (Graph API çıkartma desteklemiyor). STORY_MOD=otomatik: linksiz story atılır.
const STORY_MOD = process.env.STORY_MOD || 'elle';
const m = JSON.parse(fs.readFileSync(DIR + '/.media', 'utf8'));
// yatirim-astroloji/<hafta>-video.mp4 varsa karuselin ilk sayfası kapak görselinin yerine bu video olur
// (videonun ilk çeyrek saniyesi kapak; Instagram karusel videosuna ayrı kapak görseli kabul etmiyor).
const VIDEO = fs.existsSync(`${DIR}/${m.hafta}-video.mp4`) ? `https://dogusportal.com/${DIR}/${m.hafta}-video.mp4` : '';
const isaret = f => { try { return fs.readFileSync(`${DIR}/${f}`, 'utf8').trim() === m.hafta; } catch (e) { return false; } };
if (isaret('.pub') && (!m.story || STORY_MOD !== 'otomatik' || isaret('.pub-story'))) { console.log('Bu hafta zaten paylaşılmış:', m.hafta); process.exit(0); }

const wait = ms => new Promise(r => setTimeout(r, ms));
async function post(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j;
}
async function hazirBekle(id, deneme = 36) {
  for (let i = 0; i < deneme; i++) {
    const st = await (await fetch(`${G}/${id}?fields=status_code&access_token=${TOKEN}`)).json();
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR') throw new Error('Container ERROR: ' + id);
    await wait(8000);
  }
  throw new Error('Container zaman aşımı: ' + id);
}
async function yayindaMi(url) {
  for (let i = 0; i < 30; i++) { if ((await fetch(url + '?cb=' + Date.now(), { method: 'HEAD' })).ok) return; await wait(10000); }
  throw new Error('Medya yayında değil: ' + url);
}

(async () => {
  if (!isaret('.pub')) await karusel(); else console.log('Karusel zaten paylaşılmış.');
  if (m.story && STORY_MOD !== 'otomatik') {
    let link = ''; try { link = fs.readFileSync(DIR + '/.permalink', 'utf8').trim(); } catch (e) {}
    fs.writeFileSync(DIR + '/story-mail.txt',
`Bu haftanın yatırım astrolojisi karuseli @remaxdogus'ta yayınlandı.

Story görseli (telefonda açıp kaydet):
${m.story}

Story'ye link çıkartması olarak eklenecek gönderi linki:
${link || 'https://www.instagram.com/remaxdogus/'}

Instagram'da: Story ekle > görseli seç > çıkartma > Link > yukarıdaki linki yapıştır.`);
    console.log('Story maili hazırlandı (elle paylaşılacak).');
  } else if (m.story && !isaret('.pub-story')) {
    await wait(5000);   // story karuselden sonra düşsün
    await yayindaMi(m.story);
    const st = await post(`${UID}/media`, { media_type: 'STORIES', image_url: m.story });
    await hazirBekle(st.id);
    const p = await post(`${UID}/media_publish`, { creation_id: st.id });
    fs.writeFileSync(DIR + '/.pub-story', m.hafta);
    console.log('✓ Story yayınlandı:', p.id);
  }
})().catch(e => { console.error('IG paylaşım hatası:', e.message); process.exit(1); });

async function cocukOlustur(u, video) {
  if (!video) return post(`${UID}/media`, { image_url: u, is_carousel_item: true });
  try { return await post(`${UID}/media`, { media_type: 'VIDEO', video_url: u, is_carousel_item: true, thumb_offset: 100 }); }
  catch (e) { console.log('thumb_offset kabul edilmedi, onsuz deneniyor:', e.message); return post(`${UID}/media`, { media_type: 'VIDEO', video_url: u, is_carousel_item: true }); }
}

async function karusel() {
  const sayfalar = VIDEO ? [VIDEO, ...m.feed.slice(1)] : m.feed;
  for (const u of sayfalar) await yayindaMi(u);
  const cocuklar = [];
  let videoOldu = !!VIDEO;
  for (let [i, u] of sayfalar.entries()) {
    if (VIDEO && i === 0) {
      try {
        const c = await cocukOlustur(u, true);
        await hazirBekle(c.id, 75);   // video işlenmesi daha uzun sürer
        cocuklar.push(c.id); continue;
      } catch (e) { console.log('Video sayfası olmadı, kapak görseliyle devam:', e.message); u = m.feed[0]; videoOldu = false; }
    }
    const c = await cocukOlustur(u, false);
    await hazirBekle(c.id);
    cocuklar.push(c.id);
  }
  const aciklama = videoOldu ? m.aciklama + '\n\nVideo yapay zeka ile oluşturulmuştur.' : m.aciklama;
  const kap = await post(`${UID}/media`, { media_type: 'CAROUSEL', children: cocuklar, caption: aciklama });
  await hazirBekle(kap.id);
  const pub = await post(`${UID}/media_publish`, { creation_id: kap.id });
  fs.writeFileSync(DIR + '/.pub', m.hafta);
  console.log('✓ Karusel yayınlandı:', pub.id);
  try {
    const p = await (await fetch(`${G}/${pub.id}?fields=permalink&access_token=${TOKEN}`)).json();
    if (p.permalink) fs.writeFileSync(DIR + '/.permalink', p.permalink);
  } catch (e) {}
}
