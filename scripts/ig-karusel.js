// Tek seferlik karuseli @remaxdogus'a paylaşır: KLASOR/.media {kimlik, feed:[görsel URL], aciklama}.
// KLASOR/.pub kimliği tutar; aynı karusel ikinci kez atılmaz. Yalnızca elle (workflow_dispatch) tetiklenir.
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID, DIR = process.env.KLASOR;
if (!TOKEN || !UID || !DIR) { console.error('IG_TOKEN / IG_USER_ID / KLASOR eksik.'); process.exit(1); }
const G = 'https://graph.facebook.com/v23.0';
const m = JSON.parse(fs.readFileSync(DIR + '/.media', 'utf8'));
try { if (fs.readFileSync(DIR + '/.pub', 'utf8').trim() === m.kimlik) { console.log('Zaten paylaşılmış:', m.kimlik); process.exit(0); } } catch (e) {}

const wait = ms => new Promise(r => setTimeout(r, ms));
async function post(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j;
}
async function hazirBekle(id) {
  for (let i = 0; i < 36; i++) {
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
  for (const u of m.feed) await yayindaMi(u);
  const cocuklar = [];
  for (const u of m.feed) {
    const c = await post(`${UID}/media`, { image_url: u, is_carousel_item: true });
    await hazirBekle(c.id);
    cocuklar.push(c.id);
  }
  const kap = await post(`${UID}/media`, { media_type: 'CAROUSEL', children: cocuklar, caption: m.aciklama });
  await hazirBekle(kap.id);
  const pub = await post(`${UID}/media_publish`, { creation_id: kap.id });
  fs.writeFileSync(DIR + '/.pub', m.kimlik);
  console.log('✓ Karusel yayınlandı:', pub.id);
  const p = await (await fetch(`${G}/${pub.id}?fields=permalink&access_token=${TOKEN}`)).json();
  if (p.permalink) { fs.writeFileSync(DIR + '/.permalink', p.permalink); console.log('Link:', p.permalink); }
})().catch(e => { console.error('IG paylaşım hatası:', e.message); process.exit(1); });
