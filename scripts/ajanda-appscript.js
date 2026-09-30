/**
 * ============================================================
 *  RE/MAX Doğuş — AJANDA sunucusu (Google Apps Script)
 *  Proje: dogus-ajanda  ·  Ön yüz: dogusportal.com/ajanda.html
 * ============================================================
 *  Tek bir Google tablosunda tüm danışmanların defteri durur; her satırda
 *  "danisman" sütunu vardır, herkes yalnızca kendi kayıtlarını görür.
 *  Giriş: danışman adı + PIN (Danismanlar sayfası).
 *
 *  KURULUM (bir kez):
 *   1) Yeni bir Google Tablo aç → Uzantılar → Apps Script → bu dosyayı yapıştır → Kaydet
 *   2) kurulum() fonksiyonunu çalıştır → sayfalar açılır, her danışmana rastgele PIN
 *      verilir ve liste sana e-postayla gelir
 *   3) Dağıt → Yeni dağıtım → Web uygulaması
 *        Yürütme: Ben  ·  Erişim: Herkes  → Dağıt → /exec adresini kopyala
 *   4) Kapanış hedefi için (isteğe bağlı): Proje Ayarları → Script Properties →
 *        KAPANIS_SHEET_ID = Kapanış Formu tablosunun ID'si
 * ============================================================
 */

var SAYFALAR = {
  Danismanlar: ['ad', 'pin', 'aktif', 'eposta'],
  Ayarlar:     ['danisman', 'hedef', 'pin', 'matbuKurulu', 'matbuDanisman', 'sonMatbuSenkron', 'otoSenkron'],
  Kisiler:     ['id', 'danisman', 'ad', 'telefon', 'eposta', 'tip', 'durum', 'butce', 'arayis', 'kaynak', 'notlar',
                'sonrakiAdim', 'sonrakiTarih', 'sonTemas', 'komisyon', 'kapanisTarihi', 'olusturma', 'arsiv'],
  Dokunuslar:  ['id', 'danisman', 'kisiId', 'portfoyId', 'tarih', 'tur', 'ozet'],
  Portfoyler:  ['id', 'danisman', 'baslik', 'adres', 'tip', 'oda', 'm2', 'fiyat', 'malSahibi', 'malSahibiTel',
                'yetkiBitis', 'durum', 'ilanLink', 'pdfLink', 'kaynak', 'sonSenkron', 'notlar', 'arsiv'],
  Gosterimler: ['id', 'danisman', 'portfoyId', 'kisiId', 'tarih', 'ilgi', 'geriBildirim', 'kaynak', 'disAnahtar'],
  Randevular:  ['id', 'danisman', 'baslik', 'tarih', 'saat', 'kisi', 'kisiId', 'yer', 'tur', 'not', 'bitti', 'arsiv']
};
var DANISMAN_LISTESI = ['Ayşegül Alpay', 'Aysun Yılmaz', 'Evşen Özazman', 'Gamze Yetkin', 'Gizem Gök',
                        'İrem Aleyna Tetik', 'Orhan Özazman', 'Özlem Varol', 'Umut Tokkuş'];
var TZ = 'Europe/Istanbul';
var MATBU_YAKINDA = 'Matbu Evraklar aktarımı bir sonraki güncellemede açılacak. Şimdilik kayıtları elle ekleyebilirsin.';


// ═══════════════════════════════════════════════
//  KURULUM
// ═══════════════════════════════════════════════

