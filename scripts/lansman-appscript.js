// ═══════════════════════════════════════════════════════════════════
//  22 Kasım Kuzey Kıbrıs Lansmanı — davetli takibi
//  Sayfa: dogusportal.com/kibris-bulusma.html (Davetli panelim)
//
//  Bu dosya dogus-whatsapp-service projesindeki Kod.gs'nin EN ALTINA yapıştırılır.
//  Kurulum adımları: scripts/lansman-rehber.md
//
//  Giriş: danışman Koç sayfasındaki "Danışman Takip PIN"i ile girer. PIN'i bu kod
//  kendisi tutmaz; aynı servisin action:'koc' girişine sorar, sonucu 15 dk önbellekte tutar.
//  Kayıtlar: "Kıbrıs Lansmanı 22 Kasım — Davetliler" tablosu (ilk çağrıda kendisi açılır).
//  Bildirim: servisteki pushGonder_ ile danışmanın telefonuna gider; ayrıca sayfadaki
//  "Bildirimlerim" listesine yazılır.
//
//  doPost switch'ine eklenecek satır:
//    case 'lansman': return jsonResponse(lansman_(payload));
// ═══════════════════════════════════════════════════════════════════

var LANSMAN = {
  SERVIS: 'https://script.google.com/macros/s/AKfycbwqxxXftJ_b1TrF_GFYfus6dtBe6lp4gDWTZVl9QuXAjYxjHfSvl2Ni_X3mJKm6zAss_w/exec',
  LINK: 'https://dogusportal.com/kibris-bulusma.html#panel',
  TESLIM: {
    liste:   '2026-11-09T23:59:59+03:00',
    teyit:   '2026-11-13T18:00:00+03:00',
    son:     '2026-11-19T23:59:59+03:00',
    lansman: '2026-11-22T13:30:00+03:00',
    satis:   '2027-01-31T23:59:59+03:00'
  },
  HEDEF: { liste: 10, teyit: 3 },
  // Müşteri Takip'teki adlarla aynı (bildirimler bu adlara gider). Brokerlar sıralamada yalnız kayıt girerlerse görünür.
  EKIP: ['Aysun Yılmaz', 'Ayşegül Alpay', 'Evşen Özazman', 'Gamze Yetkin', 'Gizem Gök',
         'İrem Tetik', 'Orhan Özazman', 'Özlem Varol'],
  BROKER_AD: { umut: 'Umut Tokkuş', makbule: 'Makbule Tokkuş' },
  KOORDINATOR: 'Makbule Tokkuş',   // yeni kesin teyitler ona bildirilir
  SUTUN: ['id', 'danisman', 'ad', 'telefon', 'telAnahtar', 'kisi', 'butce', 'ilgi', 'durum', 'not',
          'kayit', 'teyit', 'guncel', 'guncelleyen'],
  DURUM: { davet: 'Davet edildi', teyit: 'Teyit verdi', son: 'Son teyit alındı', geldi: 'Lansmana geldi',
           gorusme: 'Görüşme yapıldı', satis: 'Satış', vazgecti: 'Katılmayacak' },
  KESIN: ['teyit', 'son', 'geldi', 'gorusme', 'satis'],
  GELDI: ['geldi', 'gorusme', 'satis']
};

function lansman_(p) {
  try {
    var kim = lansmanKim_(p.pin);
    if (!kim) return { ok: false, error: 'PIN hatalı. Danışman Takip PIN\'inle gir.' };
    switch (p.islem) {
      case 'giris':
      case 'durum':   return lansmanDurum_(kim);
      case 'kaydet':  return lansmanKaydet_(kim, p);
      case 'sil':     return lansmanSil_(kim, p);
      case 'okundu':  return lansmanOkundu_(kim);
      case 'bildir':  return lansmanBildir_(kim, p);
    }
    return { ok: false, error: 'Bilinmeyen işlem.' };
  } catch (e) {
    return { ok: false, error: 'Sunucu hatası: ' + e.message };
  }
}

