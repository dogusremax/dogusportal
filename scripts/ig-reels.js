// Instagram Reels paylaşımı — Graph API (story betiğiyle aynı token akışı)
// Kullanım: node scripts/ig-reels.js <klasör>   (paylasim/<klasör>/video.mp4, kapak.jpg, aciklama.txt)
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
if (!TOKEN || !UID) { console.log('IG_TOKEN / IG_USER_ID yok, paylaşım atlandı.'); process.exit(0); }
const G = 'https://graph.facebook.com/v23.0';
const dir = process.argv[2];
if (!dir || !fs.existsSync(`paylasim/${dir}/video.mp4`)) { console.error('Klasör/video bulunamadı:', dir); process.exit(1); }
const pubFile = `paylasim/${dir}/.pub`;
if (fs.existsSync(pubFile)) { console.log('Bu Reels zaten yayınlanmış, atlandı:', fs.readFileSync(pubFile, 'utf8').trim()); process.exit(0); }
const base = `https://dogusportal.com/paylasim/${dir}`;
const caption = fs.readFileSync(`paylasim/${dir}/aciklama.txt`, 'utf8').trim();
const wait = ms => new Promise(r => setTimeout(r, ms));
async function post(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j;
}
(async () => {
  for (const f of ['video.mp4', 'kapak.jpg']) {
    for (let i = 0; i < 40; i++) { const r = await fetch(`${base}/${f}`, { method: 'HEAD' }); if (r.ok) break; if (i === 39) throw new Error('Medya yayında değil: ' + f); await wait(10000); }
  }
  const cont = await post(`${UID}/media`, { media_type: 'REELS', video_url: `${base}/video.mp4`, cover_url: `${base}/kapak.jpg`, caption, share_to_feed: true });
  for (let i = 0; i < 60; i++) {
    const st = await (await fetch(`${G}/${cont.id}?fields=status_code,status&access_token=${TOKEN}`)).json();
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('Container ERROR: ' + JSON.stringify(st));
    if (i === 59) throw new Error('Video işlenmesi zaman aşımı');
    await wait(10000);
  }
  const pub = await post(`${UID}/media_publish`, { creation_id: cont.id });
  const link = await (await fetch(`${G}/${pub.id}?fields=permalink&access_token=${TOKEN}`)).json();
  console.log('✓ Instagram Reels yayınlandı:', pub.id, link.permalink || '');
  fs.writeFileSync(pubFile, `${pub.id} ${link.permalink || ''}\n`);
})().catch(e => { console.error('IG Reels paylaşım hatası:', e.message); process.exit(1); });
