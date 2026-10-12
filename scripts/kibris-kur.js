// TCMB günlük kurlarından sterlin (GBP döviz satış) kurunu çeker; Kıbrıs sayfasındaki "£1 kaç TL?" grafiği için
// assets/kibris/kur.json yazar: son kur + yıllık ortalamalar. Günlük ham kurlar data/kibris-kur-gunluk.json'da birikir,
// böylece her çalışmada yalnızca eksik günler indirilir. GitHub Actions'ta her gün çalışır (kibris-kur.yml).
const fs = require('fs');
const OUT = 'assets/kibris/kur.json', HAM = 'data/kibris-kur-gunluk.json', ILK = 2024;
const ham = fs.existsSync(HAM) ? JSON.parse(fs.readFileSync(HAM, 'utf8')) : {};
const p2 = n => String(n).padStart(2, '0');

async function gun(d) {
  const url = `https://www.tcmb.gov.tr/kurlar/${d.getFullYear()}${p2(d.getMonth() + 1)}/${p2(d.getDate())}${p2(d.getMonth() + 1)}${d.getFullYear()}.xml`;
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return null;               // hafta sonu / tatil: kur yayımlanmaz
      if (!r.ok) throw new Error(r.status);
      const m = /Kod="GBP"[\s\S]*?<ForexSelling>([\d.]+)</.exec(await r.text());
      return m ? +m[1] : null;
    } catch (e) { if (k === 2) throw e; }
  }
}

(async () => {
  const bugun = new Date(), eksik = [];
  for (let d = new Date(ILK, 0, 1); d <= bugun; d.setDate(d.getDate() + 1)) {
    const k = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, hg = d.getDay();
    // geçmiş günlerde boş kayıt (null) tatil demek; bugün ise kur geç yayımlanabilir, yeniden denenir
    if (hg === 0 || hg === 6 || (k in ham && (ham[k] !== null || d.toDateString() !== bugun.toDateString()))) continue;
    eksik.push([k, new Date(d)]);
  }
  for (let i = 0; i < eksik.length; i += 8)
    await Promise.all(eksik.slice(i, i + 8).map(async ([k, d]) => { ham[k] = await gun(d); }));
  const gunler = Object.keys(ham).filter(k => ham[k]).sort();
  const yillik = {};
  for (const k of gunler) (yillik[k.slice(0, 4)] ||= []).push(ham[k]);
  const out = {
    tarih: gunler.at(-1), kur: ham[gunler.at(-1)], kaynak: 'TCMB',
    yillik: Object.fromEntries(Object.entries(yillik).map(([y, a]) => [y, +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(2)])),
    gunSayisi: Object.fromEntries(Object.entries(yillik).map(([y, a]) => [y, a.length]))
  };
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(HAM, JSON.stringify(Object.fromEntries(Object.keys(ham).sort().map(k => [k, ham[k]]))));
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(eksik.length, 'gün indirildi;', out.tarih, '£1 =', out.kur, 'TL;', JSON.stringify(out.yillik));
})().catch(e => { console.error(e); process.exit(1); });