function kurulum() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SAYFALAR).forEach(function (ad) {
    var sh = ss.getSheetByName(ad) || ss.insertSheet(ad);
    // Hepsi düz metin: telefon başındaki 0, "3+1", tarih ve "+90" bozulmasın
    sh.getRange(1, 1, sh.getMaxRows(), SAYFALAR[ad].length).setNumberFormat('@');
    if (sh.getLastRow() === 0) {
      sh.appendRow(SAYFALAR[ad]);
      sh.getRange(1, 1, 1, SAYFALAR[ad].length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  var bos = ss.getSheetByName('Sayfa1') || ss.getSheetByName('Sheet1');
  if (bos && bos.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(bos);

  var d = ss.getSheetByName('Danismanlar'), mevcut = {};
  if (d.getLastRow() > 1) d.getRange(2, 1, d.getLastRow() - 1, 1).getValues().forEach(function (r) { mevcut[anahtar_(r[0])] = 1; });
  var liste = [];
  DANISMAN_LISTESI.forEach(function (ad) {
    if (mevcut[anahtar_(ad)]) return;
    var pin = String(Math.floor(1000 + Math.random() * 9000));
    d.appendRow([ad, pin, 'EVET', '']);
    liste.push(ad + ' → ' + pin);
  });
  if (liste.length) {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Ajanda giriş PIN\'leri',
      'Ajanda kuruldu. Danışman giriş PIN\'leri:\n\n' + liste.join('\n') +
      '\n\nPIN\'leri tablodaki "Danismanlar" sayfasından değiştirebilirsin. Aktif sütununu HAYIR yaparsan giriş kapanır.');
  }
  Logger.log('✅ Kurulum tamam. ' + liste.length + ' danışmana PIN verildi (e-postana gönderildi).');
}


// ═══════════════════════════════════════════════
//  WEB API
// ═══════════════════════════════════════════════

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'danismanlar') return json_({ ok: true, liste: aktifDanismanlar_() });
  return json_({ ok: true, servis: 'dogus-ajanda' });
}

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.action === 'danismanlar') return json_({ ok: true, liste: aktifDanismanlar_() });
    var kim = girisKontrol_(b.ad, b.pin);
    if (!kim) return json_({ ok: false, hata: 'GIRIS', mesaj: 'Ad ya da PIN hatalı.' });
    var fn = String(b.fn || '');
    if (!ISLEMLER[fn]) return json_({ ok: false, hata: 'ISLEM', mesaj: 'Bilinmeyen işlem: ' + fn });
    var yazar = YAZAN[fn], kilit = null;
    if (yazar) { kilit = LockService.getScriptLock(); kilit.waitLock(20000); }
    try {
      return json_({ ok: true, sonuc: ISLEMLER[fn](kim, b.args || []) });
    } finally { if (kilit) kilit.releaseLock(); }
  } catch (err) {
    return json_({ ok: false, hata: 'SUNUCU', mesaj: String(err && err.message || err) });
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }


// ═══════════════════════════════════════════════
//  TABLO ERİŞİMİ
// ═══════════════════════════════════════════════

var _ONBELLEK = {};
function sayfa_(ad) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ad); }

