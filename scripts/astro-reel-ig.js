// Haftalık astrolog Reel'ini @remaxdogus'a paylaşır (yatirim-astroloji/.media-reel). .pub-reel ile tek sefer.
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
if (!TOKEN || !UID) { console.log('IG_TOKEN / IG_USER_ID yok, paylaşım atlandı.'); process.exit(0); }
const G = 'https://graph.facebook.com/v23.0', DIR = 'yatirim-astroloji';
const m = JSON.parse(fs.readFileSync(DIR + '/.media-reel', 'utf8'));
try { if (fs.readFileSync(DIR + '/.pub-reel', 'utf8').trim() === m.hafta) { console.log('Reel zaten paylaşılmış:', m.hafta); process.exit(0); } } catch (e) {}

const wait = ms => new Promise(r => setTimeout(r, ms));
async function post(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j;
}
(async () => {
  for (let i = 0; i < 30; i++) { if ((await fetch(m.video + '?cb=' + Date.now(), { method: 'HEAD' })).ok) break; if (i === 29) throw new Error('Video yayında değil: ' + m.video); await wait(10000); }
  const c = await post(`${UID}/media`, { media_type: 'REELS', video_url: m.video, cover_url: m.kapak, caption: m.aciklama, share_to_feed: true });
  for (let i = 0; i < 60; i++) {
    const st = await (await fetch(`${G}/${c.id}?fields=status_code,status&access_token=${TOKEN}`)).json();
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('Reel işlenemedi: ' + JSON.stringify(st));
    if (i === 59) throw new Error('Reel zaman aşımı');
    await wait(10000);
  }
  const p = await post(`${UID}/media_publish`, { creation_id: c.id });
  fs.writeFileSync(DIR + '/.pub-reel', m.hafta);
  console.log('✓ Reel yayınlandı:', p.id);
})().catch(e => { console.error('IG Reel hatası:', e.message); process.exit(1); });