/* ---------- kimlik: Koç girişine sor, 15 dk hatırla ---------- */
function lansmanKim_(pin) {
  pin = String(pin || '').trim();
  if (!/^\d{4,6}$/.test(pin)) return null;
  var anahtar = 'lk_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'lansman|' + pin));
  var cache = CacheService.getScriptCache(), c = cache.get(anahtar);
  if (c) return JSON.parse(c);
  var res = UrlFetchApp.fetch(LANSMAN.SERVIS, {
    method: 'post', contentType: 'text/plain', followRedirects: true, muteHttpExceptions: true,
    payload: JSON.stringify({ action: 'koc', islem: 'giris', pin: pin })
  });
  var r; try { r = JSON.parse(res.getContentText()); } catch (e) { return null; }
  if (!r || !r.ok) return null;
  var kim = r.danismanlar
    ? { ad: LANSMAN.BROKER_AD[r.broker] || 'Broker', ilkAd: r.broker === 'makbule' ? 'Makbule' : 'Umut', broker: true }
    : { ad: r.ad, ilkAd: r.ilkAd || String(r.ad).split(' ')[0], broker: false };
  cache.put(anahtar, JSON.stringify(kim), 900);
  return kim;
}

/* ---------- tablo ---------- */
function lansmanTablo_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('LANSMAN_SHEET_ID'), ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else {
    ss = SpreadsheetApp.create('Kıbrıs Lansmanı 22 Kasım — Davetliler');
    var d = ss.getSheets()[0]; d.setName('Davetliler');
    d.appendRow(LANSMAN.SUTUN); d.setFrozenRows(1);
    var b = ss.insertSheet('Bildirimler');
    b.appendRow(['zaman', 'kime', 'baslik', 'metin', 'gonderen', 'okundu']); b.setFrozenRows(1);
    props.setProperty('LANSMAN_SHEET_ID', ss.getId());
  }
  return ss;
}

function lansmanSatirlar_() {
  var sh = lansmanTablo_().getSheetByName('Davetliler'), v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    var o = { _satir: i + 1 };
    LANSMAN.SUTUN.forEach(function (k, j) { o[k] = v[i][j] instanceof Date ? v[i][j].toISOString() : v[i][j]; });
    o.kisi = Number(o.kisi) || 1;
    o.id = String(o.id); o.telefon = String(o.telefon); o.telAnahtar = lansmanTelAnahtar_(o.telAnahtar);
    out.push(o);
  }
  return out;
}

function lansmanTelAnahtar_(t) {
  var d = String(t || '').replace(/\D/g, '');
  if (d.length === 12 && d.indexOf('90') === 0) d = d.slice(2);
  if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
  return d;
}

/* ---------- özet ---------- */
function lansmanOzet_(satirlar, ad) {
  var t13 = new Date(LANSMAN.TESLIM.teyit).getTime();
  var o = { ad: ad, liste: 0, teyit: 0, zamaninda: 0, kisi: 0, geldi: 0, satis: 0, sonBekleyen: 0 };
  satirlar.forEach(function (r) {
    if (r.danisman !== ad) return;
    if (r.durum !== 'vazgecti') o.liste++;
    if (LANSMAN.KESIN.indexOf(r.durum) >= 0) {
      o.teyit++; o.kisi += r.kisi;
      if (r.teyit && new Date(r.teyit).getTime() <= t13) o.zamaninda++;
    }
    if (r.durum === 'teyit') o.sonBekleyen++;
    if (LANSMAN.GELDI.indexOf(r.durum) >= 0) o.geldi++;
    if (r.durum === 'satis') o.satis++;
  });
  o.hak = o.zamaninda >= LANSMAN.HEDEF.teyit;
  return o;
}

function lansmanSiralama_(satirlar) {
  var adlar = LANSMAN.EKIP.slice();
  satirlar.forEach(function (r) { if (adlar.indexOf(r.danisman) < 0) adlar.push(r.danisman); });
  return adlar.map(function (a) { return lansmanOzet_(satirlar, a); });
}

function lansmanBildirimlerim_(ad) {
  var v = lansmanTablo_().getSheetByName('Bildirimler').getDataRange().getValues(), out = [];
  for (var i = v.length - 1; i >= 1 && out.length < 20; i--) {
    if (v[i][1] === ad || v[i][1] === 'herkes')
      out.push({ zaman: v[i][0] instanceof Date ? v[i][0].toISOString() : v[i][0], baslik: v[i][2], metin: v[i][3],
                 okundu: v[i][1] === 'herkes' ? true : v[i][5] === true });
  }
  return out;
}

function lansmanDurum_(kim) {
  var s = lansmanSatirlar_();
  var benim = s.filter(function (r) { return kim.broker || r.danisman === kim.ad; })
               .map(function (r) { delete r._satir; delete r.telAnahtar; return r; });
  return {
    ok: true, ad: kim.ad, ilkAd: kim.ilkAd, broker: kim.broker, simdi: new Date().toISOString(),
    teslim: LANSMAN.TESLIM, hedef: LANSMAN.HEDEF, ekip: LANSMAN.EKIP,
    davetliler: benim, siralama: lansmanSiralama_(s), bildirimler: lansmanBildirimlerim_(kim.ad)
  };
}

