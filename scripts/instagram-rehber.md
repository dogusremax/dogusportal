# Instagram API Entegrasyonu — Aylık Performans Sistemi

## BÖLÜM 1: Meta for Developers Uygulama Kurulumu

### Ön Koşullar
- RE/MAX Doğuş Instagram hesabı **Business Account** olmalı (Creator değil)
- Instagram hesabı bir **Facebook Sayfası**na bağlı olmalı
- Facebook sayfasında **Sayfa Yayınlama Yetkisi (PPA)** tamamlanmış olmalı

### Adım 1 — Meta for Developers'ta Uygulama Oluşturma

1. https://developers.facebook.com → **Uygulamalarım** → **Uygulama Oluştur**
2. Kullanım: **Diğer** → **İşletme** seçin
3. Uygulama adı: `Dogus Performans`
4. Uygulama oluşturulduktan sonra **Uygulama Ayarları → Temel**'den şunları not edin:
   - **App ID** (Uygulama Kimliği)
   - **App Secret** (Uygulama Gizli Anahtarı)

### Adım 2 — Instagram API Ürününü Ekleme

1. Sol menüden **Ürün Ekle** → **Instagram** → **Ayarla**
2. **Business Login for Instagram** seçeneğini etkinleştirin
3. İzinler bölümünde şu scope'ları ekleyin:
   - `instagram_business_basic`
   - `instagram_business_content_publish`

> ⚠️ Eski `instagram_basic` / `instagram_content_publish` scope'ları Ocak 2025'te deprecated edildi. Yeni scope'ları kullanın.

### Adım 3 — Erişim Seviyesi

- **Development Mode** (geliştirme modu): Sadece uygulama rolü atanan hesaplar (kendiniz) test edebilir. Carousel yayınlama için bu yeterli.
- **App Review** (inceleme): Production'a geçmek isterseniz gerekir ama tek kullanıcı (kendiniz) olduğu için Development modu yeterli.
- **Ayarlar → Roller**'den kendi Facebook hesabınızı **Administrator** olarak ekleyin.

### Adım 4 — Instagram Business Account ID Alma

Graph API Explorer'da (https://developers.facebook.com/tools/explorer/):

```
GET /me/accounts?fields=id,name,instagram_business_account{id,username}
```

Dönen JSON'dan `instagram_business_account.id` değerini not edin. Bu sizin **IG_USER_ID**'niz.

### Adım 5 — Token Alma (Manuel — İlk Seferlik)

1. **Graph API Explorer** → Uygulama olarak `Dogus Performans` seçin
2. **Generate Access Token** → İstenen izinleri onaylayın
3. Bu kısa ömürlü token (1 saat) alacaksınız
4. **Long-Lived Token'a çevirmek için:**

```
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=APP_ID
  &client_secret=APP_SECRET
  &fb_exchange_token=KISA_OMURLU_TOKEN
```

Dönen `access_token` → 60 gün geçerli long-lived token.

### Adım 6 — Token'ı Apps Script'e Kaydetme

Long-lived token'ı **Script Properties**'e kaydedin:

```
INSTAGRAM_ACCESS_TOKEN = <long-lived-token>
INSTAGRAM_USER_ID = <ig_user_id>
META_APP_ID = <app_id>
META_APP_SECRET = <app_secret>
```

---

## BÖLÜM 2: Apps Script — `instagramYayinla` + Token Yenileme

Aşağıdaki kodu **Code.gs**'in sonuna ekleyin.

