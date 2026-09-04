// Kira artış görsellerini Instagram'a paylaşır: story + feed karusel
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
if (!TOKEN || !UID) { console.log('IG_TOKEN / IG_USER_ID yok, paylaşım atlandı.'); process.exit(0); }

const HEDEF = process.env.HEDEF || 'ikisi';
const G = 'https://graph.facebook.com/v23.0';
const m = JSON.parse(fs.readFileSync('kira-story/.media', 'utf8'));

// Aynı dönem daha önce paylaşıldıysa çık
try {
  if (fs.readFileSync('kira-story/.pub', 'utf8').trim() === m.donem) {
    console.log('Bu dönem zaten paylaşılmış:', m.donem); process.exit(0);
  }
} catch (e) {}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function post(p, body) {
  const r = await fetch(`${G}/${p}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN })
  });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j;
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
  for (let i = 0; i < 30; i++) {
    const r = await fetch(url, { method: 'HEAD' });
    if (r.ok) return;
    await wait(10000);
  }
  throw new Error('Medya yayında değil: ' + url);
}

const aciklama =
`${m.ay} kira artış oranı açıklandı: %${m.oran}

${m.ay} ayında sözleşmesi yenilenen konut ve iş yeri kiralarında artış bu oranı aşamaz. Oran, TÜİK'in açıkladığı TÜFE 12 aylık ortalamalara göre değişimdir (TBK m.344). Sözleşmede daha yüksek bir oran yazsa bile bu sınır geçerlidir.

Kira tespiti, yenileme ve tahliye süreçlerinde doğru yol haritası için bize ulaşın.
📞 0216 315 15 15 · RE/MAX Doğuş

#kadıköy #kira #kiraartışı #emlak #gayrimenkul`;

(async () => {
  // 1) Story
  if (HEDEF === 'ikisi' || HEDEF === 'story') {
    const kareler = Array.isArray(m.story) ? m.story : [m.story];
    for (const u of kareler) await yayindaMi(u);
    for (let i = 0; i < kareler.length; i++) {
      const st = await post(`${UID}/media`, { media_type: 'STORIES', image_url: kareler[i] });
      await hazirBekle(st.id);
      const stPub = await post(`${UID}/media_publish`, { creation_id: st.id });
      console.log(`✓ Story ${i + 1}/${kareler.length} yayınlandı:`, stPub.id);
      if (i < kareler.length - 1) await wait(5000);   // sıra bozulmasın
    }
  }

  // 2) Feed karusel
  if (HEDEF === 'ikisi' || HEDEF === 'gonderi') {
  for (const u of m.feed) await yayindaMi(u);
  const cocuklar = [];
  for (const u of m.feed) {
    const c = await post(`${UID}/media`, { image_url: u, is_carousel_item: true });
    await hazirBekle(c.id);
    cocuklar.push(c.id);
  }
  const kap = await post(`${UID}/media`, {
    media_type: 'CAROUSEL', children: cocuklar, caption: aciklama
  });
  await hazirBekle(kap.id);
  const kapPub = await post(`${UID}/media_publish`, { creation_id: kap.id });
  console.log('✓ Karusel yayınlandı:', kapPub.id);
  }

  if (HEDEF === 'ikisi') fs.writeFileSync('kira-story/.pub', m.donem);
})().catch(e => { console.error('IG paylaşım hatası:', e.message); process.exit(1); });
