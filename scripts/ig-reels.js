// Tek seferlik Reels'i @remaxdogus'a paylaşır: KLASOR/.media {kimlik, video, kapak, aciklama}.
// ISLEM=kontrol → Instagram videoyu ve kapağı işleyebiliyor mu dener, YAYINLAMAZ.
// ISLEM=yayinla → yayınlar (yalnız Umut onayından sonra elle tetiklenir). KLASOR/.pub aynı Reels'in ikinci kez atılmasını engeller.
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID, DIR = process.env.KLASOR, ISLEM = process.env.ISLEM || 'kontrol';
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
  for (let i = 0; i < 60; i++) {
    const st = await (await fetch(`${G}/${id}?fields=status_code,status&access_token=${TOKEN}`)).json();
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR') throw new Error('Container ERROR: ' + JSON.stringify(st));
    await wait(10000);
  }
  throw new Error('Container zaman aşımı: ' + id);
}
async function yayindaMi(url) {
  for (let i = 0; i < 30; i++) { if ((await fetch(url + '?cb=' + Date.now(), { method: 'HEAD' })).ok) return; await wait(10000); }
  throw new Error('Medya yayında değil: ' + url);
}

(async () => {
  await yayindaMi(m.video); await yayindaMi(m.kapak);
  const kap = await post(`${UID}/media`, { media_type: 'REELS', video_url: m.video, cover_url: m.kapak, caption: m.aciklama, share_to_feed: true });
  await hazirBekle(kap.id);
  console.log('✓ Instagram videoyu ve kapağı işledi:', kap.id);
  if (ISLEM !== 'yayinla') { console.log('Kontrol modu: YAYINLANMADI.'); return; }
  const pub = await post(`${UID}/media_publish`, { creation_id: kap.id });
  fs.writeFileSync(DIR + '/.pub', m.kimlik);
  console.log('✓ Reels yayınlandı:', pub.id);
  const p = await (await fetch(`${G}/${pub.id}?fields=permalink&access_token=${TOKEN}`)).json();
  if (p.permalink) { fs.writeFileSync(DIR + '/.permalink', p.permalink); console.log('Link:', p.permalink); }
})().catch(e => { console.error('IG Reels hatası:', e.message); process.exit(1); });