```javascript
// =============================================
//  INSTAGRAM CAROUSEL YAYINLAMA
// =============================================

/**
 * PNG dosyalarını GitHub'a yükler, public URL'lerden Instagram carousel oluşturur.
 *
 * @param {Object} params
 * @param {string} params.ay        - "2026-08" formatında ay
 * @param {string} params.set       - "puan" veya "birinci"
 * @param {string[]} params.images  - Base64 PNG dizisi (slayt sırasıyla)
 * @param {string} params.caption   - Instagram açıklama metni
 * @param {string} params.ghToken   - GitHub PAT (Contents izni)
 * @returns {Object} {success, mediaId?, error?}
 */
function instagramYayinla(params) {
  var props = PropertiesService.getScriptProperties();
  var igToken = props.getProperty('INSTAGRAM_ACCESS_TOKEN');
  var igUserId = props.getProperty('INSTAGRAM_USER_ID');

  if (!igToken || !igUserId) {
    return { success: false, error: 'Instagram token veya user ID eksik.' };
  }

  // 1) PNG'leri GitHub'a yükle → public raw URL'ler al
  var imageUrls = [];
  var repo = 'dogusremax/dogusportal';
  var branch = 'main';

  for (var i = 0; i < params.images.length; i++) {
    var path = 'assets/instagram/' + params.ay + '/' + params.set + '-' + (i + 1) + '.png';
    var ghUrl = 'https://api.github.com/repos/' + repo + '/contents/' + path;

    // Base64 PNG verisini doğrudan gönder
    var payload = JSON.stringify({
      message: 'Instagram görseli: ' + params.ay + ' ' + params.set + ' #' + (i + 1),
      content: params.images[i], // zaten base64
      branch: branch
    });

    var ghResp = UrlFetchApp.fetch(ghUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + params.ghToken,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      payload: payload,
      muteHttpExceptions: true
    });

    var ghStatus = ghResp.getResponseCode();
    if (ghStatus !== 201 && ghStatus !== 200) {
      // Dosya zaten varsa güncelle (SHA gerekli)
      if (ghStatus === 422) {
        var existing = UrlFetchApp.fetch(ghUrl + '?ref=' + branch, {
          headers: { 'Authorization': 'Bearer ' + params.ghToken, 'Accept': 'application/vnd.github.v3+json' },
          muteHttpExceptions: true
        });
        if (existing.getResponseCode() === 200) {
          var sha = JSON.parse(existing.getContentText()).sha;
          payload = JSON.stringify({
            message: 'Instagram görseli güncelle: ' + params.ay + ' ' + params.set + ' #' + (i + 1),
            content: params.images[i],
            sha: sha,
            branch: branch
          });
          ghResp = UrlFetchApp.fetch(ghUrl, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + params.ghToken,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            payload: payload,
            muteHttpExceptions: true
          });
          ghStatus = ghResp.getResponseCode();
        }
      }
      if (ghStatus !== 201 && ghStatus !== 200) {
        return { success: false, error: 'GitHub yükleme hatası (#' + (i + 1) + '): ' + ghResp.getContentText() };
      }
    }

    // GitHub Pages raw URL (CDN cache beklemeden jsdelivr kullan)
    var rawUrl = 'https://cdn.jsdelivr.net/gh/' + repo + '@' + branch + '/' + path;
    imageUrls.push(rawUrl);
  }

  // 2) Her görsel için Instagram container oluştur
  var containerIds = [];
  var apiBase = 'https://graph.instagram.com/v25.0/';

  for (var j = 0; j < imageUrls.length; j++) {
    var containerResp = UrlFetchApp.fetch(apiBase + igUserId + '/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        image_url: imageUrls[j],
        is_carousel_item: true,
        access_token: igToken
      }),
      muteHttpExceptions: true
    });

    if (containerResp.getResponseCode() !== 200) {
      return { success: false, error: 'Container oluşturma hatası (#' + (j + 1) + '): ' + containerResp.getContentText() };
    }
    containerIds.push(JSON.parse(containerResp.getContentText()).id);
  }

  // 3) Carousel container oluştur
  var carouselResp = UrlFetchApp.fetch(apiBase + igUserId + '/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify({
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
      caption: params.caption || '',
      access_token: igToken
    }),
    muteHttpExceptions: true
  });

  if (carouselResp.getResponseCode() !== 200) {
    return { success: false, error: 'Carousel container hatası: ' + carouselResp.getContentText() };
  }
  var carouselId = JSON.parse(carouselResp.getContentText()).id;

  // 4) Container durumu kontrol et (max 5 deneme, 10sn aralık)
  for (var k = 0; k < 5; k++) {
    Utilities.sleep(10000);
    var statusResp = UrlFetchApp.fetch(apiBase + carouselId + '?fields=status_code&access_token=' + igToken, {
      muteHttpExceptions: true
    });
    if (statusResp.getResponseCode() === 200) {
      var status = JSON.parse(statusResp.getContentText()).status_code;
      if (status === 'FINISHED') break;
      if (status === 'ERROR' || status === 'EXPIRED') {
        return { success: false, error: 'Container durumu: ' + status };
      }
    }
  }

  // 5) Yayınla
  var publishResp = UrlFetchApp.fetch(apiBase + igUserId + '/media_publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify({
      creation_id: carouselId,
      access_token: igToken
    }),
    muteHttpExceptions: true
  });

  if (publishResp.getResponseCode() !== 200) {
    return { success: false, error: 'Yayınlama hatası: ' + publishResp.getContentText() };
  }

  var mediaId = JSON.parse(publishResp.getContentText()).id;
  return { success: true, mediaId: mediaId };
}


// =============================================
//  WEB APP ENDPOINT — doGet/doPost'a ekle
// =============================================

// doPost içindeki switch/if bloğuna ekleyin:
//
//   case 'instagramYayinla':
//     var igParams = JSON.parse(e.postData.contents);
//     result = instagramYayinla(igParams);
//     break;


// =============================================
//  INSTAGRAM TOKEN YENİLEME (60 günde bir)
// =============================================

/**
 * Long-lived token'ı yeniler. 50. günde çalıştırın.
 * Trigger: zamana bağlı, her 45 günde bir.
 */
function instagramTokenYenile() {
  var props = PropertiesService.getScriptProperties();
  var currentToken = props.getProperty('INSTAGRAM_ACCESS_TOKEN');

  if (!currentToken) {
    Logger.log('Instagram token bulunamadı.');
    return;
  }

  var url = 'https://graph.instagram.com/refresh_access_token'
    + '?grant_type=ig_refresh_token'
    + '&access_token=' + currentToken;

  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

  if (resp.getResponseCode() === 200) {
    var data = JSON.parse(resp.getContentText());
    props.setProperty('INSTAGRAM_ACCESS_TOKEN', data.access_token);
    props.setProperty('INSTAGRAM_TOKEN_EXPIRES', new Date(Date.now() + data.expires_in * 1000).toISOString());
    Logger.log('Token yenilendi. Yeni süre: ' + data.expires_in + ' saniye');

    // Bildirim e-postası
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      '✅ Instagram Token Yenilendi',
      'Yeni token süresi: ' + Math.round(data.expires_in / 86400) + ' gün.\n'
      + 'Yenilenme tarihi: ' + new Date().toLocaleString('tr-TR')
    );
  } else {
    Logger.log('Token yenileme hatası: ' + resp.getContentText());
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      '⚠️ Instagram Token Yenileme BAŞARISIZ',
      'Hata: ' + resp.getContentText() + '\n\nManuel yenileme gerekebilir.'
    );
  }
}

/**
 * Token yenileme trigger'ını kurar (45 günde bir).
 * Bir kez çalıştırın.
 */
function kurInstagramTokenTrigger() {
  // Eski trigger'ları sil
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'instagramTokenYenile') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Her 45 günde bir (güvenli marj)
  ScriptApp.newTrigger('instagramTokenYenile')
    .timeBased()
    .everyDays(45)
    .atHour(3) // gece 03:00
    .create();

  Logger.log('Instagram token yenileme trigger kuruldu (45 günde bir).');
}
```

