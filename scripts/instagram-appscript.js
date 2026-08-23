// =============================================
//  INSTAGRAM CAROUSEL YAYINLAMA
//  Code.gs'in sonuna ekleyin
// =============================================

/**
 * PNG dosyalarını GitHub'a yükler, public URL'lerden Instagram carousel oluşturur.
 *
 * @param {Object} params
 * @param {string} params.ay        - "2026-08" formatında ay
 * @param {string} params.set       - "puan" veya "birinci"
 * @param {string[]} params.images  - Base64 PNG/JPEG dizisi (slayt sırasıyla)
 * @param {string} params.caption   - Instagram açıklama metni
 * @param {string} params.ghToken   - GitHub PAT (Contents izni)
 * @returns {Object} {success, mediaId?, error?}
 */
function instagramYayinla(params) {
  var props = PropertiesService.getScriptProperties();
  var igToken = props.getProperty('INSTAGRAM_ACCESS_TOKEN');
  var igUserId = props.getProperty('INSTAGRAM_USER_ID');

  if (!igToken || !igUserId) {
    return { success: false, error: 'Instagram token veya user ID eksik. Script Properties\'i kontrol edin.' };
  }

  if (!params.images || params.images.length < 2) {
    return { success: false, error: 'Carousel için en az 2 görsel gerekli.' };
  }

  if (params.images.length > 10) {
    return { success: false, error: 'Carousel en fazla 10 görsel destekler.' };
  }

  // ───── 1) PNG'leri GitHub'a yükle ─────
  var imageUrls = [];
  var repo = 'dogusremax/dogusportal';
  var branch = 'main';

  for (var i = 0; i < params.images.length; i++) {
    var fileName = params.set + '-' + (i + 1) + '.jpg';
    var path = 'assets/instagram/' + params.ay + '/' + fileName;
    var ghUrl = 'https://api.github.com/repos/' + repo + '/contents/' + path;
    var b64 = params.images[i];

    // Varsa SHA'yı al (üzerine yazma için)
    var sha = null;
    var existResp = UrlFetchApp.fetch(ghUrl + '?ref=' + branch, {
      headers: {
        'Authorization': 'Bearer ' + params.ghToken,
        'Accept': 'application/vnd.github.v3+json'
      },
      muteHttpExceptions: true
    });
    if (existResp.getResponseCode() === 200) {
      sha = JSON.parse(existResp.getContentText()).sha;
    }

    var payloadObj = {
      message: 'IG: ' + params.ay + ' ' + params.set + ' #' + (i + 1),
      content: b64,
      branch: branch
    };
    if (sha) payloadObj.sha = sha;

    var ghResp = UrlFetchApp.fetch(ghUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + params.ghToken,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payloadObj),
      muteHttpExceptions: true
    });

    var ghStatus = ghResp.getResponseCode();
    if (ghStatus !== 201 && ghStatus !== 200) {
      return {
        success: false,
        error: 'GitHub yükleme hatası (slayt #' + (i + 1) + '): HTTP ' + ghStatus + ' — ' + ghResp.getContentText().substring(0, 200)
      };
    }

    // jsDelivr CDN URL (hızlı, public, cache-buster olarak commit hash eklenebilir)
    var rawUrl = 'https://cdn.jsdelivr.net/gh/' + repo + '@' + branch + '/' + path;
    // Cache-bust: jsDelivr purge endpoint'i çağır
    try {
      UrlFetchApp.fetch('https://purge.jsdelivr.net/gh/' + repo + '@' + branch + '/' + path, { muteHttpExceptions: true });
    } catch(e) { /* purge opsiyonel */ }

    imageUrls.push(rawUrl);
  }

  // CDN propagasyonu için kısa bekleme
  Utilities.sleep(5000);

  // ───── 2) Her görsel için Instagram container oluştur ─────
  var containerIds = [];
  var apiBase = 'https://graph.instagram.com/v25.0/';

  for (var j = 0; j < imageUrls.length; j++) {
    var containerResp = UrlFetchApp.fetch(apiBase + igUserId + '/media', {
      method: 'POST',
      payload: {
        image_url: imageUrls[j],
        is_carousel_item: 'true',
        access_token: igToken
      },
      muteHttpExceptions: true
    });

    if (containerResp.getResponseCode() !== 200) {
      return {
        success: false,
        error: 'Container hatası (slayt #' + (j + 1) + '): ' + containerResp.getContentText().substring(0, 300)
      };
    }
    containerIds.push(JSON.parse(containerResp.getContentText()).id);
  }

  // ───── 3) Carousel container oluştur ─────
  var carouselResp = UrlFetchApp.fetch(apiBase + igUserId + '/media', {
    method: 'POST',
    payload: {
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
      caption: params.caption || '',
      access_token: igToken
    },
    muteHttpExceptions: true
  });

  if (carouselResp.getResponseCode() !== 200) {
    return {
      success: false,
      error: 'Carousel container hatası: ' + carouselResp.getContentText().substring(0, 300)
    };
  }
  var carouselId = JSON.parse(carouselResp.getContentText()).id;

  // ───── 4) Container durumu kontrol et ─────
  var ready = false;
  for (var k = 0; k < 6; k++) {
    Utilities.sleep(10000); // 10 saniye bekle
    var statusResp = UrlFetchApp.fetch(
      apiBase + carouselId + '?fields=status_code&access_token=' + igToken,
      { muteHttpExceptions: true }
    );
    if (statusResp.getResponseCode() === 200) {
      var status = JSON.parse(statusResp.getContentText()).status_code;
      if (status === 'FINISHED') { ready = true; break; }
      if (status === 'ERROR') return { success: false, error: 'Container işleme hatası (ERROR).' };
      if (status === 'EXPIRED') return { success: false, error: 'Container süresi doldu (EXPIRED).' };
      // IN_PROGRESS → döngü devam
    }
  }

  if (!ready) {
    return { success: false, error: 'Container 60 saniye içinde hazır olmadı. Tekrar deneyin.' };
  }

  // ───── 5) Yayınla ─────
  var publishResp = UrlFetchApp.fetch(apiBase + igUserId + '/media_publish', {
    method: 'POST',
    payload: {
      creation_id: carouselId,
      access_token: igToken
    },
    muteHttpExceptions: true
  });

  if (publishResp.getResponseCode() !== 200) {
    return {
      success: false,
      error: 'Yayınlama hatası: ' + publishResp.getContentText().substring(0, 300)
    };
  }

  var mediaId = JSON.parse(publishResp.getContentText()).id;
  Logger.log('Instagram carousel yayınlandı. Media ID: ' + mediaId);

  return { success: true, mediaId: mediaId };
}


