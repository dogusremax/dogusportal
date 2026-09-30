// ═══════════════════════════════════════════════════════════════════
//  HAFTALIK DANIŞMAN MESAJLARI — WHATSAPP (onaylı gönderim)
//  dogus-whatsapp-service projesinde, Kod.gs'nin EN ALTINA yapıştır.
//
//  Pazartesi 09:00 ve Çarşamba 18:30'da Umut'a "mesajlar onayını bekliyor"
//  e-postası gider. dogusportal.com/haftalik-mesajlar.html sayfası o haftanın
//  mesajlarını performans verisinden hazırlar; Umut kontrol edip "Onayla ve
//  gönder"e basınca sayfa buraya yollar, burada onaylı şablonlarla gönderilir.
//   • Pazartesi: haftalik_karne (sıra, puan, iyi/eksik, broker yorumu, plan)
//   • Çarşamba : carsamba_hatirlatma (motivasyon + listedeki durum)
//   • Destek modundaki danışman: destek_mesaji (sıralama/karne yok)
//  Koruma: ONAY_PIN olmadan hiçbir şey gitmez; numara yalnızca telBul_ ile
//  bulunur (dışarıdan numara verilemez); aynı kişiye aynı hafta ikinci kez gitmez.
//
//  SIRA:
//   1) haftalikSablonlariOlustur → üç şablonu Meta onayına gönderir (bir kez)
//   2) haftalikSablonDurum       → onaylandı mı bakar (APPROVED görünce devam)
//   3) Script Properties'e ONAY_PIN ekle (sayfada gönderirken sorulacak şifre)
//   4) doPost switch'ine:  case 'haftalikMesaj': return jsonResponse(haftalikMesaj(payload));
//      → Dağıt → Dağıtımları yönet → Yeni sürüm
//   5) haftalikTestBana          → örnek karneyi SADECE sana atar
//   6) haftalikKur               → Pazartesi/Çarşamba onay e-postalarını açar
// ═══════════════════════════════════════════════════════════════════

var HAFTALIK_SABLONLAR = { carsamba_hatirlatma: 4, haftalik_karne: 10, destek_mesaji: 4 };
var HAFTALIK_SAYFA = 'https://dogusportal.com/haftalik-mesajlar.html?k=1520';

// ─── 1) Şablonları oluştur (bir kez) ────────────────────────────────
// Metinler haftalik-mesajlar.html içindeki SABLON ile BİREBİR aynı olmalı.
function haftalikSablonlariOlustur() {
  var sablonlar = [
    { name: 'carsamba_hatirlatma',
      text: 'Merhaba {{1}} 👋\nHafta ortasına geldik, *Çarşamba* akşamı! 🗓️\n\n_"{{2}}"_\n\n📊 {{3}}\n\n🎯 Hafta sonuna kadar: {{4}}\n\nAktivitelerini uygulamaya girmeyi unutma 👉 dogusportal.com\nİyi akşamlar!',
      ornek: ['Ayşegül', 'Haftanın yarısı geride, sonucu belirleyecek yarısı önünde.',
              'Şu an 3. sıradasın (105 puan). İrem ile aranda 12 puan var, 2 etki araması bu farkı kapatır!',
              'gösterim 1/2, sosyal medya paylaşımı 1/3'] },
    { name: 'haftalik_karne',
      text: 'Günaydın {{1}} ☀️\n*{{2}} haftalık karnen* 📋\n\n🏅 Sıralama: {{3}}\n⭐ Puan: {{4}}\n📅 Aktif gün: {{5}}\n\n✅ *İyi yaptıkların:* {{6}}\n\n⚠️ *Geliştirmen gerekenler:* {{7}}\n\n💬 *Broker yorumu:* _{{8}}_\n— U.T / M.T\n\n🎯 *Bu haftanın planı:* {{9}}\n\n{{10}}\n\nYeni hafta senin, bol kazançlı bir hafta dileriz! 🚀',
      ornek: ['Gamze', '21 Eyl – 27 Eyl', '1/8 (sıranı korudun)', '291 (ofis ortalaması 90)', '5',
              '2 kapanış, 5 gün aktif, 23 gösterim', 'FZBO araması 0/3, etki çevresi araması 3/5',
              'Haftanın lideri sensin Gamze! Ekibe örnek oluyorsun, emeğine sağlık.',
              '1) Salı ve Perşembe 3 FZBO araması · 2) Her sabah 1 etki araması',
              'Instagram story’sinde sen de varsın, tebrikler!'] },
    { name: 'destek_mesaji',
      text: 'Merhaba {{1}} 🌿\n{{2}}\n\n_"{{3}}"_\n\n{{4}}\n\nBir telefon kadar yakınız, iyi ki varsın 💙\n— U.T / M.T',
      ornek: ['Aysun', 'Yeni bir hafta başladı, haftan güzel geçsin.', 'Her gün biraz daha güçlü, adım adım.',
              'Uzaktan da olsa ekibin bir parçası olman hepimize güç veriyor.'] }
  ];
  sablonlar.forEach(function (s) {
    var body = {
      name: s.name, language: 'tr', category: 'UTILITY', allow_category_change: true,
      components: [
        { type: 'BODY', text: s.text, example: { body_text: [s.ornek] } },
        { type: 'FOOTER', text: 'RE/MAX Doğuş' }
      ]
    };
    var r = UrlFetchApp.fetch(WA_API_BASE + '/' + getWabaId() + '/message_templates', { method: 'post',
      contentType: 'application/json', headers: { Authorization: 'Bearer ' + getAccessToken() },
      payload: JSON.stringify(body), muteHttpExceptions: true });
    Logger.log(s.name + ' → ' + r.getContentText());
  });
}

