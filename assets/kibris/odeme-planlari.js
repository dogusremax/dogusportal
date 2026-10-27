/* Kıbrıs projelerinin ödeme planları: sunum (kibris-sunum.html) ve Apps Script Kıbrıs Katalog aynı listeyi okur.
   Her proje için bir ya da birkaç plan; formda proje açılınca ilk plan seçili gelir, birden fazlaysa açılır listeden seçilir.
   Alanlar (yüzde): pe peşinat, tl anahtar tesliminde, ts teslimden sonra; teslime kadar taksit kalan yüzdedir.
   ay: teslime kadar taksit sayısı (yoksa teslim tarihinden hesaplanır, o da yoksa 24), sa: teslimden sonra kaç ay,
   teslim: 'YYYY-AA' anahtar teslim tarihi, not: plan altında müşteriye görünen açıklama.
   Projede kendi planı yoksa firmanın planı kullanılır. */
(function () {
  var FIRMA = {
    'Döveç İnşaat': [{ ad: 'Döveç planı', pe: 35, tl: 0, ts: 20, sa: 12, not: 'Döveç planı: %35 peşinat, anahtar teslimine kadar %45 (teslime kalan aylara bölünür), teslimden sonra %20 (12 ay, faizsiz). Hesap tahminidir; kesin tutarı satış temsilcisiyle teyit edin.' }],
    'Noyanlar': [{ ad: 'Noyanlar planı', pe: 35, tl: 15, ts: 0, ay: 48, not: 'Noyanlar standart planı: %35 peşinat, %50 48 aya kadar taksit, teslimde %15. Projeye göre değişebilir; kesin planı satış temsilcisiyle teyit edin.' }],
    'Northernland': [{ ad: 'Northernland planı', pe: 35, tl: 0, ts: 0, not: 'Northernland resmi ödeme planı paylaşmadığı için genel tahmin: %35 peşinat + teslime kadar %65 eşit taksit. Kesin plan için satış temsilcisi ya da sözleşme esas alınır.' }],
    '': [{ ad: 'Genel plan', pe: 35, tl: 0, ts: 0, not: 'Tahmini hesap (%35 peşinat + %65 teslime kadar). Resmi ödeme planı için firmanın sözleşmesini esas alın.' }]
  };
  // Döveç planları: Umut 26.10.2026
  var DV = 'Faizsiz; kesin tutarı satış temsilcisiyle teyit edin.';
  var PROJE = {
    'D-Point': [{ ad: 'D-Point planı', pe: 35, tl: 0, ts: 20, ay: 25, sa: 12, teslim: '2028-12', not: 'D-Point · teslim Aralık 2028. %35 peşinat; %45 teslime kadar 25 eşit taksit (son taksit Kasım 2028); %20 teslimden sonra 12 eşit taksit (son taksit Kasım 2029). ' + DV }],
    'La Casalia': [{ ad: 'La Casalia planı', pe: 35, tl: 0, ts: 20, ay: 13, sa: 12, teslim: '2027-12', not: 'La Casalia · teslim Aralık 2027. %35 peşinat; %45 teslime kadar 13 taksit (son taksit Kasım 2027); %20 teslimden sonra 12 eşit taksit (son taksit Kasım 2028). ' + DV }],
    'Querencia Long Beach': [
      { ad: 'A ve B Blok', blok: ['A', 'B'], pe: 35, tl: 0, ts: 20, ay: 4, sa: 12, teslim: '2027-03', not: 'Querencia A ve B Blok · teslim Mart 2027. %35 peşinat; %45 teslime kadar 4 taksit (son taksit Şubat 2027); %20 teslimden sonra 12 taksit (son taksit Mayıs 2028). ' + DV },
      { ad: 'C ve D Blok', blok: ['C', 'D'], pe: 35, tl: 0, ts: 20, ay: 13, sa: 12, teslim: '2027-12', not: 'Querencia C ve D Blok · teslim Aralık 2027. %35 peşinat; %45 teslime kadar 13 taksit (son taksit Kasım 2027); %20 teslimden sonra 12 taksit (son taksit Kasım 2028). ' + DV }],
    'Courtyard Platinum': [
      { ad: '1. Etap', pe: 35, tl: 0, ts: 20, ay: 1, sa: 12, not: 'Courtyard Platinum 1. Etap. %35 peşinat; %45 teslime kadar 1 taksit (Kasım 2026); %20 teslimden sonra 12 taksit (son taksit Kasım 2027). ' + DV },
      { ad: '2. Etap', pe: 35, tl: 0, ts: 20, ay: 13, sa: 12, not: 'Courtyard Platinum 2. Etap. %35 peşinat; %45 teslime kadar 13 taksit (son taksit Kasım 2027); %20 teslimden sonra 12 taksit (son taksit Kasım 2028). ' + DV }],
    'Grand Sapphire Blu': [
      { ad: '1-2-3-6-7-8-9-10-11. Bloklar', blok: ['1', '2', '3', '6', '7', '8', '9', '10', '11'], pe: 35, tl: 0, ts: 0, teslim: '2028-06', not: 'Grand Sapphire Blu 1, 2, 3, 6, 7, 8, 9, 10 ve 11. Bloklar · teslim Haziran 2028. %35 peşinat; %65 teslime kadar eşit taksit. Kesin tutarı satış temsilcisiyle teyit edin.' },
      { ad: '4-5-12-13. Bloklar', blok: ['4', '5', '12', '13'], pe: 35, tl: 0, ts: 0, teslim: '2029-06', not: 'Grand Sapphire Blu 4, 5, 12 ve 13. Bloklar · teslim Haziran 2029. %35 peşinat; %65 teslime kadar eşit taksit. Kesin tutarı satış temsilcisiyle teyit edin.' }],
    // Noyanlar: Umut 27.10.2026; Ocean Life etapları blok adlarından (fiyat listesindeki etap notu)
    'Ocean Life Residence': [
      { ad: '1. Etap', blok: ['AFALINA-1', 'AFALINA-2', 'WHALE-2', 'ORCA-4', 'ORCA-5', 'ORCA-7', 'BELUGA-5'], pe: 35, tl: 0, ts: 30, sa: 30, teslim: '2027-12', not: 'Ocean Life 1. Etap · teslim Aralık 2027. %35 peşinat; %35 teslime kadar taksit; %30 teslimden sonra 30 ay. Kesin tutarı satış temsilcisiyle teyit edin.' },
      { ad: '2. Etap', blok: ['AFALINA-3', 'AFALINA-4', 'ORCA-8', 'ORCA-9', 'ORCA-10'], pe: 35, tl: 0, ts: 30, sa: 30, teslim: '2028-12', not: 'Ocean Life 2. Etap · teslim Aralık 2028. %35 peşinat; %35 teslime kadar taksit; %30 teslimden sonra 30 ay. Kesin tutarı satış temsilcisiyle teyit edin.' }],
    'Riverside Life Residence': [{ ad: 'Riverside planı', pe: 50, tl: 0, ts: 50, sa: 36, not: 'Riverside Life: %50 peşinat; %50 teslimden sonra 36 ay taksit. Kesin tutarı satış temsilcisiyle teyit edin.' }],
    'Natulux': [{ ad: 'Natulux planı', pe: 35, tl: 0, ts: 30, sa: 12, teslim: '2027-05', not: 'Natulux · teslim Mayıs 2027. %35 peşinat, teslime kadar %35 taksit, teslimden sonra %30 (12 ay). ' + DV }]
  };
  // bloğa bağlı plan varsa o dairenin planının sırası, yoksa -1
  function blokSira(p, blok) {
    var l = PROJE[p.proje] || [], b = String(blok == null ? '' : blok).trim().toUpperCase();
    for (var i = 0; i < l.length; i++) if (l[i].blok && l[i].blok.indexOf(b) >= 0) return i;
    return -1;
  }
  function kopya(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function liste(p) {
    var l = PROJE[p.proje] || FIRMA[p.firma] || FIRMA[''];
    return l.map(function (x) {
      var y = kopya(x); y.resmi = !!PROJE[p.proje]; y.pe = +y.pe || 0; y.tl = +y.tl || 0; y.ts = +y.ts || 0;
      y.tk = Math.round((100 - y.pe - y.tl - y.ts) * 100) / 100; y.ay = kalanAy(y); y.sa = y.ts ? (+y.sa || 12) : 0;
      return y;
    });
  }
  function kalanAy(y) {
    if (+y.ay > 0) return +y.ay;
    var m = /^(\d{4})-(\d{1,2})/.exec(y.teslim || '');
    if (m) { var b = new Date(), n = (+m[1] - b.getFullYear()) * 12 + (+m[2] - 1 - b.getMonth()); return Math.max(1, n); }
    return 24;
  }
  window.KPL = { liste: liste, blokSira: blokSira, FIRMA: FIRMA, PROJE: PROJE };
})();
