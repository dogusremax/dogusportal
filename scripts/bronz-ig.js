// RE/MAX Europe Bronz statü: gönderi (3:4) + story, tüm danışmanlar etiketli (Umut onayı 27 Eki 2026)
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
if (!TOKEN || !UID) { console.log('IG_TOKEN / IG_USER_ID yok.'); process.exit(1); }
const HEDEF = process.env.HEDEF || 'ikisi';
const G = 'https://graph.facebook.com/v23.0';
const KOK = 'https://dogusportal.com/paylasim/bronz/';
const wait = ms => new Promise(r => setTimeout(r, ms));

async function post(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
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
  for (let i = 0; i < 30; i++) { if ((await fetch(url, { method: 'HEAD' })).ok) return; await wait(10000); }
  throw new Error('Medya yayında değil: ' + url);
}
async function link(id) {
  const j = await (await fetch(`${G}/${id}?fields=permalink,media_type,timestamp&access_token=${TOKEN}`)).json();
  return j.permalink || JSON.stringify(j);
}

// Danışmanlar (broker Umut hariç) + ortak hesap
const ETIKET = JSON.parse(fs.readFileSync('data/danismanlar.json', 'utf8'))
  .filter(d => d.instagram && d.id !== 'umut').map(d => d.instagram.replace(/^@/, ''));
if (!ETIKET.includes('aysunorhanofficial')) ETIKET.push('aysunorhanofficial');
console.log('Etiketler:', ETIKET.join(', '));

const aciklama =
`Avrupa'dan gelen gurur verici haber! 🏆

RE/MAX Doğuş olarak RE/MAX Europe Honors Program 2026'da Bronz statüye ulaştık. Bu başarı, her gün sahada emek veren danışmanlarımızın ve bize güvenen siz değerli müşterilerimizin eseri.

Hepinize teşekkür ediyoruz. Sıradaki hedefimiz: Gümüş! 🥈

#REMAXDoğuş #REMAXEurope #HonorsProgram #Fikirtepe #Kadıköy #Gayrimenkul`;

(async () => {
  if (HEDEF === 'ikisi' || HEDEF === 'gonderi') {
    const url = KOK + 'bronz-gonderi.jpg'; await yayindaMi(url);
    const etiketler = ETIKET.map((username, i) => ({ username, x: +(0.08 + 0.84 * i / Math.max(ETIKET.length - 1, 1)).toFixed(3), y: i % 2 ? 0.88 : 0.82 }));
    const c = await post(`${UID}/media`, { image_url: url, caption: aciklama, user_tags: etiketler });
    await hazirBekle(c.id);
    const pub = await post(`${UID}/media_publish`, { creation_id: c.id });
    console.log('✓ Gönderi yayınlandı:', pub.id, await link(pub.id));
  }
  if (HEDEF === 'ikisi' || HEDEF === 'story') {
    const url = KOK + 'bronz-story.jpg'; await yayindaMi(url);
    let st = null, etiketli = false;
    try { st = await post(`${UID}/media`, { media_type: 'STORIES', image_url: url, user_tags: ETIKET.map(username => ({ username })) }); await hazirBekle(st.id); etiketli = true; }
    catch (e) { console.log('! Story etiketle olmadı, etiketsiz deneniyor:', e.message); st = null; }
    if (!st) { st = await post(`${UID}/media`, { media_type: 'STORIES', image_url: url }); await hazirBekle(st.id); }
    const pub = await post(`${UID}/media_publish`, { creation_id: st.id });
    console.log('✓ Story yayınlandı:', pub.id, etiketli ? '(etiketli)' : '(ETİKETSİZ)', await link(pub.id));
  }
})().catch(e => { console.error('IG paylaşım hatası:', e.message); process.exit(1); });
