// Google İşletme Profili performansı (Haritalar/Arama görüntülenme, arama, yol tarifi, web tıklaması, arama kelimeleri).
// Zamanlama (26.10.2026): Danışman Takip ZAMANLI_ISLER_ 09:30 → gbpRaporTetikle (Pazartesi haftalık, ayın 5i aylık);
// metni apps-script gbp-rapor.yml bu dosyanın çıktısından kurar ve Umut'a mail + telefon bildirimi atar.
// Kimlik google-yorum.js ile aynı: GOOGLE_PLACES_KEY. Çıktı: data/gbp-performans.json + log.
const fs = require('fs');
const METRIKLER = ['BUSINESS_IMPRESSIONS_MOBILE_MAPS', 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS', 'WEBSITE_CLICKS', 'BUSINESS_CONVERSATIONS'];

(async () => {
  const k = JSON.parse(process.env.GOOGLE_PLACES_KEY || '{}');
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: k.client_id, client_secret: k.client_secret, refresh_token: k.refresh_token, grant_type: 'refresh_token' }) })).json();
  const al = async u => { const r = await fetch(u, { headers: { Authorization: 'Bearer ' + t.access_token } }); const j = await r.json(); if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 600)); return j; };

  const hesaplar = (await al('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')).accounts || [];
  let konum;
  for (const h of hesaplar) {
    const l = await al(`https://mybusinessbusinessinformation.googleapis.com/v1/${h.name}/locations?readMask=name,title&pageSize=100`);
    konum = konum || (l.locations || []).find(x => /fikirtepe/i.test(x.title)) || (l.locations || [])[0];
  }
  console.log('Konum:', konum.name, konum.title);

  const bit = new Date(), bas = new Date(Date.now() - 400 * 864e5);
  const q = new URLSearchParams();
  METRIKLER.forEach(m => q.append('dailyMetrics', m));
  [['startDate', bas], ['endDate', bit]].forEach(([p, d]) => {
    q.append('dailyRange.' + p + '.year', d.getUTCFullYear()); q.append('dailyRange.' + p + '.month', d.getUTCMonth() + 1); q.append('dailyRange.' + p + '.day', d.getUTCDate());
  });
  const r = await al(`https://businessprofileperformance.googleapis.com/v1/${konum.name}:fetchMultiDailyMetricsTimeSeries?${q}`);
  const gunluk = {}; // tarih -> metrik -> değer
  for (const grup of r.multiDailyMetricTimeSeries || []) for (const s of grup.dailyMetricTimeSeries || []) {
    for (const v of s.timeSeries?.datedValues || []) {
      const d = `${v.date.year}-${String(v.date.month).padStart(2, '0')}-${String(v.date.day).padStart(2, '0')}`;
      (gunluk[d] ||= {})[s.dailyMetric] = +(v.value || 0);
    }
  }
  const tarihler = Object.keys(gunluk).sort();
  const dolu = tarihler.filter(d => Object.values(gunluk[d]).some(x => x > 0));
  const son = dolu[dolu.length - 1];
  console.log('Veri aralığı:', tarihler[0], '→', tarihler[tarihler.length - 1], '| son dolu gün:', son);

  const topla = (d1, d2) => { const o = {}; for (const d of tarihler) if (d >= d1 && d <= d2) for (const [m, x] of Object.entries(gunluk[d])) o[m] = (o[m] || 0) + x; return o; };
  const gun = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
  const ozet = o => ({ haritalar: (o.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0) + (o.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0),
    arama: (o.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0) + (o.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0),
    telefon: o.CALL_CLICKS || 0, yolTarifi: o.BUSINESS_DIRECTION_REQUESTS || 0, webTik: o.WEBSITE_CLICKS || 0, mesaj: o.BUSINESS_CONVERSATIONS || 0 });
  const donemler = {
    son7: [gun(son, -6), son], onceki7: [gun(son, -13), gun(son, -7)],
    son28: [gun(son, -27), son], onceki28: [gun(son, -55), gun(son, -28)], gecenYilAyni28: [gun(son, -27 - 364), gun(son, -364)],
  };
  const sonuc = { konum: konum.title, sonDoluGun: son, donemler: {}, aylik: {} };
  for (const [ad, [a, b]] of Object.entries(donemler)) { sonuc.donemler[ad] = { aralik: a + ' → ' + b, ...ozet(topla(a, b)) }; }
  for (const d of tarihler) { const ay = d.slice(0, 7); sonuc.aylik[ay] = sonuc.aylik[ay] || {}; for (const [m, x] of Object.entries(gunluk[d])) sonuc.aylik[ay][m] = (sonuc.aylik[ay][m] || 0) + x; }
  for (const ay of Object.keys(sonuc.aylik)) sonuc.aylik[ay] = ozet(sonuc.aylik[ay]);

  // Arama kelimeleri (aylık, son 3 ay)
  try {
    const b3 = new Date(Date.now() - 100 * 864e5);
    const kq = new URLSearchParams({ 'monthlyRange.startMonth.year': b3.getUTCFullYear(), 'monthlyRange.startMonth.month': b3.getUTCMonth() + 1,
      'monthlyRange.endMonth.year': bit.getUTCFullYear(), 'monthlyRange.endMonth.month': bit.getUTCMonth() + 1, pageSize: 100 });
    const kw = await al(`https://businessprofileperformance.googleapis.com/v1/${konum.name}/searchkeywords/impressions/monthly?${kq}`);
    sonuc.kelimeler = (kw.searchKeywordsCounts || []).map(x => ({ kelime: x.searchKeyword, deger: x.insightsValue?.value ? +x.insightsValue.value : '<' + x.insightsValue?.threshold }));
    // Geçen ayın kelimeleri (aylık rapor için)
    const ga = new Date(Date.UTC(bit.getUTCFullYear(), bit.getUTCMonth() - 1, 1));
    const gq = new URLSearchParams({ 'monthlyRange.startMonth.year': ga.getUTCFullYear(), 'monthlyRange.startMonth.month': ga.getUTCMonth() + 1,
      'monthlyRange.endMonth.year': ga.getUTCFullYear(), 'monthlyRange.endMonth.month': ga.getUTCMonth() + 1, pageSize: 20 });
    const gk = await al(`https://businessprofileperformance.googleapis.com/v1/${konum.name}/searchkeywords/impressions/monthly?${gq}`);
    sonuc.kelimelerGecenAy = (gk.searchKeywordsCounts || []).map(x => ({ kelime: x.searchKeyword, deger: x.insightsValue?.value ? +x.insightsValue.value : '<' + x.insightsValue?.threshold }));
  } catch (e) { sonuc.kelimeHata = String(e.message).slice(0, 400); }

  console.log(JSON.stringify(sonuc, null, 1));
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/gbp-performans.json', JSON.stringify({ zaman: new Date().toISOString(), ...sonuc }, null, 1));
})().catch(e => { console.error('HATA', e.message || e); process.exit(1); });
