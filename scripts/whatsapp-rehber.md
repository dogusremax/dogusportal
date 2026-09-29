# Haftalık WhatsApp Mesajları — Kurulum

Gönderim, kapanış/dekont/nöbet/burç mesajlarını yollayan **dogus-whatsapp-service** üzerinden yapılır.
Meta bağlantısı, numaralar (`NOBET_WA_TELEFONLAR`), test numarası (`TEST_PHONE_NUMBER`) ve log (`MessageLog`) zaten orada.

## Nasıl çalışır

1. **Pazartesi 09:00** ve **Çarşamba 18:30**'da e-posta gelir: "mesajlar onayını bekliyor".
2. Linke dokununca `haftalik-mesajlar.html` açılır; her danışmanın mesajı WhatsApp'ta göreceği haliyle hazırdır.
   Sarı alanlar kişiye göre değişen kısımlardır, **Düzenle** ile değiştirilebilir. Göndermek istemediğin kişinin işaretini kaldır.
3. **✅ Onayla ve gönder** → PIN → servis onaylı şablonlarla gönderir. Kartlar yeşil (gitti) / kırmızı (hata ve sebebi) olur.

## Kurulum (bir kez, ~15 dk)

`script.google.com` → **dogus-whatsapp-service**:

1. `scripts/whatsapp-appscript.js` içeriğini **Kod.gs'nin en altına** yapıştır → Kaydet.
2. Üst menüden **`haftalikSablonlariOlustur`** fonksiyonunu seç → ▶️ Çalıştır.
   Üç şablon Meta onayına gider: `carsamba_hatirlatma`, `haftalik_karne`, `destek_mesaji`.
3. Birkaç saat sonra **`haftalikSablonDurum`** çalıştır → üçü de `APPROVED` olunca devam.
   (İstersen `onayBekcisi`'nin `beklenenSablonlar_` listesine bu üç adı ekle; onaylanınca mail atar.)
4. **Proje Ayarları → Script Properties → Ekle:** `ONAY_PIN` = sayfada gönderirken soracağı şifre (ör. 4 haneli).
5. `doPost` içindeki `switch`'e şu satırı ekle (`talepBildir`'in altına):
   ```js
   case 'haftalikMesaj': return jsonResponse(haftalikMesaj(payload));
   ```
6. **Dağıt → Dağıtımları yönet → ✏️ → Sürüm: Yeni sürüm → Dağıt.** (URL değişmez, diğer otomasyonlar etkilenmez.)
7. **`haftalikTestBana`** çalıştır → telefonuna örnek karne gelmeli.
8. **`haftalikKur`** çalıştır → Pazartesi/Çarşamba onay e-postaları açılır. (Kapatmak: `haftalikKapat`.)

İlk gerçek gönderimden önce sayfada **Bana test gönder**'e bas: ilk kartın mesajı sadece `TEST_PHONE_NUMBER`'a gider.

## Şablon kategorisi

Şablonlar **UTILITY** olarak gönderilir (`allow_category_change: true`). Meta motivasyon içeriği yüzünden **MARKETING**'e çevirebilir.
O durumda da çalışır; ancak işletme doğrulaması tamamlanmadığı için onay daha yavaş olabilir (burç/doğum günü şablonlarındaki gibi).

## Şablon metnini değiştirmek

Metin iki yerde **birebir aynı** olmalı: `whatsapp-appscript.js` → `haftalikSablonlariOlustur` ve `haftalik-mesajlar.html` → `SABLON`.
Onaylı şablon değişince Meta'da yeniden onay gerekir (servisteki `sablonuYenile_` bunun için kullanılabilir).

## Sık hatalar

| Görülen | Sebep / çözüm |
|---|---|
| `PIN hatalı` | `ONAY_PIN` ile girilen farklı. Sayfa PIN'i unutur, tekrar sorar |
| `ONAY_PIN tanımlı değil` | Kurulum 4. adım |
| `UNKNOWN_ACTION` | Kurulum 5–6. adım (switch satırı ya da yeni sürüm eksik) |
| `Numara yok: …` | Kişi `NOBET_WA_TELEFONLAR` listesinde yok |
| `Template name does not exist…` | Şablon henüz onaylanmadı |
| Aynı mesaj iki kez gider mi? | Hayır: kişi + hafta + gün başına bir kez (`HAFTALIK_WA_GONDERILEN`) |

## Kişiye özel ayarlar

`haftalik-mesajlar.html` → `OZEL`:
- `mod: 'destek'`: sıralama/puan/karne yerine `destek_mesaji` gider; ofis ortalamasına katılmaz.
- `takim: '<id>'`: mesajda takım arkadaşlığını takdir eden cümle çıkar.
