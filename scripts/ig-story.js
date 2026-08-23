// Instagram story otomatik paylaşım — IG_TOKEN secret'ı eklenince çalışır.
// Kaynak: nobet-story/.media (story.js üretir; URL'nin yayında olması için Pages deploy beklenir)
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN;
if (!TOKEN) { console.log('IG_TOKEN yok, paylaşım atlandı (dosya sadece arşivlendi).'); process.exit(0); }
const G = 'https://graph.instagram.com/v23.0';
const media = JSON.parse(fs.readFileSync('nobet-story/.media', 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));
async function api(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j;
}
(async () => {
  // medya URL'si canlı mı? (Pages deploy'u bekle, max ~5 dk)
  for (let i = 0; i < 30; i++) { const r = await fetch(media.url, { method: 'HEAD' }); if (r.ok) break; if (i === 29) throw new Error('Medya URL yayında değil: ' + media.url); await wait(10000); }
  const me = await (await fetch(`${G}/me?fields=user_id,username&access_token=${TOKEN}`)).json();
  if (me.error) throw new Error(JSON.stringify(me.error));
  const uid = me.user_id || me.id;
  const cont = await api(`${uid}/media`, media.isVideo ? { media_type: 'STORIES', video_url: media.url } : { media_type: 'STORIES', image_url: media.url });
  // video işlenene kadar bekle
  for (let i = 0; i < 30; i++) {
    const st = await (await fetch(`${G}/${cont.id}?fields=status_code&access_token=${TOKEN}`)).json();
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('Container hata verdi');
    await wait(10000);
  }
  const pub = await api(`${uid}/media_publish`, { creation_id: cont.id });
  console.log('✓ Instagram story yayınlandı:', pub.id, media.date);
})().catch(e => { console.error('IG paylaşım hatası:', e.message); process.exit(1); });
