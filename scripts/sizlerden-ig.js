// Sizlerden Gelenler: story + gönderi karuseli Instagram'a paylaşır (sizlerden-story/.media)
// Her parça ayrı işaretlenir (.pub-story / .pub); biri hata verirse tekrar denemede yayınlanmış olan yeniden atılmaz.
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
if (!TOKEN || !UID) { console.log('IG_TOKEN / IG_USER_ID yok, paylaşım atlandı.'); process.exit(0); }
const G = 'https://graph.facebook.com/v23.0', DIR = 'sizlerden-story';
const m = JSON.parse(fs.readFileSync(DIR + '/.media', 'utf8'));
const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
if (m.date !== bugun) { console.log('Medya bugüne ait değil, paylaşım atlandı:', m.date); process.exit(0); }
const isaret = f => { try { return fs.readFileSync(`${DIR}/${f}`, 'utf8').trim() === m.key; } catch (e) { return false; } };
if (isaret('.pub')) { console.log('Bu yorum zaten paylaşılmış:', m.key); process.exit(0); }

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
  for (let i = 0; i < 30; i++) { if ((await fetch(url, { method: 'HEAD' })).ok) return; await wait(10000); }
  throw new Error('Medya yayında değil: ' + url);
}

const s = m.secim, kisa = s.metin.length > 900 ? s.metin.slice(0, 900).replace(/\s+\S*$/, '') + '…' : s.metin;
const aciklama =
`Sizlerden Gelenler 💬 ${s.ad}

“${kisa}”
— ${s.yazar}

Güveniniz için teşekkür ederiz. Satış, kiralama ve değerleme süreçlerinizde RE/MAX Doğuş ekibi yanınızda.
📞 0216 315 15 15 · RE/MAX Doğuş

#kadıköy #fikirtepe #remax #remaxdoğuş #müşteriyorumu #emlak #gayrimenkul`;

(async () => {
  if (!isaret('.pub-story')) {
    await yayindaMi(m.url);
    const st = await post(`${UID}/media`, { media_type: 'STORIES', image_url: m.url });
    await hazirBekle(st.id);
    console.log('✓ Story yayınlandı:', (await post(`${UID}/media_publish`, { creation_id: st.id })).id);
    fs.writeFileSync(DIR + '/.pub-story', m.key);
  }
  if (m.feed && m.feed.length) {
    for (const u of m.feed) await yayindaMi(u);
    const cocuklar = [];
    for (const u of m.feed) { const c = await post(`${UID}/media`, { image_url: u, is_carousel_item: true }); await hazirBekle(c.id); cocuklar.push(c.id); }
    const kap = await post(`${UID}/media`, { media_type: 'CAROUSEL', children: cocuklar, caption: aciklama });
    await hazirBekle(kap.id);
    console.log('✓ Karusel yayınlandı:', (await post(`${UID}/media_publish`, { creation_id: kap.id })).id);
  }
  fs.writeFileSync(DIR + '/.pub', m.key);
  console.log('Paylaşıldı:', s.ad, '·', s.yazar);
})().catch(e => { console.error('IG paylaşım hatası:', e.message); process.exit(1); });
