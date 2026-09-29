// =============================================
//  HAFTALIK WHATSAPP MESAJLARI — dogus-whatsapp-service modülü
//  Merkezi servisin Code.gs'ine (veya yeni bir .gs dosyasına) ekleyin.
//  Kurulum: scripts/whatsapp-rehber.md
// =============================================
//
// Servisin zaten kullandığı Meta bağlantısı ve danışman numaraları kullanılır.
// Aşağıdaki iki UYARLAMA fonksiyonu, servisteki mevcut karşılıklarına bağlanmalı
// (kapanisBildir'in kullandığı numara bulma ve şablon gönderme fonksiyonları).
//
// Bu modülün kendi ayarı (Script Properties):
//   ONAY_PIN        haftalik-mesajlar.html'de "Onayla ve gönder" için istenen PIN
//   WA_TEST_NUMARA  "Bana test gönder" butonunun gideceği numara (905xxxxxxxxx)
//   WA_ONAY_EPOSTA  (isteğe bağlı) Onay hatırlatmasının gideceği e-posta; boşsa script sahibine

// Meta'da onaylı şablonlar ve değişken sayıları — isimler rehberdekiyle aynı olmalı
var HM_SABLONLAR = { carsamba_hatirlatma: 4, haftalik_karne: 10, destek_mesaji: 4 };


// ---------- UYARLAMA 1: danışmanın WhatsApp numarası ----------
// id: performans verisindeki kimlik (gamze, irem, aysegul_alpay…), ad: tam adı.
// Servisin kapanış bildiriminde danışman numarasını bulan fonksiyonu burada çağrılmalı.
function hmTelefon_(id, ad) {
  throw new Error('hmTelefon_ servisteki numara bulma fonksiyonuna bağlanmadı');
}

// ---------- UYARLAMA 2: onaylı şablonla mesaj gönder ----------
// Servisin Meta'ya şablon gönderen fonksiyonu burada çağrılmalı.
// Dönüş: {ok:true, mesajId} ya da {ok:false, hata:'...'}
function hmSablonGonder_(telefon, sablon, params) {
  throw new Error('hmSablonGonder_ servisteki gönderme fonksiyonuna bağlanmadı');
}


/**
 * Onay sayfasından gelen mesajları gönderir.
 * e.parameter.veri = {pin, test, mod, hafta, mesajlar:[{id, ad, sablon, params[]}]}
 */
function haftalikMesaj(p) {
  var props = PropertiesService.getScriptProperties();
  if (!p.pin || p.pin !== props.getProperty('ONAY_PIN')) return { success: false, error: 'PIN hatalı.' };
  if (!p.mesajlar || !p.mesajlar.length || p.mesajlar.length > 30) return { success: false, error: 'Mesaj listesi geçersiz.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.hafta || '') || ['pazartesi', 'carsamba'].indexOf(p.mod) < 0) return { success: false, error: 'Hafta/mod geçersiz.' };

  // Aynı anda iki cihazdan onaylanırsa çift gönderim olmasın
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { success: false, error: 'Başka bir gönderim sürüyor, biraz sonra tekrar deneyin.' };
  try {
    if (p.test) {
      var testNo = props.getProperty('WA_TEST_NUMARA');
      if (!testNo) return { success: false, error: 'WA_TEST_NUMARA tanımlı değil.' };
      var t = hmGonder_(testNo, p.mesajlar[0]);
      return t.ok ? { success: true, sonuclar: [] } : { success: false, error: t.hata };
    }

    var sonuclar = p.mesajlar.map(function (m) {
      var kilit = 'hm_gitti_' + p.mod + '_' + p.hafta + '_' + m.id;
      if (props.getProperty(kilit)) return { id: m.id, ok: true, not: 'zaten gönderilmişti' };
      var no;
      try { no = hmTelefon_(m.id, m.ad); } catch (e) { return { id: m.id, ok: false, hata: String(e.message || e) }; }
      if (!no) return { id: m.id, ok: false, hata: 'Numara bulunamadı.' };
      var r = hmGonder_(no, m);
      if (r.ok) props.setProperty(kilit, new Date().toISOString());
      hmLog_(p, m, r);
      return { id: m.id, ok: r.ok, hata: r.hata };
    });
    return { success: true, sonuclar: sonuclar };
  } finally {
    lock.releaseLock();
  }
}

function hmGonder_(no, m) {
  var adet = HM_SABLONLAR[m.sablon];
  if (!adet) return { ok: false, hata: 'Bilinmeyen şablon: ' + m.sablon };
  var params = (m.params || []).slice(0, adet);
  if (params.length !== adet) return { ok: false, hata: 'Şablon ' + adet + ' değişken bekliyor.' };
  // Meta kuralı: değişkende satır sonu/sekme/4+ boşluk olamaz, boş olamaz
  params = params.map(function (t) {
    return String(t || '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 700) || '-';
  });
  try { return hmSablonGonder_(String(no).replace(/\D/g, ''), m.sablon, params); }
  catch (e) { return { ok: false, hata: String(e.message || e) }; }
}

// Bağlı tabloya "Haftalık Mesaj Log" sayfası tutar (tablo yoksa sessizce geçer)
function hmLog_(p, m, r) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sh = ss.getSheetByName('Haftalık Mesaj Log') || ss.insertSheet('Haftalık Mesaj Log');
    if (sh.getLastRow() === 0) sh.appendRow(['Zaman', 'Mod', 'Hafta', 'Danışman', 'Şablon', 'Durum', 'Hata / Mesaj ID']);
    sh.appendRow([new Date(), p.mod, p.hafta, m.ad || m.id, m.sablon, r.ok ? 'gönderildi' : 'HATA', r.ok ? (r.mesajId || '') : r.hata]);
  } catch (e) { Logger.log('Haftalık mesaj log yazılamadı: ' + e); }
}


// =============================================
//  ONAY HATIRLATMASI — mesajlar hazır olunca size e-posta
// =============================================

function haftalikMesajHatirlat() {
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
function kurHaftalikMesajTetikleri() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'haftalikMesajHatirlat') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('haftalikMesajHatirlat').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone('Europe/Istanbul').create();
  ScriptApp.newTrigger('haftalikMesajHatirlat').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(18).nearMinute(30).inTimezone('Europe/Istanbul').create();
  Logger.log('✅ Haftalık mesaj onay tetikleyicileri kuruldu: Pazartesi 09:00, Çarşamba 18:30.');
}


// =============================================
//  doPost'a EKLENECEK case
// =============================================
// Servisin doPost'undaki action bloğuna (kapanisBildir, odemeBildir, talepBildir'in yanına) ekleyin:
//
//   if (action === 'haftalikMesaj') {
//     return ContentService
//       .createTextOutput(JSON.stringify(haftalikMesaj(JSON.parse(e.parameter.veri || '{}'))))
//       .setMimeType(ContentService.MimeType.JSON);
//   }
