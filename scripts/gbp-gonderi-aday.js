// @remaxdogus Fikirtepe reels'lerini listeler, kapaklarını gbp-gonderi/aday/ altına indirir (Google gönderisi adayları).
const fs = require('fs');
(async () => {
  const T = process.env.IG_TOKEN, U = process.env.IG_USER_ID;
  let url = `https://graph.facebook.com/v21.0/${U}/media?fields=id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp&limit=100&access_token=${T}`;
  const liste = [];
  for (let s = 0; s < 4 && url; s++) { const j = await (await fetch(url)).json(); if (j.error) throw new Error(JSON.stringify(j.error)); liste.push(...j.data); url = j.paging?.next; }
  const reels = liste.filter(m => m.media_product_type === 'REELS' && /fikirtepe|güncel proje/i.test(m.caption || ''));
  fs.mkdirSync('gbp-gonderi/aday', { recursive: true });
  const out = [];
  for (const m of reels) {
    const r = await fetch(m.thumbnail_url); if (!r.ok) continue;
    fs.writeFileSync(`gbp-gonderi/aday/${m.id}.jpg`, Buffer.from(await r.arrayBuffer()));
    out.push({ id: m.id, tarih: m.timestamp, link: m.permalink, aciklama: m.caption });
  }
  fs.writeFileSync('gbp-gonderi/aday.json', JSON.stringify(out, null, 1));
  console.log('toplam', liste.length, 'fikirtepe reels', out.length);
})().catch(e => { console.error(e.message || e); process.exit(1); });
