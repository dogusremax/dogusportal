// =============================================
//  HAFTALIK WHATSAPP MESAJLARI (Meta WhatsApp Cloud API)
//  Code.gs'in sonuna ekleyin. Kurulum: scripts/whatsapp-rehber.md
// =============================================
//
// Script Properties (Proje Ayarları → Script Properties) — hiçbiri koda yazılmaz:
//   WA_TOKEN        Meta System User kalıcı erişim token'ı
//   WA_PHONE_ID     WhatsApp işletme numarasının Phone number ID'si
//   ONAY_PIN        haftalik-mesajlar.html'de "Onayla ve gönder" için istenen PIN
//   WA_NUMARALAR    Danışman numaraları, JSON: {"gamze":"905xxxxxxxxx","irem":"905xxxxxxxxx",...}
//   WA_TEST_NUMARA  "Bana test gönder" butonunun gideceği numara (905xxxxxxxxx)
//   WA_ONAY_EPOSTA  (isteğe bağlı) Onay hatırlatmasının gideceği e-posta; boşsa script sahibine gider

var WA_API = 'https://graph.facebook.com/v25.0/';
// Meta'da onaylı şablonlar ve değişken sayıları — isimler rehberdekiyle aynı olmalı
var WA_SABLONLAR = { carsamba_hatirlatma: 4, haftalik_karne: 10, destek_mesaji: 4 };

/**
 * Sayfadan gelen onaylı mesajları gönderir.
 * @param {Object} p {pin, test, mod, hafta, mesajlar:[{id, ad, sablon, params[]}]}
 * @returns {Object} {success, sonuclar?:[{id, ok, hata?}], error?}
 */
function whatsappGonder(p) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('WA_TOKEN'), phoneId = props.getProperty('WA_PHONE_ID');
  if (!token || !phoneId) return { success: false, error: 'WA_TOKEN veya WA_PHONE_ID eksik. Script Properties\'i kontrol edin.' };
  if (!p.pin || p.pin !== props.getProperty('ONAY_PIN')) return { success: false, error: 'PIN hatalı.' };
  if (!p.mesajlar || !p.mesajlar.length || p.mesajlar.length > 30) return { success: false, error: 'Mesaj listesi geçersiz.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.hafta || '') || ['pazartesi', 'carsamba'].indexOf(p.mod) < 0) return { success: false, error: 'Hafta/mod geçersiz.' };

  var numaralar = {};
  try { numaralar = JSON.parse(props.getProperty('WA_NUMARALAR') || '{}'); } catch (e) { return { success: false, error: 'WA_NUMARALAR geçerli JSON değil.' }; }

  // Aynı anda iki cihazdan onaylanırsa çift gönderim olmasın
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { success: false, error: 'Başka bir gönderim sürüyor, biraz sonra tekrar deneyin.' };
  try {
    if (p.test) {
      var testNo = props.getProperty('WA_TEST_NUMARA');
      if (!testNo) return { success: false, error: 'WA_TEST_NUMARA tanımlı değil.' };
      var t = waSablonGonder_(token, phoneId, testNo, p.mesajlar[0]);
      return t.ok ? { success: true, sonuclar: [] } : { success: false, error: t.hata };
    }

    var sonuclar = p.mesajlar.map(function (m) {
      var kilit = 'wa_gitti_' + p.mod + '_' + p.hafta + '_' + m.id;
      if (props.getProperty(kilit)) return { id: m.id, ok: true, not: 'zaten gönderilmişti' };
      var no = numaralar[m.id];
      if (!no) return { id: m.id, ok: false, hata: 'Numara yok (WA_NUMARALAR içine "' + m.id + '" ekleyin).' };
      var r = waSablonGonder_(token, phoneId, no, m);
      if (r.ok) props.setProperty(kilit, new Date().toISOString());
      waLog_(p, m, r);
      return { id: m.id, ok: r.ok, hata: r.hata };
    });
    return { success: true, sonuclar: sonuclar };
  } finally {
    lock.releaseLock();
  }
}