// ─── 2) Onay durumu ─────────────────────────────────────────────────
function haftalikSablonDurum() {
  Object.keys(HAFTALIK_SABLONLAR).forEach(function (ad) {
    var url = WA_API_BASE + '/' + getWabaId() + '/message_templates?name=' + ad +
              '&fields=name,status,category&access_token=' + getAccessToken();
    Logger.log(ad + ' → ' + UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText());
  });
}

// ─── doPost'tan çağrılır ────────────────────────────────────────────
// { action:'haftalikMesaj', pin, test, mod:'pazartesi'|'carsamba', hafta:'2026-09-21',
//   mesajlar:[{ id, ad:'Gamze Yetkin', sablon, params:[...] }] }
function haftalikMesaj(payload) {
  var props = PropertiesService.getScriptProperties();
  var pin = props.getProperty('ONAY_PIN');
  if (!pin) return { success: false, error: 'ONAY_PIN tanımlı değil (Script Properties).' };
  if (String(payload.pin || '') !== pin) return { success: false, error: 'PIN hatalı.' };

  var mesajlar = payload.mesajlar || [];
  if (typeof mesajlar === 'string') { try { mesajlar = JSON.parse(mesajlar); } catch (e) { mesajlar = []; } }
  if (!mesajlar.length || mesajlar.length > 30) return { success: false, error: 'Mesaj listesi geçersiz.' };
  var hafta = String(payload.hafta || ''), mod = String(payload.mod || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hafta) || ['pazartesi', 'carsamba'].indexOf(mod) < 0) {
    return { success: false, error: 'Hafta/mod geçersiz.' };
  }
  var test = payload.test === true || payload.test === 'true';

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Test: ilk mesaj sadece TEST_PHONE_NUMBER'a, kayıt tutulmaz
    if (test) {
      var testTel = getProperty('TEST_PHONE_NUMBER');
      if (!testTel) return { success: false, error: 'TEST_PHONE_NUMBER tanımlı değil.' };
      var t = haftalikGonder_(testTel, mesajlar[0], 'haftalik-test');
      return t.ok ? { success: true, sonuclar: [] } : { success: false, error: t.hata };
    }

    var gonderilen = {};
    try { gonderilen = JSON.parse(props.getProperty('HAFTALIK_WA_GONDERILEN') || '{}'); } catch (e) {}

    var sonuclar = mesajlar.map(function (m) {
      var anahtar = mod + '|' + hafta + '|' + danismanAnahtar_(m.ad);
      if (gonderilen[anahtar]) return { id: m.id, ok: true, not: 'zaten gönderilmişti' };
      var tel = telBul_(m.ad);
      if (!tel) {
        logMessage({ direction: 'outgoing', type: 'template', phone: '', templateName: m.sablon,
          content: m.ad, callerApp: 'haftalik', messageId: '', status: 'failed',
          errorDetail: 'Numara tanımlı değil: ' + m.ad });
        return { id: m.id, ok: false, hata: 'Numara yok: ' + m.ad + ' (NOBET_WA_TELEFONLAR listesine ekle)' };
      }
      var r = haftalikGonder_(tel, m, 'haftalik');
      if (r.ok) gonderilen[anahtar] = new Date().toISOString();
      return { id: m.id, ok: r.ok, hata: r.hata };
    });

    // 60 günden eski kayıtları temizle
    var sinir = Utilities.formatDate(new Date(Date.now() - 60 * 86400000), 'Europe/Istanbul', 'yyyy-MM-dd');
    Object.keys(gonderilen).forEach(function (k) { if (k.split('|')[1] < sinir) delete gonderilen[k]; });
    props.setProperty('HAFTALIK_WA_GONDERILEN', JSON.stringify(gonderilen));

    return { success: true, sonuclar: sonuclar };
  } finally {
    lock.releaseLock();
  }
}