/* Bir sayfanın tüm satırları: [{alan:değer, _satir:n}] (istek boyunca önbellekli) */
function oku_(ad) {
  if (_ONBELLEK[ad]) return _ONBELLEK[ad];
  var sh = sayfa_(ad), bas = SAYFALAR[ad], n = sh.getLastRow() - 1, l = [];
  if (n > 0) {
    sh.getRange(2, 1, n, bas.length).getDisplayValues().forEach(function (r, i) {
      var o = { _satir: i + 2 };
      bas.forEach(function (k, j) { o[k] = r[j]; });
      l.push(o);
    });
  }
  return (_ONBELLEK[ad] = l);
}
function benim_(ad, kim) { return oku_(ad).filter(function (x) { return x.danisman === kim && x.arsiv !== 'EVET'; }); }
function satir_(ad, o) { return SAYFALAR[ad].map(function (k) { return o[k] == null ? '' : String(o[k]); }); }
function ekle_(ad, o) {
  var sh = sayfa_(ad);
  sh.appendRow(satir_(ad, o));
  o._satir = sh.getLastRow();
  if (_ONBELLEK[ad]) _ONBELLEK[ad].push(o);
  return o;
}
function guncelle_(ad, o) { sayfa_(ad).getRange(o._satir, 1, 1, SAYFALAR[ad].length).setValues([satir_(ad, o)]); }
function bul_(ad, kim, id) { return oku_(ad).filter(function (x) { return x.id === id && x.danisman === kim; })[0] || null; }
function yeniId_(on) { return on + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
function kopya_(o) { var c = {}; Object.keys(o).forEach(function (k) { if (k !== '_satir' && k !== 'danisman' && k !== 'arsiv') c[k] = o[k]; }); return c; }

function aktifDanismanlar_() {
  return oku_('Danismanlar').filter(function (d) { return d.aktif !== 'HAYIR' && d.ad; }).map(function (d) { return d.ad; })
    .sort(function (a, b) { return a.localeCompare(b, 'tr'); });
}
function girisKontrol_(ad, pin) {
  if (!ad || !pin) return null;
  var d = oku_('Danismanlar').filter(function (x) { return anahtar_(x.ad) === anahtar_(ad) && x.aktif !== 'HAYIR'; })[0];
  return d && String(d.pin).trim() === String(pin).trim() ? d.ad : null;
}
function ayar_(kim) {
  var a = oku_('Ayarlar').filter(function (x) { return x.danisman === kim; })[0];
  return a || ekle_('Ayarlar', { danisman: kim, hedef: '', pin: '', matbuKurulu: '', matbuDanisman: '', sonMatbuSenkron: '', otoSenkron: '' });
}


// ═══════════════════════════════════════════════
//  YARDIMCILAR (demo ile aynı)
// ═══════════════════════════════════════════════

function g_(n) { var d = new Date(); d.setDate(d.getDate() + n); return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function simdi_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'); }
function gf_(t) {
  if (!t) return null;
  var p = String(t).split(' ')[0].split('-'); if (p.length !== 3) return null;
  var bugun = g_(0).split('-');
  var a = Date.UTC(+p[0], +p[1] - 1, +p[2]), b = Date.UTC(+bugun[0], +bugun[1] - 1, +bugun[2]);
  return Math.round((a - b) / 86400000);
}
function anahtar_(s) {
  return String(s == null ? '' : s).replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i').replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g').replace(/Ü/g, 'u').replace(/ü/g, 'u').replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function aktif_(k) { return k.durum !== 'Kazanıldı' && k.durum !== 'Kaybedildi'; }
function trKucuk_(s) { return String(s || '').toLocaleLowerCase('tr-TR'); }
function sirala_(l, alan, azalan) {
  return l.sort(function (x, y) { var a = String(x[alan] || ''), b = String(y[alan] || ''); return azalan ? b.localeCompare(a) : a.localeCompare(b); });
}
// Nesnenin bilinen alanlarını kayda yazar (id/danisman korunur)
function aktar_(ad, hedef, kaynak) {
  SAYFALAR[ad].forEach(function (k) { if (k !== 'id' && k !== 'danisman' && kaynak[k] !== undefined) hedef[k] = kaynak[k]; });
}


// ═══════════════════════════════════════════════
//  İŞLEMLER (ön yüzün api('…') çağrıları)
// ═══════════════════════════════════════════════

var YAZAN = { ayarKaydet: 1, kisiKaydet: 1, kisiArsivle: 1, dokunusEkle: 1, portfoyKaydet: 1, portfoyArsivle: 1,
  gosterimEkle: 1, randevuKaydet: 1, randevuBitti: 1, randevuErtele: 1, randevuSil: 1, otomatikSenkron: 1,
  eslesmeyeniBagla: 1, eslesmeyendenPortfoy: 1 };

var ISLEMLER = {

  baslat: function (kim) {
    var a = ayar_(kim);
    return { eposta: '', ad: kim, hedef: +a.hedef || 0, dosyaUrl: '', pin: a.pin || '',
      matbuKurulu: false, matbuDanisman: '', sonMatbuSenkron: a.sonMatbuSenkron || '', otoSenkron: a.otoSenkron === 'EVET' };
  },

  ayarKaydet: function (kim, a) {
    var o = a[0] || {}, s = ayar_(kim);
    if (o.pin !== undefined) s.pin = o.pin;
    if (o.hedef !== undefined) s.hedef = String(+o.hedef || '');
    guncelle_('Ayarlar', s);
    return true;
  },

  // ── Matbu aktarımı: ikinci aşamada ──
  matbuKur: function () { return { hata: MATBU_YAKINDA }; },
  matbuSenkron: function () { return { hata: MATBU_YAKINDA }; },
  otomatikSenkron: function () { return true; },
  belgelerim: function () { return { hata: MATBU_YAKINDA }; },

  eslesmeyeniBagla: function (kim, a) {
    var o = a[0] || {};
    ekle_('Gosterimler', { id: yeniId_('g'), danisman: kim, portfoyId: o.portfoyId, kisiId: o.kisiId, tarih: o.tarih || g_(0),
      ilgi: '', geriBildirim: '', kaynak: 'Yer gösterme belgesi', disAnahtar: o.disAnahtar || '' });
    return { tamam: true };
  },

  eslesmeyendenPortfoy: function (kim, a) {
    var o = a[0] || {};
    var p = ekle_('Portfoyler', { id: yeniId_('p'), danisman: kim, baslik: String(o.adres || '').slice(0, 60), adres: o.adres || '',
      fiyat: o.fiyat || '', durum: 'Yayında', ilanLink: o.ilan || '', kaynak: 'Yer gösterme belgesi', sonSenkron: simdi_() });
    if (o.kisiId) ISLEMLER.eslesmeyeniBagla(kim, [{ portfoyId: p.id, kisiId: o.kisiId, tarih: o.tarih, disAnahtar: o.disAnahtar }]);
    return { tamam: true, portfoyId: p.id };
  },

  bugun: function (kim) {
    var l = benim_('Kisiler', kim).filter(function (k) { var f = gf_(k.sonrakiTarih); return aktif_(k) && f !== null && f <= 0; }).map(kopya_);
    l.forEach(function (k) { k.gecikme = -gf_(k.sonrakiTarih); });
    return l.sort(function (x, y) { return y.gecikme - x.gecikme; });
  },

  soguyanlar: function (kim) {
    var l = benim_('Kisiler', kim).filter(function (k) { var f = gf_(k.sonTemas); return aktif_(k) && (f === null || f <= -15); }).map(kopya_);
    l.forEach(function (k) { k.sessizGun = k.sonTemas ? -gf_(k.sonTemas) : null; });
    return l.sort(function (x, y) { return (y.sessizGun || 999) - (x.sessizGun || 999); });
  },

  kisiler: function (kim, a) {
    var f = a[0] || {}, l = benim_('Kisiler', kim).map(kopya_);
    if (f.q) { var q = trKucuk_(f.q); l = l.filter(function (k) { return trKucuk_(k.ad + ' ' + k.telefon + ' ' + k.arayis + ' ' + k.notlar).indexOf(q) > -1; }); }
    if (f.durum === 'Aktif') l = l.filter(aktif_);
    else if (f.durum && f.durum !== 'Hepsi') l = l.filter(function (k) { return k.durum === f.durum; });
    l.forEach(function (k) { k.sessizGun = k.sonTemas ? -gf_(k.sonTemas) : null; });
    return sirala_(l, 'sonTemas', true);
  },

  kisiDetay: function (kim, a) {
    var k = bul_('Kisiler', kim, a[0]); if (!k || k.arsiv === 'EVET') return null;
    var pAd = {}; benim_('Portfoyler', kim).forEach(function (p) { pAd[p.id] = p.baslik; });
    var dok = oku_('Dokunuslar').filter(function (d) { return d.danisman === kim && d.kisiId === a[0]; }).map(kopya_);
    dok.forEach(function (d) { d.portfoyAd = d.portfoyId ? (pAd[d.portfoyId] || '') : ''; });
    var gos = oku_('Gosterimler').filter(function (g) { return g.danisman === kim && g.kisiId === a[0]; }).map(kopya_);
    gos.forEach(function (g) { g.portfoyAd = pAd[g.portfoyId] || '(silinmiş portföy)'; });
    return { kisi: kopya_(k), dokunuslar: sirala_(dok, 'tarih', true), gosterimler: sirala_(gos, 'tarih', true) };
  },

  kisiKaydet: function (kim, a) {
    var o = a[0] || {}, k = o.id ? bul_('Kisiler', kim, o.id) : null;
    if (!k) {
      k = { id: yeniId_('k'), danisman: kim, sonTemas: g_(0), olusturma: simdi_() };
      aktar_('Kisiler', k, o); k.sonTemas = k.sonTemas || g_(0);
      ekle_('Kisiler', k);
    } else { aktar_('Kisiler', k, o); guncelle_('Kisiler', k); }
    return k.id;
  },

  kisiArsivle: function (kim, a) {
    var k = bul_('Kisiler', kim, a[0]); if (k) { k.arsiv = 'EVET'; guncelle_('Kisiler', k); }
    return true;
  },

  dokunusEkle: function (kim, a) {
    var o = a[0] || {};
    if (!bul_('Kisiler', kim, o.kisiId)) return false;
    ekle_('Dokunuslar', { id: yeniId_('d'), danisman: kim, kisiId: o.kisiId, portfoyId: o.portfoyId || '', tarih: simdi_(), tur: o.tur || '', ozet: o.ozet || '' });
    var k = bul_('Kisiler', kim, o.kisiId);
    k.sonTemas = g_(0);
    if (o.sonrakiTarih !== undefined) k.sonrakiTarih = o.sonrakiTarih;
    if (o.sonrakiAdim !== undefined) k.sonrakiAdim = o.sonrakiAdim;
    if (o.durum) k.durum = o.durum;
    guncelle_('Kisiler', k);
    return true;
  },

  portfoyler: function (kim, a) {
    var f = a[0] || {}, l = benim_('Portfoyler', kim).map(kopya_);
    if (f.q) { var q = trKucuk_(f.q); l = l.filter(function (p) { return trKucuk_(p.baslik + ' ' + p.adres + ' ' + p.malSahibi + ' ' + p.notlar).indexOf(q) > -1; }); }
    if (f.durum && f.durum !== 'Hepsi') l = l.filter(function (p) { return p.durum === f.durum; });
    var gos = oku_('Gosterimler').filter(function (g) { return g.danisman === kim; });
    l.forEach(function (p) {
      var g = gos.filter(function (x) { return x.portfoyId === p.id; });
      p.gosterimSayisi = g.length;
      p.sicakSayisi = g.filter(function (x) { return x.ilgi === 'Sıcak'; }).length;
      var so = g.map(function (x) { return String(x.tarih); }).sort().pop();
      p.sonGosterim = so || ''; p.sessizGun = so ? -gf_(so) : null;
      p.yetkiKalan = p.yetkiBitis ? gf_(p.yetkiBitis) : null;
    });
    return sirala_(l, 'sonGosterim', true);
  },

  portfoyDetay: function (kim, a) {
    var p = bul_('Portfoyler', kim, a[0]); if (!p || p.arsiv === 'EVET') return null;
    p = kopya_(p);
    var kb = {}; oku_('Kisiler').forEach(function (k) { if (k.danisman === kim) kb[k.id] = k; });
    var gos = oku_('Gosterimler').filter(function (g) { return g.danisman === kim && g.portfoyId === a[0]; }).map(kopya_);
    gos.forEach(function (g) { var k = kb[g.kisiId] || {}; g.kisiAd = k.ad || '(silinmiş kişi)'; g.kisiTel = k.telefon || ''; g.kisiDurum = k.durum || ''; g.kisiButce = k.butce || ''; });
    var kon = oku_('Dokunuslar').filter(function (d) { return d.danisman === kim && d.portfoyId === a[0]; }).map(kopya_);
    kon.forEach(function (d) { d.kisiAd = (kb[d.kisiId] || {}).ad || '—'; });
    p.yetkiKalan = p.yetkiBitis ? gf_(p.yetkiBitis) : null;
    return { portfoy: p, gosterimler: sirala_(gos, 'tarih', true), konusmalar: sirala_(kon, 'tarih', true) };
  },

  portfoyKaydet: function (kim, a) {
    var o = a[0] || {}, p = o.id ? bul_('Portfoyler', kim, o.id) : null;
    if (!p) { p = { id: yeniId_('p'), danisman: kim, durum: 'Yayında' }; aktar_('Portfoyler', p, o); ekle_('Portfoyler', p); }
    else { aktar_('Portfoyler', p, o); guncelle_('Portfoyler', p); }
    return p.id;
  },

  portfoyArsivle: function (kim, a) {
    var p = bul_('Portfoyler', kim, a[0]); if (p) { p.arsiv = 'EVET'; guncelle_('Portfoyler', p); }
    return true;
  },

  gosterimEkle: function (kim, a) {
    var o = a[0] || {};
    if (!bul_('Portfoyler', kim, o.portfoyId) || !bul_('Kisiler', kim, o.kisiId)) return false;
    ekle_('Gosterimler', { id: yeniId_('g'), danisman: kim, portfoyId: o.portfoyId, kisiId: o.kisiId, tarih: o.tarih || g_(0),
      ilgi: o.ilgi || '', geriBildirim: o.geriBildirim || '', kaynak: 'Elle', disAnahtar: '' });
    var k = bul_('Kisiler', kim, o.kisiId); k.sonTemas = g_(0); guncelle_('Kisiler', k);
    ekle_('Dokunuslar', { id: yeniId_('d'), danisman: kim, kisiId: o.kisiId, portfoyId: o.portfoyId, tarih: simdi_(),
      tur: 'Yer gösterimi', ozet: (o.geriBildirim || 'Yer gösterimi yapıldı') + (o.ilgi ? ' [' + o.ilgi + ']' : '') });
    return true;
  },

  kisiSecenekleri: function (kim) {
    return benim_('Kisiler', kim).map(function (k) { return { id: k.id, ad: k.ad, tip: k.tip }; })
      .sort(function (x, y) { return String(x.ad).localeCompare(String(y.ad), 'tr'); });
  },

  portfoySecenekleri: function (kim) {
    return benim_('Portfoyler', kim).map(function (p) { return { id: p.id, baslik: p.baslik }; })
      .sort(function (x, y) { return String(x.baslik).localeCompare(String(y.baslik), 'tr'); });
  },

  malSahibiRaporu: function (kim, a) {
    var d = ISLEMLER.portfoyDetay(kim, [a[0]]); if (!d) return null;
    var gun = Number(a[1] || 7), p = d.portfoy;
    var son = d.gosterimler.filter(function (g) { var f = gf_(g.tarih); return f !== null && f >= -gun; });
    var t = ['Sayın ' + (p.malSahibi || 'mülk sahibi') + ',', '', p.baslik + ' için son ' + gun + ' günün özeti:', ''];
    if (!son.length) { t.push('• Bu dönemde yer gösterimi olmadı.'); t.push('• Portföy ilanlarda aktif olarak yayında.'); }
    else {
      t.push('• ' + son.length + ' yer gösterimi yapıldı.');
      var sic = son.filter(function (g) { return g.ilgi === 'Sıcak'; }).length;
      if (sic) t.push('• ' + sic + ' kişi ciddi ilgi gösterdi, takipteyiz.');
      var geri = son.filter(function (g) { return g.geriBildirim; });
      if (geri.length) { t.push(''); t.push('Gelen geri bildirimler:'); geri.forEach(function (g) { t.push('– ' + g.geriBildirim); }); }
    }
    t.push(''); t.push('Bugüne kadar toplam ' + d.gosterimler.length + ' gösterim yapıldı.');
    if (p.yetkiKalan !== null && p.yetkiKalan <= 30 && p.yetkiKalan >= 0) t.push('Yetki sözleşmemizin bitimine ' + p.yetkiKalan + ' gün kaldı.');
    t.push(''); t.push('Sorularınız için her zaman ulaşabilirsiniz.');
    return { metin: t.join('\n'), malSahibiTel: p.malSahibiTel || '', baslik: p.baslik, gosterimSayisi: son.length };
  },

  randevular: function (kim, a) {
    var f = a[0] || {}, l = benim_('Randevular', kim).map(kopya_);
    if (f.bas) l = l.filter(function (r) { return String(r.tarih) >= f.bas; });
    if (f.son) l = l.filter(function (r) { return String(r.tarih) <= f.son; });
    return l.sort(function (x, y) { if (x.tarih !== y.tarih) return x.tarih < y.tarih ? -1 : 1; return (x.saat || '99:99') < (y.saat || '99:99') ? -1 : 1; });
  },

  randevuKaydet: function (kim, a) {
    var o = a[0] || {}, r = o.id ? bul_('Randevular', kim, o.id) : null;
    if (!r) { r = { id: yeniId_('r'), danisman: kim, bitti: '' }; aktar_('Randevular', r, o); ekle_('Randevular', r); }
    else { aktar_('Randevular', r, o); guncelle_('Randevular', r); }
    return r.id;
  },

  randevuBitti: function (kim, a) {
    var r = bul_('Randevular', kim, a[0]); if (r) { r.bitti = a[1] ? 'EVET' : ''; guncelle_('Randevular', r); }
    return true;
  },

  randevuErtele: function (kim, a) {
    var r = bul_('Randevular', kim, a[0]); if (!r) return { hata: 'yok' };
    var q = String(r.tarih).split('-'), d = new Date(Date.UTC(+q[0], +q[1] - 1, +q[2]));
    d.setUTCDate(d.getUTCDate() + Number(a[1] || 1));
    r.tarih = Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd'); guncelle_('Randevular', r);
    return { tamam: true, tarih: r.tarih };
  },

  randevuSil: function (kim, a) {
    var r = bul_('Randevular', kim, a[0]); if (r) { r.arsiv = 'EVET'; guncelle_('Randevular', r); }
    return true;
  },

  randevuKisiEslestir: function (kim, a) {
    var ad = String(a[0] || '').replace(/\s+(Bey|Hanım|Hanim)$/i, ''); if (!ad) return '';
    var h = anahtar_(ad), k = benim_('Kisiler', kim).filter(function (x) { return anahtar_(x.ad) === h; })[0];
    return k ? k.id : '';
  },

  hedefDurumu: function (kim) {
    var a = ayar_(kim), yil = Utilities.formatDate(new Date(), TZ, 'yyyy');
    var kap = kapanislar_(kim, yil);
    if (kap) {
      var ciro = kap.reduce(function (s, k) { return s + k.toplamHB; }, 0), hac = kap.reduce(function (s, k) { return s + k.tutar; }, 0);
      return { kaynak: 'kapanis', hedef: +a.hedef || 0, toplam: ciro, hacim: hac, adet: kap.length, yil: yil,
        kapanislar: kap.map(function (k) { return { ad: k.musteri || k.malSahibi || k.adres, adres: k.adres, tur: k.tur,
          kapanisTarihi: k.tarih, komisyon: String(k.toplamHB), tutar: k.tutar }; }) };
    }
    var kz = benim_('Kisiler', kim).filter(function (k) { return k.durum === 'Kazanıldı' && String(k.kapanisTarihi).indexOf(yil) === 0; }).map(kopya_);
    var tp = kz.reduce(function (x, k) { return x + (+String(k.komisyon).replace(/\D/g, '') || 0); }, 0);
    return { kaynak: 'elle', hedef: +a.hedef || 0, toplam: tp, hacim: 0, adet: kz.length, yil: yil, kapanislar: sirala_(kz, 'kapanisTarihi', true) };
  }
};


// ═══════════════════════════════════════════════
//  KAPANIŞ FORMU'NDAN HEDEF
// ═══════════════════════════════════════════════

/* Kapanış tablosunda danışmanın bu yılki kayıtları; tablo tanımlı değilse null */
function kapanislar_(kim, yil) {
  var id = PropertiesService.getScriptProperties().getProperty('KAPANIS_SHEET_ID');
  if (!id) return null;
  try {
    var ss = SpreadsheetApp.openById(id), sh = ss.getSheetByName('Sayfa1') || ss.getSheets()[0];
    var v = sh.getDataRange().getDisplayValues(), bas = v[0].map(function (h) { return anahtar_(h); });
    function sut() { for (var i = 0; i < arguments.length; i++) { var c = bas.indexOf(anahtar_(arguments[i])); if (c > -1) return c; } return -1; }
    var cD = sut('Danışman'), cT = sut('Tarih', 'Kapanış Tarihi', 'İşlem Tarihi'), cHB = sut('Toplam HB', 'Toplam Hizmet Bedeli'),
        cTut = sut('Tutar', 'Bedel'), cTur = sut('Tür'), cAdr = sut('Adres'), cAl = sut('Alıcı', 'Alıcı/Kiracı', 'Müşteri'), cMs = sut('Mülk Sahibi');
    if (cD < 0 || cT < 0) return null;
    var sayi = function (s) { s = String(s || '').replace(/[^\d,.-]/g, ''); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/[.,]/g, ''); return Number(s) || 0; };
    var iso = function (s) { var m = String(s).match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/); if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : ''; };
    var l = [];
    for (var i = 1; i < v.length; i++) {
      var r = v[i]; if (anahtar_(r[cD]) !== anahtar_(kim)) continue;
      var t = iso(r[cT]); if (t.indexOf(yil) !== 0) continue;
      l.push({ tarih: t, toplamHB: cHB > -1 ? sayi(r[cHB]) : 0, tutar: cTut > -1 ? sayi(r[cTut]) : 0, tur: cTur > -1 ? r[cTur] : '',
        adres: cAdr > -1 ? r[cAdr] : '', musteri: cAl > -1 ? r[cAl] : '', malSahibi: cMs > -1 ? r[cMs] : '' });
    }
    return l.sort(function (a, b) { return a.tarih < b.tarih ? 1 : -1; });
  } catch (e) { Logger.log('Kapanış okunamadı: ' + e); return null; }
}