// =============================================
//  doPost'a EKLENECEK case
// =============================================
// Mevcut doPost fonksiyonunuzda action switch/if bloğuna ekleyin:
//
//   if (action === 'instagramYayinla') {
//     var igParams = JSON.parse(e.postData.contents);
//     return ContentService
//       .createTextOutput(JSON.stringify(instagramYayinla(igParams)))
//       .setMimeType(ContentService.MimeType.JSON);
//   }


// =============================================
//  INSTAGRAM TOKEN YENİLEME
// =============================================

/**
 * Long-lived token'ı yeniler.
 * Instagram API with Instagram Login token refresh:
 *   GET /refresh_access_token?grant_type=ig_refresh_token&access_token=TOKEN
 *
 * Trigger ile her 45 günde bir çağrılır (60 günlük ömürden önce).
 */
function instagramTokenYenile() {
  var props = PropertiesService.getScriptProperties();
  var currentToken = props.getProperty('INSTAGRAM_ACCESS_TOKEN');

  if (!currentToken) {
    Logger.log('INSTAGRAM_ACCESS_TOKEN bulunamadı.');
    return;
  }

  // Instagram Login token refresh endpoint
  var url = 'https://graph.instagram.com/refresh_access_token'
    + '?grant_type=ig_refresh_token'
    + '&access_token=' + currentToken;

  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var code = resp.getResponseCode();
  var body = resp.getContentText();

  if (code === 200) {
    var data = JSON.parse(body);
    props.setProperty('INSTAGRAM_ACCESS_TOKEN', data.access_token);

    var expiresDate = new Date(Date.now() + data.expires_in * 1000);
    props.setProperty('INSTAGRAM_TOKEN_EXPIRES', expiresDate.toISOString());

    var msg = 'Instagram token başarıyla yenilendi.\n'
      + 'Yeni süre: ' + Math.round(data.expires_in / 86400) + ' gün\n'
      + 'Son kullanma: ' + expiresDate.toLocaleString('tr-TR') + '\n'
      + 'Yenilenme zamanı: ' + new Date().toLocaleString('tr-TR');

    Logger.log(msg);
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '✅ Instagram Token Yenilendi', msg);

  } else {
    var errMsg = 'Instagram token yenileme BAŞARISIZ.\n'
      + 'HTTP ' + code + '\n'
      + body + '\n\n'
      + 'Manuel yenileme gerekebilir:\n'
      + '1. Graph API Explorer\'da yeni token oluşturun\n'
      + '2. Long-lived\'a çevirin\n'
      + '3. Script Properties\'e yapıştırın';

    Logger.log(errMsg);
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '⚠️ Instagram Token HATA', errMsg);
  }
}


/**
 * Token yenileme trigger'ını kurar. Bir kez çalıştırın.
 * Her 45 günde bir gece 03:00'te çalışır.
 */
function kurInstagramTokenTrigger() {
  // Eski trigger'ları temizle
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'instagramTokenYenile') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Yeni trigger: 45 günde bir
  ScriptApp.newTrigger('instagramTokenYenile')
    .timeBased()
    .everyDays(45)
    .atHour(3)
    .create();

  Logger.log('✅ Instagram token trigger kuruldu — her 45 günde bir, 03:00.');
}


// =============================================
//  TOKEN DURUM KONTROLÜ (isteğe bağlı)
// =============================================

/**
 * Mevcut Instagram token'ının durumunu kontrol eder.
 * Manuel çalıştırma veya debug için.
 */
function instagramTokenDurum() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('INSTAGRAM_ACCESS_TOKEN');
  var expires = props.getProperty('INSTAGRAM_TOKEN_EXPIRES');
  var igId = props.getProperty('INSTAGRAM_USER_ID');

  if (!token) {
    Logger.log('❌ Token yok.');
    return { valid: false, error: 'Token bulunamadı' };
  }

  // Token'ı debug endpoint ile kontrol et
  var resp = UrlFetchApp.fetch(
    'https://graph.instagram.com/me?fields=id,username&access_token=' + token,
    { muteHttpExceptions: true }
  );

  if (resp.getResponseCode() === 200) {
    var data = JSON.parse(resp.getContentText());
    var kalanGun = expires ? Math.round((new Date(expires) - new Date()) / 86400000) : '?';
    Logger.log('✅ Token geçerli. Kullanıcı: @' + data.username + ' | Kalan: ~' + kalanGun + ' gün');
    return { valid: true, username: data.username, kalanGun: kalanGun };
  } else {
    Logger.log('❌ Token geçersiz: ' + resp.getContentText());
    return { valid: false, error: resp.getContentText() };
  }
}
