# Haftalık WhatsApp Mesajları — Kurulum

Akış:
1. **Pazartesi 09:00** ve **Çarşamba 18:30**'da size e-posta gelir: "Mesajlar onayınızı bekliyor".
2. Linke dokununca `haftalik-mesajlar.html` açılır. Her danışmanın mesajı WhatsApp'ta göreceği haliyle hazırdır. İsterseniz düzenler, birini listeden çıkarırsınız.
3. **✅ Onayla ve gönder** → Apps Script, Meta WhatsApp Cloud API ile mesajları gönderir. Sonuç kartlarda görünür (yeşil gitti, kırmızı hata).

Numaralar ve Meta anahtarı **sadece Apps Script'in Script Properties'inde** durur; sayfada ve repoda yoktur.

---

## 1. Meta tarafı (bir kez)

1. **business.facebook.com** → Instagram için kullandığınız işletme hesabı. İşletme doğrulaması (vergi levhası vb.) tamamlanmış olmalı.
2. **developers.facebook.com** → mevcut `Dogus Performans` uygulaması → **Ürün Ekle → WhatsApp → Ayarla**.
3. **WhatsApp → API Setup** → **Add phone number**: mesajların gideceği işletme numarası.
   - Bu numara normal WhatsApp'ta kullanılıyorsa Meta'nın "WhatsApp Business uygulaması ile birlikte kullanım" (coexistence) seçeneğine bakın; yoksa ayrı bir hat kullanın.
   - Görünen ad: **RE/MAX Doğuş** (Meta onaylar).
4. Aynı sayfadaki **Phone number ID** → `WA_PHONE_ID`.
5. **İşletme Ayarları → Sistem Kullanıcıları** → yönetici bir sistem kullanıcısı oluştur → uygulamayı ve WhatsApp hesabını ata → **Token oluştur** (süresiz, izinler: `whatsapp_business_messaging`, `whatsapp_business_management`) → `WA_TOKEN`.
6. **Ödeme yöntemi** ekleyin (WhatsApp → Ayarlar). İşletmenin başlattığı şablon mesajlar ücretlidir; güncel Türkiye fiyatı Meta'nın fiyatlandırma sayfasındadır.

## 2. Şablonları onaya gönderin (WhatsApp Manager → Mesaj Şablonları → Oluştur)

Üçü de: **Dil: Türkçe (tr)**. Kategori olarak **Yardımcı (Utility)** deneyin (çalışanlara performans bildirimi). Meta **Pazarlama**'ya çevirirse de çalışır ama birim ücreti daha yüksektir.
Metinleri **birebir** kopyalayın. `haftalik-mesajlar.html`'deki `SABLON` ile aynı olmalı. Örnek değer isteyince aşağıdakileri girin.

### `carsamba_hatirlatma`
```
Merhaba {{1}} 👋
Hafta ortasına geldik, *Çarşamba* akşamı! 🗓️

_"{{2}}"_

📊 {{3}}

🎯 Hafta sonuna kadar: {{4}}

Aktivitelerini uygulamaya girmeyi unutma 👉 dogusportal.com
İyi akşamlar, RE/MAX Doğuş
```
Örnekler: `Ayşegül` · `Haftanın yarısı geride, sonucu belirleyecek yarısı önünde.` · `Şu an 3. sıradasın (105 puan).` · `gösterim 1/2, sosyal medya paylaşımı 1/3`

### `haftalik_karne`
```
Günaydın {{1}} ☀️
*{{2}} haftalık karnen* 📋

🏅 Sıralama: {{3}}
⭐ Puan: {{4}}
📅 Aktif gün: {{5}}

✅ *İyi yaptıkların:* {{6}}

⚠️ *Geliştirmen gerekenler:* {{7}}

💬 *Broker yorumu:* _{{8}}_
— U.T / M.T

🎯 *Bu haftanın planı:* {{9}}

{{10}}
RE/MAX Doğuş
```
Örnekler: `Gamze` · `24 Ağu – 30 Ağu` · `1/8` · `291 (ofis ortalaması 90)` · `5` · `2 kapanış, 23 gösterim` · `FZBO araması 0/3` · `Haftanın lideri sensin Gamze!` · `1) 3 FZBO araması · 2) 1 sunum` · `Instagram story’sinde sen de varsın 📸`

