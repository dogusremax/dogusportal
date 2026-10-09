// Google yorumlarını Business Profile API ile çeker (tüm yorumlar, sayfalı), data/google-yorumlar.json'a biriktirir.
// Kimlik: GOOGLE_PLACES_KEY secret'ında JSON {client_id, client_secret, refresh_token} (scripts/gbp-yetki.js üretir).
// Secret adı eski Places denemesinden kaldı; workflow dosyasını değiştirmemek için aynı ad kullanılıyor.
const fs = require('fs');
const yanitYaz = require('./google-yanit');

const DOSYA = 'data/google-yorumlar.json';
const GORULEN = 'data/google-yorum-gorulen.json';
const YILDIZ = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

async function token(k) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: k.client_id, client_secret: k.client_secret, refresh_token: k.refresh_token, grant_type: 'refresh_token' }),
  });
  const t = await r.json();
  if (!t.access_token) throw { durum: r.status, mesaj: 'Token alınamadı: ' + (t.error_description || t.error) };
  return t.access_token;
}

async function al(url, tok, secenek = {}) {
  const r = await fetch(url, { ...secenek, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw { durum: r.status, mesaj: (j.error?.message || r.statusText) + ' (' + url.split('?')[0] + ')' };
  return j;
}

// Google çeviri eklediyse sadece orijinal metni al
const orijinal = s => {
  s = s || '';
  const m = s.match(/\(Original\)\n([\s\S]*)$/) || s.match(/\(Orijinal\)\n([\s\S]*)$/);
  return (m ? m[1] : s.replace(/\n\n\((Translated by Google|Google tarafından çevrildi)\)[\s\S]*$/, '')).trim();
};

(async () => {
  let k;
  try { k = JSON.parse(process.env.GOOGLE_PLACES_KEY || ''); } catch {}
  if (!k?.refresh_token) { console.log('Business Profile kimliği yok, atlandı.'); return; }

  let eski = { yorumlar: [] };
  try { eski = JSON.parse(fs.readFileSync(DOSYA, 'utf8')); } catch {}

  let tok, hesap, konum, yorumlar = [], ozet = {};
  try {
    tok = await token(k);
    const hesaplar = (await al('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', tok)).accounts || [];
    const konumlar = [];
    for (const h of hesaplar) {
      const l = await al(`https://mybusinessbusinessinformation.googleapis.com/v1/${h.name}/locations?readMask=name,title&pageSize=100`, tok);
      for (const x of l.locations || []) konumlar.push({ hesap: h.name, ...x });
    }
    const secilen = konumlar.find(x => new RegExp(process.env.GBP_KONUM || 'fikirtepe', 'i').test(x.title)) || konumlar[0];
    if (!secilen) throw { durum: 404, mesaj: 'Hesapta işletme konumu bulunamadı' };
    hesap = secilen.hesap; konum = secilen.name;
    let sayfa = '';
    do {
      const r = await al(`https://mybusiness.googleapis.com/v4/${hesap}/${konum}/reviews?pageSize=50${sayfa ? '&pageToken=' + sayfa : ''}`, tok);
      yorumlar.push(...(r.reviews || []));
      ozet = { puan: r.averageRating, toplam: r.totalReviewCount };
      sayfa = r.nextPageToken;
    } while (sayfa);
  } catch (e) {
    console.error('Business Profile API hatası', e.durum, e.mesaj || e);
    fs.writeFileSync(DOSYA, JSON.stringify({ ...eski, hata: { zaman: new Date().toISOString(), durum: e.durum || 0, mesaj: String(e.mesaj || e).slice(0, 500) } }, null, 1));
    return;
  }
  const hataVardi = !!eski.hata;
  delete eski.hata;

  // Danışman eşleştirme (data/danismanlar.json'daki desenler, Türkçe küçük harfe çevrilmiş metinde aranır)
  const norm = s => (s || '').replace(/ș/g, 'ş').replace(/Ș/g, 'Ş').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  let danismanlar = [];
  try { danismanlar = JSON.parse(fs.readFileSync('data/danismanlar.json', 'utf8')); } catch {}
  const desenler = danismanlar.map(d => [d.id, new RegExp('(?<![a-zçğıöşü])(?:' + d.desen + ')')]);
  const eslestir = metin => { const t = norm(metin); return desenler.filter(([, r]) => r.test(t)).map(([id]) => id); };

  // Tarayıcıdan/ilk aktarımdan gelen yorumların id'leri API'den farklı: aynı yorumu yazar + metin başından,
  // yazar adı farklı yazılmışsa sadece metin başından tanı (story'ler aynı yorumu iki kez paylaşmasın)
  // Emoji/noktalama farkları (tarayıcı ⭐ satırını atıyor) eşleşmeyi bozmasın: sadece harf, rakam ve boşluk
  const temiz = s => norm(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const imza = (yazar, metin) => temiz(yazar) + '|' + temiz(metin).slice(0, 40);
  const map = new Map(eski.yorumlar.map(y => [y.id, y]));
  const imzalar = new Map(eski.yorumlar.map(y => [imza(y.yazar, y.metin), y.id]));
  const metinler = new Map(eski.yorumlar.filter(y => temiz(y.metin).length >= 25).map(y => [temiz(y.metin).slice(0, 60), y.id]));
  let gorulen = [];
  try { gorulen = JSON.parse(fs.readFileSync(GORULEN, 'utf8')); } catch {}
  const gorulenSet = new Set(gorulen);
  const simdi = new Date();
  const ucGunOnce = new Date(simdi - 3 * 864e5).toISOString();
  // Yeni 4–5★ yorumlara otomatik yanıt. Sadece otomasyon başladıktan sonra gelenler: eski yanıtsızlar
  // kullanıcının bilerek yanıtlamadıklarıdır. 1–3★'a yanıt yazılmaz (Google zaten sahibe mail atıyor).
  const yanitBaslangic = new Date(Math.max(Date.parse('2026-10-10T00:00:00Z'), simdi - 30 * 864e5)).toISOString();
  // Gemini'ye üslup örneği: elle yazılmış, metinli önceki yanıtlardan çeşitli 8 tane
  const ornekler = yorumlar
    .filter(v => /^(Değerli|Dear) /.test(v.reviewReply?.comment || '') && (v.reviewReply.updateTime || '') < '2026-10-10' && orijinal(v.comment).length > 40)
    .filter((v, i, l) => i % Math.max(1, Math.floor(l.length / 8)) === 0).slice(0, 8)
    .map(v => ({ metin: orijinal(v.comment), yanit: v.reviewReply.comment }));
  let yanitlanan = 0;
  for (const rv of yorumlar) {
    const deneme = process.env.YANIT_DENEME;
    if (!deneme && (rv.reviewReply || (YILDIZ[rv.starRating] || 0) < 4 || (rv.createTime || '') < yanitBaslangic)) continue;
    if (deneme && (YILDIZ[rv.starRating] || 0) < 4) continue;
    if (yanitlanan >= (deneme ? +deneme : 10)) break;
    const metin = orijinal(rv.comment);
    const { metin: comment, kaynak } = await yanitYaz({
      id: rv.reviewId, yazar: rv.reviewer?.isAnonymous ? '' : rv.reviewer?.displayName, metin, puan: YILDIZ[rv.starRating],
      danismanIdleri: eslestir(metin), ornekler, geminiAnahtar: k.gemini,
    });
    if (deneme) { yanitlanan++; console.log(`\n• ${rv.reviewer?.displayName}: ${metin.slice(0, 90)}\n  [${kaynak}] ${comment}`); continue; }
    try {
      await al(`https://mybusiness.googleapis.com/v4/${hesap}/${konum}/reviews/${rv.reviewId}/reply`, tok, { method: 'PUT', body: JSON.stringify({ comment }) });
      rv.reviewReply = { comment };
      yanitlanan++;
      console.log('Yanıtlandı:', rv.reviewer?.displayName);
    } catch (e) { console.error('Yanıt gönderilemedi', rv.reviewer?.displayName, e.durum, e.mesaj); }
  }

  let haric = [];   // elle listeden çıkarılan yorumların id'leri (ör. eski danışman anılıyor)
  try { haric = JSON.parse(fs.readFileSync('data/google-yorum-haric.json', 'utf8')); } catch {}
  // Otomatik paylaşılmayacak yeni yorumlar (düşük puan, metinsiz, danışman adı yok) → workflow Umut'a GitHub issue açar
  const SIRA = ['evsen', 'gizem', 'orhan', 'aysun', 'ozlem_varol', 'gamze', 'irem', 'aysegul_alpay'];   // sizlerden-story.js ile aynı
  const bildirim = [];

  for (const rv of yorumlar) {
    const id = rv.reviewId;
    const metin = orijinal(rv.comment);
    const yazar = rv.reviewer?.isAnonymous ? 'Google kullanıcısı' : (rv.reviewer?.displayName || 'Google kullanıcısı');
    const puan = YILDIZ[rv.starRating] || 0;
    const yanit = rv.reviewReply?.comment || '';
    const ilkKez = !gorulenSet.has(id);
    if (ilkKez) { gorulenSet.add(id); gorulen.push(id); }
    if (ilkKez && (rv.createTime || '') >= ucGunOnce) {
      const ids = eslestir(metin);
      const neden = puan < 4 ? `${puan} yıldız` : !metin ? 'yorum metni yok' : !ids.some(i => SIRA.includes(i)) ? 'paylaşılan danışmanlardan birinin adı geçmiyor' : haric.includes(id) ? 'hariç listesinde' : '';
      if (neden) bildirim.push({ yazar, puan, metin, neden, tarih: rv.createTime });
    }
    const varolan = map.get(id) || map.get(imzalar.get(imza(yazar, metin))) || (temiz(metin).length >= 25 && map.get(metinler.get(temiz(metin).slice(0, 60))));
    if (varolan) {
      // Bilinen yorum: kesin tarih ve güncel yanıtı yaz, id ve geri kalanı koru
      Object.assign(varolan, { tarih: rv.createTime || varolan.tarih, tarihYaklasik: false, yanit, puan: puan || varolan.puan });
      delete varolan.once;
      continue;
    }
    // Sadece 4★ ve üzeri, danışmanlarımızdan birinin adı geçen, bilerek dışarıda bırakılmamış yorumlar
    if (puan < 4 || !eslestir(metin).length || haric.includes(id)) continue;
    map.set(id, {
      id,
      yazar,
      yazarUrl: '',
      foto: rv.reviewer?.profilePhotoUrl || '',
      puan,
      metin,
      yanit,
      tarih: rv.createTime || '',
      tarihYaklasik: false,
      link: '',
      danismanlar: eslestir(metin),
      kaynak: 'api',
      // Eski yorumlar "yeni gelen" sayılıp story'de hemen paylaşılmasın
      ilkGorulme: (rv.createTime || '') < ucGunOnce ? rv.createTime : simdi.toISOString(),
    });
  }

  const liste = [...map.values()].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  const yeni = {
    isletme: eski.isletme || 'RE/MAX Doğuş',
    puan: ozet.puan ? Math.round(ozet.puan * 10) / 10 : eski.puan,
    toplam: ozet.toplam || eski.toplam,
    mapsUrl: eski.mapsUrl || '',
    guncelleme: simdi.toISOString(),
    yorumlar: liste,
  };

  if (bildirim.length) fs.writeFileSync('yorum-bildirim.md', bildirim.map(b =>
    `**${b.yazar}** · ${'★'.repeat(b.puan)}${'☆'.repeat(5 - b.puan)} · ${b.tarih.slice(0, 10)}\nOtomatik paylaşılmadı: ${b.neden}\n\n> ${(b.metin || '(metin yok)').replace(/\n/g, '\n> ')}`).join('\n\n---\n\n'));
  fs.writeFileSync(GORULEN, JSON.stringify(gorulen, null, 0).replace(/","/g, '",\n"'));
  const degisti = JSON.stringify({ ...yeni, guncelleme: 0 }) !== JSON.stringify({ ...eski, guncelleme: 0 });
  if (!degisti && !hataVardi) { console.log(`Değişiklik yok (${yorumlar.length} yorum okundu).`); return; }
  fs.writeFileSync(DOSYA, JSON.stringify(yeni, null, 1));
  console.log(`Kaydedildi: ${yeni.puan}★, ${yeni.toplam} değerlendirme, ${yorumlar.length} yorum okundu, ${liste.length} yorum arşivde.`);
})();