/* ---------- kaydet / sil ---------- */
function lansmanKaydet_(kim, p) {
  var d = p.davetli || {};
  var ad = String(d.ad || '').trim().replace(/\s+/g, ' ');
  var tel = String(d.telefon || '').trim(), anahtar = lansmanTelAnahtar_(tel);
  var durum = LANSMAN.DURUM[d.durum] ? d.durum : 'davet';
  if (ad.split(' ').length < 2) return { ok: false, error: 'Misafirin adını ve soyadını yaz.' };
  if (anahtar.length !== 10) return { ok: false, error: 'Telefon numarasını eksiksiz yaz (05xx xxx xx xx).' };

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = lansmanTablo_().getSheetByName('Davetliler'), s = lansmanSatirlar_();
    var eski = d.id ? s.filter(function (r) { return r.id === d.id; })[0] : null;
    if (d.id && !eski) return { ok: false, error: 'Kayıt bulunamadı, sayfayı yenile.' };
    if (eski && !kim.broker && eski.danisman !== kim.ad) return { ok: false, error: 'Bu kayıt sana ait değil.' };
    var danisman = eski ? eski.danisman : (kim.broker && p.danisman ? p.danisman : kim.ad);

    var ayni = s.filter(function (r) { return r.telAnahtar === anahtar && r.id !== d.id; })[0];
    if (ayni) {
      if (ayni.danisman === danisman) return { ok: false, error: 'Bu numara listende zaten var: ' + ayni.ad + '.' };
      return { ok: false, error: 'Bu numara ' + ayni.danisman + ' adına ' +
        Utilities.formatDate(new Date(ayni.kayit), 'Europe/Istanbul', 'd MMMM') +
        ' tarihinde kaydedilmiş. Müşteri ilk kaydeden danışmanındır.' };
    }

    var simdi = new Date().toISOString();
    var kayit = {
      id: eski ? eski.id : 'd' + Utilities.getUuid().slice(0, 8), danisman: danisman, ad: ad, telefon: "'" + tel, telAnahtar: "'" + anahtar,
      kisi: Math.min(10, Math.max(1, parseInt(d.kisi, 10) || 1)), butce: String(d.butce || ''), ilgi: d.ilgi === 'orta' ? 'orta' : 'yuksek',
      durum: durum, not: String(d.not || '').slice(0, 300),
      kayit: eski ? eski.kayit : simdi,
      teyit: eski && eski.teyit ? eski.teyit : (LANSMAN.KESIN.indexOf(durum) >= 0 ? simdi : ''),
      guncel: simdi, guncelleyen: kim.ad
    };
    var satir = LANSMAN.SUTUN.map(function (k) { return kayit[k]; });
    if (eski) sh.getRange(eski._satir, 1, 1, satir.length).setValues([satir]);
    else sh.appendRow(satir);
    SpreadsheetApp.flush();

    var yeniKesin = LANSMAN.KESIN.indexOf(durum) >= 0 && !(eski && LANSMAN.KESIN.indexOf(eski.durum) >= 0);
    if (yeniKesin && kim.ad !== LANSMAN.KOORDINATOR)
      lansmanPush_(LANSMAN.KOORDINATOR, 'Yeni kesin teyit', danisman + ': ' + ad + ' (' + kayit.kisi + ' kişi)', 'sistem');
    if (kim.broker && danisman !== kim.ad && (!eski || eski.durum !== durum))
      lansmanPush_(danisman, 'Davetlin güncellendi', ad + ': ' + LANSMAN.DURUM[durum], kim.ad);
  } finally { lock.releaseLock(); }
  return lansmanDurum_(kim);
}

function lansmanSil_(kim, p) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var r = lansmanSatirlar_().filter(function (x) { return x.id === p.id; })[0];
    if (!r) return lansmanDurum_(kim);
    if (!kim.broker && r.danisman !== kim.ad) return { ok: false, error: 'Bu kayıt sana ait değil.' };
    lansmanTablo_().getSheetByName('Davetliler').deleteRow(r._satir);
  } finally { lock.releaseLock(); }
  return lansmanDurum_(kim);
}

