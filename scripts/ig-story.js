// Instagram story otomatik paylaşım — Facebook Graph API (Page token)
const fs = require('fs');
const TOKEN = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
if (!TOKEN || !UID) { console.log('IG_TOKEN / IG_USER_ID yok, paylaşım atlandı.'); process.exit(0); }
const G = 'https://graph.facebook.com/v23.0';
const media = JSON.parse(fs.readFileSync('nobet-story/.media', 'utf8'));
const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
if (media.date !== bugun) { console.log('Medya bugüne ait değil, paylaşım atlandı:', media.date); process.exit(0); }
try { if (fs.readFileSync('nobet-story/.pub', 'utf8').trim() === media.date) { console.log('Bugün zaten yayınlanmış, atlandı:', media.date); process.exit(0); } } catch (e) {}
const wait = ms => new Promise(r => setTimeout(r, ms));
// "Bugün paylaşıldı" kaydının repodan AYRI kopyası Danışman Takip'te (Script Properties + LockService) tutulur.
// Repoya aynı anda commit gelince .pub kaybolabiliyor (17 Ekim'de story iki kez atıldı); bu kilit ondan etkilenmez.
const KILIT = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec?action=nobetKilit&k=dogus-performans&tarih=' + media.date;
async function kilit(islem, id) {
  for (let i = 1; i <= 3; i++) {
    try {
      const j = await (await fetch(KILIT + '&islem=' + islem + (id ? '&id=' + id : ''))).json();
      if (j && 'durum' in j) return j;
      console.log('Kilit cevabı beklenmedik:', JSON.stringify(j).slice(0, 200));
    } catch (e) { console.log('Kilit erişilemedi:', e.message); }
    await wait(5000 * i);
  }
  return null;
}
async function post(p, body) {
  const r = await fetch(`${G}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: TOKEN }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j;
}
// Takvimdeki nöbetçinin Instagram kullanıcı adı (data/danismanlar.json → instagram); sadece o kişi etiketlenir
const kucuk = x => String(x || '').toLocaleLowerCase('tr').trim();
let etiket = [];
try {
  const d = JSON.parse(fs.readFileSync('data/danismanlar.json', 'utf8')).find(d => d.instagram && kucuk(d.ad) === kucuk(media.kim));
  if (d) etiket = [d.instagram.replace(/^@/, '')];
} catch (e) {}
console.log('Nöbetçi:', media.kim || '?', '| etiket:', etiket.join(', ') || '(yok)');
let kilitAlindi = false, yayinIstegi = false;
(async () => {
  const k = await kilit('al');
  if (k && !k.alindi) {
    console.log('Bugünün story kilidi zaten alınmış (' + k.deger + '), ikinci paylaşım yapılmadı.');
    if (k.durum === 'tamam') fs.writeFileSync('nobet-story/.pub', media.date);
    return;
  }
  if (k) kilitAlindi = true; else console.log('! Kilit servisine ulaşılamadı, sadece .pub kontrolüyle devam ediliyor.');
  for (let i = 0; i < 30; i++) { const r = await fetch(media.url, { method: 'HEAD' }); if (r.ok) break; if (i === 29) throw new Error('Medya URL yayında değil: ' + media.url); await wait(10000); }
  const sade = media.isVideo ? { media_type: 'STORIES', video_url: media.url } : { media_type: 'STORIES', image_url: media.url };
  const kur = async b => {
    const cont = await post(`${UID}/media`, b);
    for (let i = 0; i < 36; i++) {
      const st = await (await fetch(`${G}/${cont.id}?fields=status_code&access_token=${TOKEN}`)).json();
      if (st.status_code === 'FINISHED') return cont;
      if (st.status_code === 'ERROR') throw new Error('Container ERROR');
      await wait(10000);
    }
    throw new Error('Container zaman aşımı');
  };
  // Nöbetçi danışman story'de etiketlenir; etiketle olmazsa (gizli hesap, değişmiş kullanıcı adı) etiketsiz paylaşılır
  let cont;
  if (etiket.length) {
    try { cont = await kur({ ...sade, user_tags: etiket.map(username => ({ username })) }); }
    catch (e) { console.log('! Etiketle olmadı, etiketsiz deneniyor:', e.message); }
  }
  if (!cont) cont = await kur(sade);
  yayinIstegi = true;
  const pub = await post(`${UID}/media_publish`, { creation_id: cont.id });
  console.log('✓ Instagram story yayınlandı:', pub.id, media.date);
  fs.writeFileSync('nobet-story/.pub', media.date);
  if (kilitAlindi && !(await kilit('tamam', pub.id))) console.log('! Kilit "tamam" yazılamadı (kilit "bekliyor" kalır, tekrar paylaşılmaz).');
})().catch(async e => {
  console.error('IG paylaşım hatası:', e.message);
  // Yayın isteği hiç gitmediyse kilidi bırak ki yedek deneme paylaşabilsin; gittiyse (sonucu belirsiz) bırakma, çift story olmasın
  if (kilitAlindi && !yayinIstegi) await kilit('birak');
  process.exit(1);
});