function waSablonGonder_(token, phoneId, no, m) {
  var adet = WA_SABLONLAR[m.sablon];
  if (!adet) return { ok: false, hata: 'Bilinmeyen şablon: ' + m.sablon };
  var params = (m.params || []).slice(0, adet);
  if (params.length !== adet) return { ok: false, hata: 'Şablon ' + adet + ' değişken bekliyor.' };
  var body = {
    messaging_product: 'whatsapp',
    to: String(no).replace(/\D/g, ''),
    type: 'template',
    template: {
      name: m.sablon,
      language: { code: 'tr' },
      components: [{
        type: 'body',
        // Meta kuralı: değişkende satır sonu/sekme/4+ boşluk olamaz, boş olamaz
        parameters: params.map(function (t) {
          t = String(t || '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 700) || '-';
          return { type: 'text', text: t };
        })
      }]
    }
  };
  var resp = UrlFetchApp.fetch(WA_API + phoneId + '/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var j = {};
  try { j = JSON.parse(resp.getContentText()); } catch (e) {}
  if (resp.getResponseCode() === 200 && j.messages) return { ok: true, mesajId: j.messages[0].id };
  var err = (j.error && (j.error.error_data && j.error.error_data.details || j.error.message)) || ('HTTP ' + resp.getResponseCode());
  return { ok: false, hata: err };
}

// Bağlı tabloya "WhatsApp Log" sayfası tutar (tablo yoksa sessizce geçer)
function waLog_(p, m, r) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sh = ss.getSheetByName('WhatsApp Log') || ss.insertSheet('WhatsApp Log');
    if (sh.getLastRow() === 0) sh.appendRow(['Zaman', 'Mod', 'Hafta', 'Danışman', 'Şablon', 'Durum', 'Hata / Mesaj ID']);
    sh.appendRow([new Date(), p.mod, p.hafta, m.ad || m.id, m.sablon, r.ok ? 'gönderildi' : 'HATA', r.ok ? r.mesajId : r.hata]);
  } catch (e) { Logger.log('WhatsApp log yazılamadı: ' + e); }
}


// =============================================
//  ONAY HATIRLATMASI — mesajlar hazır olunca size e-posta
// =============================================

function whatsappOnayHatirlat() {
  var gun = Number(Utilities.formatDate(new Date(), 'Europe/Istanbul', 'u')); // 1=Pzt … 7=Paz
  var mod = gun <= 2 ? 'pazartesi' : 'carsamba';
  var link = 'https://dogusportal.com/haftalik-mesajlar.html?k=1520&mod=' + mod;
  var baslik = mod === 'pazartesi' ? '📋 Haftalık karneler onayınızı bekliyor' : '🗓️ Çarşamba hatırlatmaları onayınızı bekliyor';
  var to = PropertiesService.getScriptProperties().getProperty('WA_ONAY_EPOSTA') || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: to,
    subject: baslik,
    htmlBody: '<p>Danışman mesajları hazır. Kontrol edip tek tuşla gönderebilirsiniz:</p>' +
      '<p><a href="' + link + '" style="background:#25D366;color:#0b2e17;padding:12px 18px;border-radius:10px;font-weight:700;text-decoration:none;display:inline-block">Mesajları aç ve onayla</a></p>' +
      '<p style="color:#888;font-size:12px">RE/MAX Doğuş · dogusportal</p>'
  });
}

/** Onay e-postası tetikleyicilerini kurar: Pazartesi ~09:00, Çarşamba ~18:30. Bir kez çalıştırın. */
function kurWhatsappTetikleri() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'whatsappOnayHatirlat') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('whatsappOnayHatirlat').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone('Europe/Istanbul').create();
  ScriptApp.newTrigger('whatsappOnayHatirlat').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(18).nearMinute(30).inTimezone('Europe/Istanbul').create();
  Logger.log('✅ WhatsApp onay tetikleyicileri kuruldu: Pazartesi 09:00, Çarşamba 18:30.');
}


// =============================================
//  doPost'a EKLENECEK case
// =============================================
// Mevcut doPost fonksiyonunuzda action switch/if bloğuna ekleyin:
//
//   if (action === 'whatsappGonder') {
//     var waParams = JSON.parse(e.postData.contents);
//     return ContentService
//       .createTextOutput(JSON.stringify(whatsappGonder(waParams)))
//       .setMimeType(ContentService.MimeType.JSON);
//   }
