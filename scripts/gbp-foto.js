// Google İşletme Profili fotoğraflarını indirir: assets/ofis/gbp/ + liste.json (kategori, tarih).
// Kimlik: GOOGLE_PLACES_KEY (google-yorum.js ile aynı).
const fs = require('fs');
(async () => {
  const k = JSON.parse(process.env.GOOGLE_PLACES_KEY || '{}');
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: k.client_id, client_secret: k.client_secret, refresh_token: k.refresh_token, grant_type: 'refresh_token' }) })).json();
  const al = async u => { const r = await fetch(u, { headers: { Authorization: 'Bearer ' + t.access_token } }); const j = await r.json(); if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 300)); return j; };
  const hesaplar = (await al('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')).accounts || [];
  let sec;
  for (const h of hesaplar) {
    const l = await al(`https://mybusinessbusinessinformation.googleapis.com/v1/${h.name}/locations?readMask=name,title&pageSize=100`);
    for (const x of l.locations || []) if (!sec || /fikirtepe/i.test(x.title)) sec = { hesap: h.name, ...x };
  }
  const medya = []; let sayfa = '';
  do {
    const r = await al(`https://mybusiness.googleapis.com/v4/${sec.hesap}/${sec.name}/media?pageSize=100${sayfa ? '&pageToken=' + sayfa : ''}`);
    medya.push(...(r.mediaItems || [])); sayfa = r.nextPageToken;
  } while (sayfa);
  fs.mkdirSync('assets/ofis/gbp', { recursive: true });
  const liste = [];
  for (const [i, m] of medya.entries()) {
    if (m.mediaFormat !== 'PHOTO' || !m.googleUrl) continue;
    const ad = String(i + 1).padStart(2, '0') + '-' + (m.locationAssociation?.category || 'diger').toLowerCase() + '.jpg';
    const r = await fetch(m.googleUrl.replace(/=[^/]*$/, '') + '=s2000');
    if (!r.ok) continue;
    fs.writeFileSync('assets/ofis/gbp/' + ad, Buffer.from(await r.arrayBuffer()));
    liste.push({ dosya: ad, kategori: m.locationAssociation?.category || null, tarih: m.createTime, boyut: m.dimensions, aciklama: m.description || '' });
  }
  fs.writeFileSync('assets/ofis/gbp/liste.json', JSON.stringify(liste, null, 1));
  console.log(sec.title, medya.length, 'medya,', liste.length, 'fotoğraf indirildi');
})().catch(e => { console.error(e.message || e); process.exit(1); });
