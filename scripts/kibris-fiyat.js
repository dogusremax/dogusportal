// Kıbrıs Katalog (Apps Script web app, Drive'daki fiyat listelerinden beslenir) sayfasındaki DATA'yı çekip
// 360 tur ve Kıbrıs sunumu (fiyat listesi slaytı) için assets/kibris360/fiyatlar.json yazar. GitHub Actions'ta yarım saatte bir çalışır (kibris-fiyat.yml);
// ?refresh=1 ile önce Drive senkronu çalışır (Döveç/Northernland fiyat dosyaları ve Noyanlar Excel klasörü).
const fs = require('fs');
const URL_ = 'https://script.google.com/macros/s/AKfycbwnyN9V87vndjSd2KIohl2XO6h_gn72W8fGSvjHoaCjDETSbrAmOJQH3Dgx0OLrc8dO/exec';
const OUT = 'assets/kibris360/fiyatlar.json';

(async () => {
  const r = await fetch(URL_ + '?refresh=1', { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  if (!r.ok) throw new Error('katalog ' + r.status);
  let t = await r.text();
  t = t.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const i = t.indexOf('var DATA = ');
  if (i < 0) throw new Error('DATA bulunamadı');
  let raw = t.slice(i + 11, t.indexOf('\\n', i)).split('\\\\"').join('"').split('\\\\').join('\\');
  // JSON'un bittiği yeri bul (arkasında ; ve başka kod olabilir)
  let d, end = raw.length;
  for (;;) {
    try { d = JSON.parse(raw.slice(0, end)); break; } catch (e) {
      const m = /position (\d+)/.exec(e.message); if (!m || +m[1] >= end) throw e; end = +m[1];
    }
  }
  const sayi = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
  const out = {
    guncel: d.sonSenkron,
    projeler: d.projeler.map(p => ({
      proje: p.proje, firma: p.firma, para: p.paraBirimi || '£', minFiyat: sayi(p.minFiyat),
      // sunumdaki Kıbrıs Katalog katmanı için: tanıtım bilgisi (broşür projeleri), Drive klasörü, kaynak dosya
      aciklama: p.aciklama || '', uniteMix: p.uniteMix || '', olanaklar: p.olanaklar || '', brosur: p.katalogUrl || '',
      klasor: p.klasorUrl || '', kaynak: p.kaynakDosya || '', durumVar: String(p.durumVar) === 'true' || p.durumVar === true,
      bolge: p.bolge || '', gorsel: p.gorsel || '', tur360: p.tur360 || '',
      uniteler: (p.uniteler || []).map(u => ({
        tip: u.tip, durum: u.durum, fiyat: sayi(u.fiyat), blok: u.blok || '', kat: u.kat === '' ? null : u.kat,
        no: u.daireNo === '' ? null : u.daireNo, m2: sayi(u.toplamM2), ic: sayi(u.daireM2),
        manzara: u.gorunum || '', not: u.notlar || ''
      })).filter(u => u.fiyat)
    }))
  };
  const yeni = JSON.stringify(out);
  const eski = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  // yalnızca "guncel" zamanı değiştiyse yazma (gereksiz commit olmasın)
  const govde = s => s.replace(/"guncel":"[^"]*",/, '');
  if (govde(eski) === govde(yeni)) { console.log('değişiklik yok'); return; }
  fs.writeFileSync(OUT, yeni);
  console.log('yazıldı', out.projeler.length, 'proje,', out.projeler.reduce((a, p) => a + p.uniteler.length, 0), 'ünite');
})().catch(e => { console.error(e.message); process.exit(1); });
