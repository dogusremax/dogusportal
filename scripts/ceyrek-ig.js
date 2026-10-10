// Çeyrek şampiyonlarını @remaxdogus'ta yayınlar: önce gönderi carousel'i, sonra story'ler sırayla.
// Her adımdan sonra performans/ceyrek/.pub güncellenir; yeniden çalışırsa kaldığı yerden devam eder, mükerrer atmaz.
// DRY_RUN=1 ise hiçbir şey yayınlamaz, sadece ne yapacağını yazar.
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID, DRY = process.env.DRY_RUN === '1';
const G = 'https://graph.facebook.com/v23.0', PUB = 'performans/ceyrek/.pub';
let media; try { media = JSON.parse(fs.readFileSync('performans/ceyrek/.media', 'utf8')); } catch (e) { console.log('.media yok, paylaşım atlandı.'); process.exit(0); }
let pub = { q: media.q, carousel: null, story: 0, tamam: false };
try { const p = JSON.parse(fs.readFileSync(PUB, 'utf8')); if (p.q === media.q) pub = p; } catch (e) {}
if (pub.tamam) { console.log('Zaten yayınlanmış, atlandı:', media.q); process.exit(0); }
if (DRY) { console.log('DRY_RUN — yayınlanmayacak.', JSON.stringify({ ...media, caption: media.caption.slice(0, 80) + '…' }, null, 1)); process.exit(0); }
if (!TOKEN || !UID) { console.error('IG_TOKEN / IG_USER_ID yok.'); process.exit(1); }
const kaydet = () => fs.writeFileSync(PUB, JSON.stringify(pub));
const wait = ms => new Promise(r => setTimeout(r, ms));
async function post(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j;
}
async function hazir(id) {
  for (let i = 0; i < 60; i++) {
    const st = await (await fetch(`${G}/${id}?fields=status_code&access_token=${TOKEN}`)).json();
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR') throw new Error('Container ERROR ' + id);
    await wait(5000);
  }
  throw new Error('Container zaman aşımı ' + id);
}
async function yayinda(url) {
  // video Pages'ten gelir, yayına çıkması birkaç dakika sürebilir
  for (let i = 0; i < 60; i++) { if ((await fetch(url, { method: 'HEAD' })).ok) return; await wait(10000); }
  throw new Error('Görsel yayında değil: ' + url);
}
(async () => {
  for (const u of [...media.gonderi, ...media.story]) await yayinda(u);
  if (!pub.carousel) {
    const children = [];
    for (const u of media.gonderi) children.push((await post(`${UID}/media`, { image_url: u, is_carousel_item: true })).id);
    const cont = await post(`${UID}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: media.caption });
    await hazir(cont.id);
    pub.carousel = (await post(`${UID}/media_publish`, { creation_id: cont.id })).id; kaydet();
    console.log('✓ carousel yayınlandı:', pub.carousel);
  }
  for (let i = pub.story; i < media.story.length; i++) {
    const u = media.story[i];   // story kapağı dönen kupalı videodur (.mp4)
    const cont = await post(`${UID}/media`, /\.mp4$/i.test(u) ? { media_type: 'STORIES', video_url: u } : { media_type: 'STORIES', image_url: u });
    await hazir(cont.id);
    await post(`${UID}/media_publish`, { creation_id: cont.id });
    pub.story = i + 1; kaydet();
    console.log('✓ story', i + 1, '/', media.story.length);
  }
  pub.tamam = true; kaydet();
  console.log('✓ Çeyrek şampiyonları yayınlandı:', media.q);
})().catch(e => { console.error('IG paylaşım hatası:', e.message); process.exit(1); });
