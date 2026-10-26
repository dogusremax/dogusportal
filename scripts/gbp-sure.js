// Fikirtepe reels süreleri (Google profil videosu en fazla 30 sn). Çıktı: gbp-gonderi/sureler.json
const fs = require('fs'), { execSync } = require('child_process');
(async () => {
  const T = process.env.IG_TOKEN;
  const aday = JSON.parse(fs.readFileSync('gbp-gonderi/aday.json', 'utf8'));
  const out = [];
  for (const a of aday) {
    const j = await (await fetch(`https://graph.facebook.com/v21.0/${a.id}?fields=media_url&access_token=${T}`)).json();
    let sure = null;
    try {
      fs.writeFileSync('/tmp/v.mp4', Buffer.from(await (await fetch(j.media_url)).arrayBuffer()));
      sure = +execSync('ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/v.mp4', { timeout: 60000 }).toString().trim();
    } catch (e) { console.error(a.id, j.error?.message || '', String(e.message).slice(0, 200)); }
    out.push({ id: a.id, sure: sure && Math.round(sure * 10) / 10, link: a.link, baslik: (a.aciklama || '').split('\n')[0].slice(0, 80) });
  }
  fs.writeFileSync('gbp-gonderi/sureler.json', JSON.stringify(out, null, 1));
  console.log(out.filter(x => x.sure && x.sure <= 30).length, '/', out.length);
})();
