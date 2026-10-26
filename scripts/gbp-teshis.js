// Tek seferlik teşhis: arama görüntülenmesi neden düştü (günlük seri, aylık kelimeler, gönderiler, profil bilgisi).
const fs = require('fs');
(async () => {
  const k = JSON.parse(process.env.GOOGLE_PLACES_KEY || '{}');
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: k.client_id, client_secret: k.client_secret, refresh_token: k.refresh_token, grant_type: 'refresh_token' }) })).json();
  const al = async u => { const r = await fetch(u, { headers: { Authorization: 'Bearer ' + t.access_token } }); const j = await r.json(); if (!r.ok) return { HATA: r.status, j: JSON.stringify(j).slice(0, 300) }; return j; };
  const out = {};
  const hes = (await al('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')).accounts;
  let konum, hesap;
  for (const h of hes) { const l = await al(`https://mybusinessbusinessinformation.googleapis.com/v1/${h.name}/locations?readMask=name,title&pageSize=100`); const x = (l.locations || []).find(x => /fikirtepe/i.test(x.title)); if (x) { konum = x.name; hesap = h.name; } }
  out.profil = await al(`https://mybusinessbusinessinformation.googleapis.com/v1/${konum}?readMask=title,categories,regularHours,specialHours,websiteUri,phoneNumbers,storefrontAddress,openInfo,metadata,profile,serviceArea`);
  const M = ['BUSINESS_IMPRESSIONS_MOBILE_SEARCH', 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS'];
  const q = new URLSearchParams(); M.forEach(m => q.append('dailyMetrics', m));
  const b = new Date(Date.now() - 540 * 864e5), e = new Date();
  [['startDate', b], ['endDate', e]].forEach(([p, d]) => { q.append('dailyRange.' + p + '.year', d.getUTCFullYear()); q.append('dailyRange.' + p + '.month', d.getUTCMonth() + 1); q.append('dailyRange.' + p + '.day', d.getUTCDate()); });
  const r = await al(`https://businessprofileperformance.googleapis.com/v1/${konum}:fetchMultiDailyMetricsTimeSeries?${q}`);
  const g = {};
  for (const grp of r.multiDailyMetricTimeSeries || []) for (const s of grp.dailyMetricTimeSeries || []) for (const v of s.timeSeries?.datedValues || []) {
    const d = `${v.date.year}-${String(v.date.month).padStart(2, '0')}-${String(v.date.day).padStart(2, '0')}`; (g[d] ||= {})[s.dailyMetric.replace('BUSINESS_IMPRESSIONS_', '')] = +(v.value || 0);
  }
  out.gunluk = g;
  out.kelimeler = {};
  for (const [y, m] of [[2026, 6], [2026, 7], [2026, 8], [2026, 9], [2026, 10], [2025, 9], [2025, 10]]) {
    const kq = new URLSearchParams({ 'monthlyRange.startMonth.year': y, 'monthlyRange.startMonth.month': m, 'monthlyRange.endMonth.year': y, 'monthlyRange.endMonth.month': m, pageSize: 100 });
    const kw = await al(`https://businessprofileperformance.googleapis.com/v1/${konum}/searchkeywords/impressions/monthly?${kq}`);
    out.kelimeler[`${y}-${m}`] = kw.HATA ? kw : (kw.searchKeywordsCounts || []).map(x => [x.searchKeyword, x.insightsValue?.value ? +x.insightsValue.value : '<' + x.insightsValue?.threshold]);
  }
  const lp = await al(`https://mybusiness.googleapis.com/v4/${hesap}/${konum}/localPosts?pageSize=100`);
  out.gonderiler = lp.HATA ? lp : (lp.localPosts || []).map(p => [p.createTime, p.state, p.topicType, (p.summary || '').slice(0, 60)]);
  fs.writeFileSync('data/gbp-teshis.json', JSON.stringify(out, null, 1));
  console.log('ok', Object.keys(g).length);
})().catch(e => { console.error(e); process.exit(1); });
