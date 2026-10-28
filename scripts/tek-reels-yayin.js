// Tek seferlik Reels + Story paylaşımı (Umut'un onayıyla). istek.json'daki videoyu Reels ve story olarak yayınlar.
// sonuc.json varsa (daha önce yayınlandıysa) tekrar paylaşmaz.
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
const KLASOR = process.argv[2];
const istek = JSON.parse(fs.readFileSync(KLASOR + '/istek.json', 'utf8'));
const SONUC = KLASOR + '/sonuc.json';
let sonuc = {}; try { sonuc = JSON.parse(fs.readFileSync(SONUC, 'utf8')); } catch (e) {}
const G = 'https://graph.facebook.com/v23.0';
const RAW = 'https://raw.githubusercontent.com/dogusremax/dogusportal/' + process.env.DAL + '/';
const wait = ms => new Promise(r => setTimeout(r, ms));
async function post(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j;
}
async function kur(b) {
  const cont = await post(`${UID}/media`, b);
  for (let i = 0; i < 60; i++) {
    const st = await (await fetch(`${G}/${cont.id}?fields=status_code,status&access_token=${TOKEN}`)).json();
    if (st.status_code === 'FINISHED') return cont;
    if (st.status_code === 'ERROR') throw new Error('Container ERROR: ' + JSON.stringify(st));
    await wait(10000);
  }
  throw new Error('Container zaman aşımı');
}
const kaydet = () => fs.writeFileSync(SONUC, JSON.stringify(sonuc, null, 2));
(async () => {
  if (!TOKEN || !UID) throw new Error('IG_TOKEN / IG_USER_ID yok');
  const video = RAW + istek.video, kapak = RAW + istek.kapak;
  for (const u of [video, kapak]) { const r = await fetch(u, { method: 'HEAD' }); if (!r.ok) throw new Error('Dosya erişilemiyor: ' + u); }
  if (!sonuc.reels) {
    const c = await kur({ media_type: 'REELS', video_url: video, cover_url: kapak, caption: istek.aciklama, share_to_feed: true });
    const p = await post(`${UID}/media_publish`, { creation_id: c.id });
    const info = await (await fetch(`${G}/${p.id}?fields=permalink&access_token=${TOKEN}`)).json();
    sonuc.reels = { id: p.id, link: info.permalink, zaman: new Date().toISOString() }; kaydet();
    console.log('✓ Reels yayınlandı:', p.id, info.permalink);
  } else console.log('Reels zaten yayınlanmış:', sonuc.reels.id);
  if (istek.story && !sonuc.story) {
    const c = await kur({ media_type: 'STORIES', video_url: video });
    const p = await post(`${UID}/media_publish`, { creation_id: c.id });
    sonuc.story = { id: p.id, zaman: new Date().toISOString() }; kaydet();
    console.log('✓ Story yayınlandı:', p.id);
  } else if (sonuc.story) console.log('Story zaten yayınlanmış:', sonuc.story.id);
})().catch(e => { sonuc.hata = e.message; kaydet(); console.error('HATA:', e.message); process.exit(1); });
