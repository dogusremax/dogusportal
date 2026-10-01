/**
 * RE/MAX DOĞUŞ — ODA REZERVASYON (Apps Script backend)
 * Sayfa: dogusportal.com/oda.html
 *
 * KURULUM (tek sefer):
 * 1) script.google.com → Yeni proje → adı "Oda Rezervasyon"
 * 2) Bu kodun tamamını Kod.gs'e yapıştır → Kaydet
 * 3) Üstten "kurulum" fonksiyonunu seç → Çalıştır → izinleri onayla
 *    ("ODA REZERVASYON" adlı e-tablo Drive'ında kendiliğinden oluşur)
 * 4) Dağıt → Yeni dağıtım → Tür: Web uygulaması
 *    Yürüten: Ben   ·   Erişim: Herkes   → Dağıt
 * 5) Çıkan /exec adresini Claude'a gönder.
 *
 * Güncelleme: Dağıt → Dağıtımları yönet → kalem → Sürüm: Yeni (adres değişmez)
 */

var ODALAR = ['Toplantı Odası', 'Nöbet Odası'];
var BASLANGIC = '09:00', BITIS = '20:00';

// Bu dosya herkese açık sitede durur: gerçek PIN'leri buraya YAZMAYIN.
// Apps Script editörüne yapıştırdıktan sonra PIN'leri orada doldurun.
var KISILER = {
  'BROKER_PIN': 'Umut Tokkuş',
  'PIN1': 'Ayşegül Alpay',
  'PIN2': 'Aysun Yılmaz',
  'PIN3': 'Evşen Özazman',
  'PIN4': 'Gamze Yetkin',
  'PIN5': 'Gizem Gök',
  'PIN6': 'İrem Aleyna Tetik',
  'PIN7': 'Orhan Özazman',
  'PIN8': 'Özlem Varol'
};
var BROKER_PIN = 'BROKER_PIN'; // Apps Script editöründe gerçek PIN'i yazın
var BASLIK = ['id', 'oda', 'tarih', 'bas', 'bit', 'kisi', 'tur', 'not', 'olusturma'];

function kurulum() { _sayfa(); }

function _sayfa() {
  var pr = PropertiesService.getScriptProperties();
  var id = pr.getProperty('SHEET_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('ODA REZERVASYON');
    pr.setProperty('SHEET_ID', ss.getId());
  }
  var sh = ss.getSheetByName('Rezervasyonlar');
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName('Rezervasyonlar');
    sh.getRange(1, 1, 1, BASLIK.length).setValues([BASLIK]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('C:E').setNumberFormat('@');
  }
  return sh;
}

function _cevap(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function _hepsi() {
  var sh = _sayfa(), v = sh.getDataRange().getDisplayValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    var o = {}; BASLIK.forEach(function (b, j) { o[b] = v[i][j]; }); o._satir = i + 1;
    out.push(o);
  }
  return out;
}

function _dk(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
function _bugun() { return Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd'); }
function _temiz(r) { var o = {}; BASLIK.forEach(function (b) { o[b] = r[b]; }); return o; }

function _liste(bas, bit) {
  bas = bas || _bugun(); bit = bit || '9999-12-31';
  return _hepsi().filter(function (r) { return r.tarih >= bas && r.tarih <= bit; })
    .map(_temiz)
    .sort(function (a, b) { return (a.tarih + a.bas).localeCompare(b.tarih + b.bas); });
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    return _cevap({ ok: true, odalar: ODALAR, saat: [BASLANGIC, BITIS], liste: _liste(p.bas, p.bit) });
  } catch (err) { return _cevap({ ok: false, hata: String(err) }); }
}

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents || '{}'); } catch (x) { return _cevap({ ok: false, hata: 'Geçersiz istek' }); }
  var kisi = KISILER[String(d.pin || '')];
  if (!kisi) return _cevap({ ok: false, hata: 'Hatalı PIN' });

  if (d.action === 'giris') return _cevap({ ok: true, kisi: kisi, broker: d.pin === BROKER_PIN });

  var kilit = LockService.getScriptLock();
  try { kilit.waitLock(15000); } catch (x) { return _cevap({ ok: false, hata: 'Sistem meşgul, tekrar dene' }); }
  try {
    var sh = _sayfa();

    if (d.action === 'ekle') {
      if (ODALAR.indexOf(d.oda) < 0) return _cevap({ ok: false, hata: 'Oda bulunamadı' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tarih || '')) return _cevap({ ok: false, hata: 'Tarih hatalı' });
      var b = _dk(d.bas), s = _dk(d.bit);
      if (!(s > b) || b < _dk(BASLANGIC) || s > _dk(BITIS)) return _cevap({ ok: false, hata: 'Saat aralığı hatalı' });
      if (d.tarih < _bugun()) return _cevap({ ok: false, hata: 'Geçmiş güne rezervasyon yapılamaz' });

      var cakisan = null;
      _hepsi().forEach(function (r) {
        if (cakisan || r.oda !== d.oda || r.tarih !== d.tarih) return;
        if (_dk(r.bas) < s && b < _dk(r.bit)) cakisan = r;
      });
      if (cakisan) return _cevap({ ok: false, hata: 'Bu saat az önce doldu: ' + cakisan.bas + '–' + cakisan.bit + ' ' + cakisan.kisi, liste: _liste() });

      var id = Utilities.getUuid().slice(0, 8);
      var satir = [id, d.oda, d.tarih, d.bas, d.bit, kisi, String(d.tur || '').slice(0, 30), String(d.not || '').slice(0, 120),
        Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd HH:mm')];
      sh.appendRow(satir);
      return _cevap({ ok: true, id: id, liste: _liste() });
    }

    if (d.action === 'iptal') {
      var hedef = null;
      _hepsi().forEach(function (r) { if (r.id === d.id) hedef = r; });
      if (!hedef) return _cevap({ ok: false, hata: 'Rezervasyon bulunamadı', liste: _liste() });
      if (hedef.kisi !== kisi && d.pin !== BROKER_PIN) return _cevap({ ok: false, hata: 'Sadece kendi rezervasyonunu iptal edebilirsin' });
      sh.deleteRow(hedef._satir);
      return _cevap({ ok: true, liste: _liste() });
    }

    return _cevap({ ok: false, hata: 'Bilinmeyen işlem' });
  } catch (err) {
    return _cevap({ ok: false, hata: String(err) });
  } finally { kilit.releaseLock(); }
}