### `destek_mesaji`
```
Merhaba {{1}} 🌿
{{2}}

_"{{3}}"_

{{4}}

Bir telefon kadar yakınız, iyi ki varsın 💙
U.T / M.T · RE/MAX Doğuş
```
Örnekler: `Aysun` · `Yeni bir hafta başladı, haftan güzel geçsin.` · `Her gün biraz daha güçlü, adım adım.` · `Uzaktan da olsa ekibin bir parçası olman hepimize güç veriyor.`

> Şablon metnini değiştirmek isterseniz: Meta'da düzenleyip yeniden onaylatın **ve** `haftalik-mesajlar.html` içindeki `SABLON`'u aynı metne güncelleyin.

## 3. Apps Script tarafı (bir kez)

1. `scripts/whatsapp-appscript.js` içeriğini Apps Script projesindeki `Code.gs`'in sonuna ekleyin.
2. Dosyanın sonundaki `whatsappGonder` bloğunu mevcut `doPost` içine ekleyin.
3. **Proje Ayarları → Script Properties**:

| Anahtar | Değer |
|---|---|
| `WA_TOKEN` | 1.5'teki sistem kullanıcısı token'ı |
| `WA_PHONE_ID` | 1.4'teki Phone number ID |
| `ONAY_PIN` | Sizin belirlediğiniz PIN (sayfa ilk gönderimde sorar, cihazda hatırlar) |
| `WA_NUMARALAR` | `{"aysegul_alpay":"905…","aysun":"905…","evsen":"905…","gamze":"905…","gizem":"905…","irem":"905…","orhan":"905…","ozlem_varol":"905…"}` |
| `WA_TEST_NUMARA` | Kendi numaranız, `905…` biçiminde |
| `WA_ONAY_EPOSTA` | (isteğe bağlı) Onay e-postasının gideceği adres |

   Numaralar başında `90`, boşluksuz yazılır. Anahtarlar performans verisindeki `id`'lerle aynıdır.
4. Editörde `kurWhatsappTetikleri` fonksiyonunu bir kez çalıştırın (izin ister).
5. **Dağıt → Dağıtımları yönet → Düzenle → Yeni sürüm** (aynı web app URL'i kalır).

## 4. İlk deneme

1. `haftalik-mesajlar.html?k=1520` açın → **Bana test gönder**. İlk kartın mesajı sadece `WA_TEST_NUMARA`'ya gider.
2. Telefonunuzda doğru görünüyorsa gerçek gönderime geçebilirsiniz.

## Sık hatalar

| Hata | Çözüm |
|---|---|
| `Template name does not exist in the translation` | Şablon henüz onaylanmadı ya da adı/dili farklı |
| `Number of parameters does not match` | Meta'daki metin ile `SABLON` farklı |
| `Recipient phone number not in allowed list` | Uygulama test modunda; canlı numara ekleyin |
| `PIN hatalı` | `ONAY_PIN` ile girilen farklı; sayfa PIN'i unutur, tekrar sorar |
| Aynı mesaj iki kez gider mi? | Hayır. Her kişi+hafta+mod bir kez gönderilir (Script Properties'te `wa_gitti_…` kaydı) |

## Kişiye özel ayarlar

`haftalik-mesajlar.html` → `OZEL`:
- `mod: 'destek'`: sıralama, puan ve karne yerine `destek_mesaji` gider; ofis ortalamasına katılmaz.
- `takim: '<id>'`: mesajda takım arkadaşlığını takdir eden cümle çıkar.