function haftalikGonder_(tel, m, uygulama) {
  var adet = HAFTALIK_SABLONLAR[m.sablon];
  if (!adet) return { ok: false, hata: 'İzinsiz şablon: ' + m.sablon };
  var params = m.params || [];
  if (typeof params === 'string') { try { params = JSON.parse(params); } catch (e) { params = []; } }
  if (params.length !== adet) return { ok: false, hata: m.sablon + ' ' + adet + ' değişken bekliyor.' };
  // Meta kuralı: değişkende satır sonu/sekme/4+ boşluk olamaz, boş olamaz
  params = params.map(function (p) {
    return String(p || '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 700) || '-';
  });
  var r = sendTemplateMessage(tel, m.sablon, params, 'tr');
  logMessage({ direction: 'outgoing', type: 'template', phone: formatPhone(tel), templateName: m.sablon,
    content: params.join(' / '), callerApp: uygulama, messageId: r.messageId || '',
    status: r.ok ? 'sent' : 'failed', errorDetail: r.ok ? '' : JSON.stringify(r.error || '') });
  var hata = '';
  if (!r.ok) {
    var e = r.error || {};
    hata = (e.error_data && e.error_data.details) || e.message || JSON.stringify(e).slice(0, 200);
  }
  return { ok: r.ok, hata: hata };
}

// ─── 5) Test: örnek karneyi SADECE sana atar ────────────────────────
function haftalikTestBana() {
  var r = haftalikGonder_(getProperty('TEST_PHONE_NUMBER'), {
    sablon: 'haftalik_karne',
    params: ['Umut', 'Örnek hafta', '1/8', '291 (ofis ortalaması 90)', '5',
             '2 kapanış, 23 gösterim', 'FZBO araması 0/3',
             'Bu bir test mesajıdır, danışmanlara gitmedi.', '1) Örnek plan maddesi',
             'Instagram story’sinde sen de varsın, tebrikler!']
  }, 'haftalik-test');
  Logger.log(r.ok ? '✅ Test karnesi gönderildi.' : '❌ ' + r.hata);
}

// ─── 6) Onay e-postaları: Pazartesi 09:00, Çarşamba 18:30 ───────────
function haftalikKur() {
  haftalikKapat();
  ScriptApp.newTrigger('haftalikOnayMaili').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9).inTimezone('Europe/Istanbul').create();
  ScriptApp.newTrigger('haftalikOnayMaili').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY)
    .atHour(18).nearMinute(30).inTimezone('Europe/Istanbul').create();
  Logger.log('✅ Kuruldu. Pazartesi 09:00 ve Çarşamba 18:30 civarı onay e-postası gelecek.');
}

function haftalikKapat() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'haftalikOnayMaili') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log(n ? ('🛑 ' + n + ' tetikleyici kapatıldı.') : 'Kapatılacak tetikleyici yoktu.');
}

function haftalikOnayMaili() {
  var gun = Number(Utilities.formatDate(new Date(), 'Europe/Istanbul', 'u')); // 1=Pzt … 7=Paz
  var mod = gun <= 2 ? 'pazartesi' : 'carsamba';
  var link = HAFTALIK_SAYFA + '&mod=' + mod;
  var etiket = mod === 'pazartesi' ? 'HAFTALIK KARNELER ONAYINI BEKLİYOR' : 'ÇARŞAMBA MESAJLARI ONAYINI BEKLİYOR';
  var konu = mod === 'pazartesi' ? '📋 Haftalık karneler onayını bekliyor' : '🗓️ Çarşamba mesajları onayını bekliyor';
  var html =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;' +
         'max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;color:#0B1550">' +
      mailSerit_(etiket) +
      '<div style="padding:22px 18px">' +
        '<div style="font-size:15px;line-height:1.55">Danışman mesajları hazır. Kontrol et, istersen düzenle, ' +
        'tek tuşla gönder.</div>' +
        '<div style="margin-top:22px"><a href="' + link + '" style="display:inline-block;background:#25D366;' +
          'color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px">' +
          'Mesajları aç ve onayla</a></div>' +
      '</div>' +
    '</div>';
  MailApp.sendEmail(AYAR_MAIL_(), konu, 'Danışman mesajları hazır: ' + link, { htmlBody: html });
}