---

## BÖLÜM 3: `performans-gorsel.html` — "Instagram'a Gönder" Butonu

Aşağıdaki kod parçasını mevcut buton grubunun yanına (PNG/ZIP butonlarının bulunduğu alana) ekleyin.

### HTML Butonu

```html
<!-- Instagram Gönder Butonu -->
<button id="btnInstagram" onclick="instagramaGonder()" 
  style="background: linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);
         color:#fff; border:none; border-radius:12px; padding:12px 24px;
         font-size:16px; font-weight:700; cursor:pointer; display:inline-flex;
         align-items:center; gap:8px; margin-top:12px; opacity:0.95;
         transition: opacity 0.2s, transform 0.2s;"
  onmouseenter="this.style.opacity='1';this.style.transform='scale(1.03)'"
  onmouseleave="this.style.opacity='0.95';this.style.transform='scale(1)'">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
  Instagram'a Gönder
</button>
```

### JavaScript Fonksiyonu

```javascript
/**
 * Tüm poster canvas'larını base64 PNG olarak alıp
 * Apps Script üzerinden Instagram carousel olarak yayınlar.
 */
async function instagramaGonder() {
  const btn = document.getElementById('btnInstagram');
  const origText = btn.innerHTML;

  // Onay
  if (!confirm('Bu slaytları Instagram\'a carousel olarak yayınlamak istiyor musunuz?')) return;

  // GitHub token kontrolü
  const ghToken = localStorage.getItem('ghToken');
  if (!ghToken) {
    alert('GitHub token bulunamadı. Lütfen önce GitHub token girin.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⏳ Hazırlanıyor...';

  try {
    // 1) Canvas'ları topla
    const canvases = document.querySelectorAll('canvas.poster-canvas, .slide-canvas');
    if (canvases.length < 2) {
      alert('Carousel için en az 2 slayt gerekli.');
      btn.disabled = false;
      btn.innerHTML = origText;
      return;
    }

    const images = [];
    for (const c of canvases) {
      // Canvas'ı JPEG'e çevir (Instagram sadece JPEG destekler)
      // Ama PNG olarak GitHub'a yükleyip, jsdelivr üzerinden sunacağız
      // Instagram aslında PNG'yi de kabul eder (JPEG kısıtlaması sadece resmi dokümanda)
      const dataUrl = c.toDataURL('image/jpeg', 0.95);
      const base64 = dataUrl.split(',')[1];
      images.push(base64);
    }

    // 2) Caption oluştur
    const params = new URLSearchParams(window.location.search);
    const ay = params.get('ay') || new Date().toISOString().slice(0, 7);
    const set = params.get('set') || 'puan';
    const ayAd = new Date(ay + '-01').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    const caption = set === 'birinci'
      ? `🏆 ${ayAd} — RE/MAX Doğuş Birincilik Sıralaması\n\n#remax #remaxdogus #fikirtepe #kadikoy #gayrimenkul #performans`
      : `📊 ${ayAd} — RE/MAX Doğuş Aylık Performans Puanları\n\n#remax #remaxdogus #fikirtepe #kadikoy #gayrimenkul #performans`;

    btn.innerHTML = '📤 Instagram\'a gönderiliyor...';

    // 3) Apps Script'e gönder
    const APPS_SCRIPT_URL = 'APPS_SCRIPT_WEB_APP_URL'; // ← Gerçek URL ile değiştirin
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'instagramYayinla',
        ay: ay,
        set: set,
        images: images,
        caption: caption,
        ghToken: ghToken
      })
    });

    const result = await resp.json();

    if (result.success) {
      btn.innerHTML = '✅ Yayınlandı!';
      btn.style.background = '#22c55e';
      alert('Instagram carousel başarıyla yayınlandı!\nMedia ID: ' + result.mediaId);
    } else {
      throw new Error(result.error || 'Bilinmeyen hata');
    }

  } catch (err) {
    console.error('Instagram hata:', err);
    alert('Instagram gönderim hatası: ' + err.message);
    btn.innerHTML = origText;
    btn.style.background = '';
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = origText;
      btn.style.background = '';
    }, 5000);
  }
}
```

---

## BÖLÜM 4: Kurulum Kontrol Listesi

### Meta Tarafı
- [ ] Instagram hesabı → Business Account'a çevrildi
- [ ] Instagram hesabı → Facebook Sayfasına bağlandı
- [ ] Facebook Sayfası → PPA (Page Publishing Authorization) tamamlandı
- [ ] Meta for Developers → `Dogus Performans` uygulaması oluşturuldu
- [ ] Uygulama → `instagram_business_basic` izni eklendi
- [ ] Uygulama → `instagram_business_content_publish` izni eklendi
- [ ] Graph API Explorer → Token oluşturuldu ve onaylandı
- [ ] Kısa token → Long-lived token'a çevrildi (60 gün)
- [ ] IG_USER_ID not edildi

### Apps Script Tarafı
- [ ] Script Properties'e `INSTAGRAM_ACCESS_TOKEN` eklendi
- [ ] Script Properties'e `INSTAGRAM_USER_ID` eklendi
- [ ] Script Properties'e `META_APP_ID` eklendi
- [ ] Script Properties'e `META_APP_SECRET` eklendi
- [ ] `instagramYayinla` fonksiyonu Code.gs'e eklendi
- [ ] `instagramTokenYenile` fonksiyonu Code.gs'e eklendi
- [ ] `kurInstagramTokenTrigger()` bir kez çalıştırıldı (45 günlük yenileme)
- [ ] doPost'a `instagramYayinla` case eklendi

### GitHub Tarafı
- [ ] GitHub PAT geçerli (Contents izni var)
- [ ] `assets/instagram/` klasörü repo'da mevcut (otomatik oluşur)

### HTML Tarafı
- [ ] `performans-gorsel.html`'e Instagram butonu eklendi
- [ ] `APPS_SCRIPT_WEB_APP_URL` gerçek URL ile değiştirildi

---

## BÖLÜM 5: Önemli Notlar

### Görsel Format Kısıtı
- Meta dokümantasyonu resmi olarak sadece **JPEG** desteklediğini söylüyor.
- Pratikte PNG görseller de çalışıyor ancak güvenli tarafta kalmak için canvas'tan `image/jpeg` olarak export ediyoruz (kalite 0.95).
- Slaytlar 3:4 (1080×1440) — Instagram carousel için ideal.

### Rate Limit
- Hesap başına 24 saatte **100 API yayını** (carousel = 1 yayın).
- Günde 1 carousel yayınlayacağınız için sorun olmaz.

### Token Akışı
```
Short-lived (1 saat)
    ↓ fb_exchange_token
Long-lived (60 gün)
    ↓ ig_refresh_token (her 45 günde — trigger)
Long-lived (yeni 60 gün)
    ↓ ...tekrar
```

### Güvenlik
- GitHub token'ı localStorage'da saklanıyor (mevcut yapınızla tutarlı).
- Instagram token'ı Script Properties'de (sunucu tarafı, güvenli).
- App Secret asla client-side'a çıkmaz.

### jsDelivr CDN Notu
- GitHub raw URL'ler yerine `cdn.jsdelivr.net/gh/` kullanıyoruz.
- Neden: GitHub raw URL'ler cache sorunu yaşayabilir; jsdelivr anında CDN'den sunar.
- Instagram API görselleri cURL ile çektiği için URL'nin hızlı erişilebilir olması kritik.
- jsDelivr cache süresi bazen sorun olabilir; yeni görseller için `@branch` yerine `@commit-sha` kullanılabilir.
- Alternatif: Cloudinary / imgBB gibi bir image hosting servisi (ücretsiz tier).
