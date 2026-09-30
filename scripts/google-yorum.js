// Google yorumlarını Places API (New) ile çeker, data/google-yorumlar.json'a biriktirir.
// Google tek seferde en fazla 5 yorum döndürür; yeni gelenler eskilerin üstüne eklenir.
const fs = require('fs');

const KEY = process.env.GOOGLE_PLACES_KEY;
const PLACE_ID = process.env.PLACE_ID || 'ChIJdblFqvvHyhQR_agtjpCfYW0';
const DOSYA = 'data/google-yorumlar.json';

(async () => {
  if (!KEY) { console.log('GOOGLE_PLACES_KEY yok, atlandı.'); return; }

  const r = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=tr`, {
    headers: {
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,reviews',
    },
  });
  let eski = { yorumlar: [] };
  try { eski = JSON.parse(fs.readFileSync(DOSYA, 'utf8')); } catch {}

  if (!r.ok) {
    // Hatayı veri dosyasına da yaz (loglar giriş gerektiriyor); anahtar metinden temizlenir
    const metin = (await r.text()).split(KEY).join('***');
    console.error('Places API hatası', r.status, metin);
    let mesaj = metin;
    try { mesaj = JSON.parse(metin).error?.message || metin; } catch {}
    // Aynı hata zaten kayıtlıysa dosyaya tekrar yazma (her saat boş hata commit'i olmasın)
    if (eski.hata && eski.hata.durum === r.status && eski.hata.mesaj === mesaj.slice(0, 500)) { console.log('Aynı hata sürüyor, kayıt değişmedi.'); return; }
    fs.writeFileSync(DOSYA, JSON.stringify({ ...eski, hata: { zaman: new Date().toISOString(), durum: r.status, mesaj: mesaj.slice(0, 500) } }, null, 1));
    return;
  }
  const p = await r.json();
  const hataVardi = !!eski.hata;
  delete eski.hata;

  // Danışman eşleştirme (data/danismanlar.json'daki desenler, Türkçe küçük harfe çevrilmiş metinde aranır)
  const norm = s => (s || '').replace(/ș/g, 'ş').replace(/Ș/g, 'Ş').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  let danismanlar = [];
  try { danismanlar = JSON.parse(fs.readFileSync('data/danismanlar.json', 'utf8')); } catch {}
  const desenler = danismanlar.map(d => [d.id, new RegExp('(?<![a-zçğıöşü])(?:' + d.desen + ')')]);
  const eslestir = metin => { const t = norm(metin); return desenler.filter(([, r]) => r.test(t)).map(([id]) => id); };

  // İlk aktarımdaki yorumların id'leri API'den farklı; aynı yorumu yazar + metin başından tanı
  const imza = (yazar, metin) => norm(yazar).trim() + '|' + norm(metin).replace(/\s+/g, ' ').slice(0, 40);
  const map = new Map(eski.yorumlar.map(y => [y.id, y]));
  const imzalar = new Map(eski.yorumlar.map(y => [imza(y.yazar, y.metin), y.id]));
  for (const rv of p.reviews || []) {
    const metin = rv.originalText?.text || rv.text?.text || '';
    const yazar = rv.authorAttribution?.displayName || 'Google kullanıcısı';
    const eskiId = imzalar.get(imza(yazar, metin));
    if (eskiId && eskiId !== rv.name) {
      // Bilinen yorum: kesin tarihi ve linki güncelle, geri kalanı koru
      const y = map.get(eskiId);
      Object.assign(y, { tarih: rv.publishTime || y.tarih, tarihYaklasik: false, link: rv.googleMapsUri || y.link || '' });
      continue;
    }
    // Sadece 4★ ve üzeri, danışmanlarımızdan birinin adı geçen yorumlar
    if ((rv.rating || 0) < 4 || !eslestir(metin).length) continue;
    const id = rv.name;
    map.set(id, {
      id,
      yazar,
      yazarUrl: rv.authorAttribution?.uri || '',
      foto: rv.authorAttribution?.photoUri || '',
      puan: rv.rating || 0,
      metin,
      yanit: map.get(id)?.yanit || '',
      tarih: rv.publishTime || '',
      tarihYaklasik: false,
      link: rv.googleMapsUri || '',
      danismanlar: eslestir(metin),
      ilkGorulme: map.get(id)?.ilkGorulme || new Date().toISOString(),
    });
  }

  const yorumlar = [...map.values()].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  const yeni = {
    isletme: p.displayName?.text || 'RE/MAX Doğuş',
    puan: p.rating || 0,
    toplam: p.userRatingCount || 0,
    mapsUrl: p.googleMapsUri || '',
    guncelleme: new Date().toISOString(),
    yorumlar,
  };

  // Sadece içerik değiştiyse yaz (her saat boş commit olmasın)
  const degisti = JSON.stringify({ ...yeni, guncelleme: 0 }) !== JSON.stringify({ ...eski, guncelleme: 0 });
  if (!degisti && !hataVardi) { console.log('Değişiklik yok.'); return; }
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(yeni, null, 1));
  console.log(`Kaydedildi: ${yeni.puan}★, ${yeni.toplam} değerlendirme, ${yorumlar.length} yorum arşivde.`);
})();
