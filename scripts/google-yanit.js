// Yeni 4–5★ Google yorumlarına otomatik yanıt metni üretir (scripts/google-yorum.js kullanır).
// Kurallar: "Değerli Ad Soyad" (Bey/Hanım tahmini yok), aktif danışman anılıyorsa onun adına da teşekkür,
// eski danışman adı anılmaz, yorumdaki konuya göre kısa bir cümle, link/telefon/reklam yok.
const HITAP = {
  gamze: 'Gamze Hanım', irem: 'İrem Hanım', ozlem_varol: 'Özlem Hanım', aysegul_alpay: 'Ayşegül Hanım', aysun: 'Aysun Hanım',
  evsen: 'Evşen Hanım', orhan: 'Orhan Bey', gizem: 'Gizem Hanım', umut: 'Umut Bey', makbule: 'Makbule Hanım',
};

const norm = s => (s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
const sec = (id, liste) => liste[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % liste.length];
const birlestir = l => l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' ve ' + l[l.length - 1];

function adDuzelt(ad) {
  ad = (ad || '').trim();
  if (!ad || /[\d_@]/.test(ad)) return null;   // takma ad gibi → "Merhaba,"
  return ad.split(/\s+/).map(k => k.charAt(0).toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr')).join(' ');
}

function ingilizceMi(metin) {
  // Danışman/ofis adlarındaki Türkçe harfler İngilizce yorumu Türkçe sandırmasın: kelime oranına bak
  const kelimeler = metin.toLowerCase().match(/[a-zçğıöşü]+/g) || [];
  const en = kelimeler.filter(k => /^(the|and|with|very|was|great|thank|thanks|they|we|my|i|to|of|in|for|is|she|he|her|his|you|experience|recommend)$/.test(k)).length;
  const tr = kelimeler.filter(k => /^(ve|bir|çok|için|bu|ile|da|de|ederim|teşekkür|hanım|bey)$/.test(k)).length;
  return en >= 3 && en > tr * 2;
}

function konuCumlesi(id, t) {
  if (/(dükkan|dükkân|iş ?yeri|işyeri|isyeri)/.test(t) && /kira/.test(t)) return 'Yeni iş yerinizde bol kazançlı günler dileriz.';
  if (/kiracı/.test(t)) return 'Gayrimenkulünüzün doğru kiracıyla buluşmasına çok sevindik.';
  if (/\bsat(ış|tı|ıl|tık|mak|ma)/.test(t)) return 'Satış sürecinizde yanınızda olabildiğimiz için çok mutluyuz.';
  if (/yeni ev|evimizi|ev aldı|daire aldı|satın al/.test(t)) return 'Yeni evinizde mutluluklar dileriz.';
  if (/kira/.test(t)) return 'Kiralama sürecinizde yanınızda olabildiğimiz için çok mutluyuz.';
  return sec(id, ['Memnun kalmanız bizim için çok değerli.', 'Her zaman yanınızdayız.', 'Sürecin keyifli geçmesine çok sevindik.']);
}

// danismanIdleri: scripts/google-yorum.js'deki eslestir() sonucu (data/danismanlar.json desenleri)
module.exports = function yanitYaz({ id, yazar, metin, danismanIdleri }) {
  const ad = adDuzelt(yazar);
  const selam = ad ? `Değerli ${ad},` : 'Merhaba,';
  const hitaplar = (danismanIdleri || []).map(i => HITAP[i]).filter(Boolean);
  if (!(metin || '').trim()) return `${selam} değerlendirmeniz için çok teşekkür ederiz. RE/MAX Doğuş olarak her zaman yanınızdayız.`;

  const ne = sec(id, ['güzel yorumunuz', 'güzel sözleriniz', 'bu içten yorumunuz']);
  const tesekkur = hitaplar.length
    ? `${ne} için hem RE/MAX Doğuş ailesi hem de ${birlestir(hitaplar)} adına çok teşekkür ederiz.`
    : `${ne} için RE/MAX Doğuş ailesi olarak çok teşekkür ederiz.`;
  const tr = `${selam} ${tesekkur} ${konuCumlesi(id, norm(metin))}`;
  if (!ingilizceMi(metin)) return tr;

  const en = `${ad ? `Dear ${ad},` : 'Hello,'} thank you so much for your kind review on behalf of ${hitaplar.length ? `both the RE/MAX Doğuş family and ${birlestir(hitaplar).replace(' ve ', ' and ')}` : 'the RE/MAX Doğuş family'}. We are delighted to have been part of your journey.`;
  return `${en}\n\n${tr}`;
};