/* ---------- bildirimler ---------- */
function lansmanPush_(kime, baslik, metin, gonderen) {
  lansmanTablo_().getSheetByName('Bildirimler').appendRow([new Date(), kime, baslik, metin, gonderen || '', false]);
  if (kime === 'herkes') return;
  if (typeof pushGonder_ === 'function') {
    try { pushGonder_(kime, baslik, metin, LANSMAN.LINK, 'lansman'); } catch (e) { Logger.log('lansman push: ' + e.message); }
  }
}

function lansmanOkundu_(kim) {
  var sh = lansmanTablo_().getSheetByName('Bildirimler'), v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][1] === kim.ad && v[i][5] !== true) sh.getRange(i + 1, 6).setValue(true);
  return lansmanDurum_(kim);
}

/* Broker: kime = 'herkes' | 'geride' | danışman adı */
function lansmanBildir_(kim, p) {
  if (!kim.broker) return { ok: false, error: 'Bildirimi yalnız brokerlar gönderebilir.' };
  var metin = String(p.metin || '').trim();
  if (!metin) return { ok: false, error: 'Bildirim metni boş.' };
  var s = lansmanSatirlar_(), hedefler;
  if (p.kime === 'herkes') hedefler = LANSMAN.EKIP;
  else if (p.kime === 'geride') hedefler = LANSMAN.EKIP.filter(function (a) { return lansmanGeride_(lansmanOzet_(s, a)); });
  else hedefler = [p.kime];
  hedefler.forEach(function (a) { lansmanPush_(a, 'Kıbrıs Lansmanı', metin, kim.ad); });
  var r = lansmanDurum_(kim); r.gonderildi = hedefler.length; return r;
}

function lansmanGeride_(o) {
  var now = Date.now(), T = LANSMAN.TESLIM;
  if (now <= new Date(T.liste).getTime()) return o.liste < LANSMAN.HEDEF.liste;
  if (now <= new Date(T.teyit).getTime()) return o.zamaninda < LANSMAN.HEDEF.teyit;
  if (now <= new Date(T.son).getTime()) return o.sonBekleyen > 0;
  return false;
}

/* ---------- günlük hatırlatma (lansmanKur ile açılır, 10:00) ---------- */
function lansmanHatirlatma() {
  var now = Date.now(), T = LANSMAN.TESLIM, s = lansmanSatirlar_();
  var gun = function (t) { return Math.max(0, Math.ceil((new Date(t).getTime() - now) / 864e5)); };
  if (now > new Date(T.lansman).getTime()) return;
  LANSMAN.EKIP.forEach(function (a) {
    var o = lansmanOzet_(s, a), m = '';
    if (now <= new Date(T.liste).getTime() && o.liste < LANSMAN.HEDEF.liste)
      m = '9 Kasım\'a ' + gun(T.liste) + ' gün kaldı. Listende ' + o.liste + ' kişi var, hedef ' + LANSMAN.HEDEF.liste + '.';
    else if (now <= new Date(T.teyit).getTime() && o.zamaninda < LANSMAN.HEDEF.teyit)
      m = '%60 paylaşım için 13 Kasım 18.00\'e kadar ' + (LANSMAN.HEDEF.teyit - o.zamaninda) + ' kesin teyit daha gerekiyor. ' +
          'Şu an ' + o.zamaninda + ' teyidin var.';
    else if (now > new Date(T.teyit).getTime() && now <= new Date(T.son).getTime() && o.sonBekleyen > 0)
      m = o.sonBekleyen + ' davetlinin son teyidini 19 Kasım\'a kadar al ve panelde işaretle.';
    else if (gun(T.lansman) <= 1 && o.teyit > 0)
      m = 'Yarın 13:30\'da Kalamış Marina Hotel\'deyiz. ' + o.teyit + ' misafirine bu akşam hatırlatma mesajı gönder.';
    if (m) lansmanPush_(a, 'Kıbrıs Lansmanı', m, 'sistem');
  });
}

function lansmanKur() {
  lansmanKapat();
  ScriptApp.newTrigger('lansmanHatirlatma').timeBased().atHour(10).everyDays(1).inTimezone('Europe/Istanbul').create();
  lansmanTablo_();
  Logger.log('Lansman hatırlatması açıldı (her gün 10:00). Tablo: ' + lansmanTablo_().getUrl());
}

function lansmanKapat() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'lansmanHatirlatma') ScriptApp.deleteTrigger(t);
  });
}

function lansmanTestBana() {
  lansmanPush_('Umut Tokkuş', 'Kıbrıs Lansmanı (deneme)', 'Lansman bildirimleri çalışıyor.', 'sistem');
  Logger.log('Tablo: ' + lansmanTablo_().getUrl());
}
