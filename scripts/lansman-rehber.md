# Kıbrıs Lansmanı Davetli Paneli — Kurulum

Sayfa: **dogusportal.com/kibris-bulusma.html** → "Davetli panelim" bölümü.
Danışman **Danışman Takip PIN**'iyle (Koç sayfasındaki PIN) girer, davetlilerini kaydeder.
Kayıtlar, sıralama ve bildirimler **dogus-whatsapp-service** üzerinden çalışır.

## Nasıl çalışır

- **Danışman:** kendi davetlilerini ekler, durumlarını günceller (Davet edildi → Teyit verdi → Son teyit → Geldi → Görüşme → Satış).
  Başkasının müşterisini göremez; sıralamada yalnız sayılar görünür.
- **Müşteri sahipliği:** aynı telefon numarasını ikinci bir danışman giremez. Sayfa "bu numara X adına şu tarihte kaydedilmiş" der.
- **%60 hakkı:** 13 Kasım 18.00'e kadar en az 3 kesin teyit. Teyit saati kayıtta tutulur, sonradan değiştirilemez.
- **Broker (Umut, Makbule):** tüm davetlileri görür, lansman günü giriş yapar, danışmanlara bildirim gönderir.
- **Bildirimler:** danışmanın telefonuna (portal bildirimleri açıksa) ve sayfadaki "Bildirimlerim" listesine gider:
  - Her gün 10:00'da hedefin gerisindekilere otomatik hatırlatma (9 Kasım listesi, 13 Kasım teyitleri, 19 Kasım son teyit, lansman arifesi).
  - Yeni kesin teyit → Makbule Hanım'a.
  - Broker bir davetlinin durumunu değiştirirse → o danışmana.
- **Tablo:** ilk kullanımda Drive'da "Kıbrıs Lansmanı 22 Kasım — Davetliler" tablosu kendiliğinden açılır.
  Otel listesi için buradan da bakabilirsin.

## Kurulum (bir kez, ~10 dk)

`script.google.com` → **dogus-whatsapp-service**:

1. `scripts/lansman-appscript.js` içeriğini **Kod.gs'nin en altına** yapıştır → Kaydet.
2. `doPost` içindeki `switch`'e şu satırı ekle (`talepBildir`'in altına):
   ```js
   case 'lansman': return jsonResponse(lansman_(payload));
   ```
3. Üst menüden **`lansmanTestBana`** seç → ▶️ Çalıştır. İlk seferde Drive/Sheets izni ister, onayla.
   Telefonuna "Lansman bildirimleri çalışıyor" gelmeli; Günlük'te tablonun adresi yazar.
4. **`lansmanKur`** çalıştır → her gün 10:00 hatırlatması açılır. (Kapatmak: `lansmanKapat`.)
5. **Dağıt → Dağıtımları yönet → ✏️ → Sürüm: Yeni sürüm → Dağıt.** (URL değişmez.)
6. `dogusportal.com/kibris-bulusma.html#panel` → kendi PIN'inle gir, bir deneme davetlisi ekleyip sil.

## Ayarlar (`LANSMAN` nesnesi, dosyanın başında)

- `EKIP`: sıralamada ve hatırlatmalarda yer alan danışmanlar. Adlar Müşteri Takip'tekiyle **aynı** olmalı
  (bildirimler bu adlara gider). Yeni danışman gelirse buraya ekle.
- `TESLIM`, `HEDEF`: tarihler ve hedefler (10 kişilik liste, 3 kesin teyit). Değiştirirsen sayfadaki metinler de güncellenmeli.
- `KOORDINATOR`: yeni teyit bildirimi kime gitsin.

## Sorun çıkarsa

- **"PIN hatalı"**: PIN, Koç sayfasında da çalışıyor mu bak. Giriş 15 dk önbellekte tutulur.
- **"Bilinmeyen işlem" ya da sayfa hiç cevap vermiyor**: 2. adımdaki satır eklenmemiş ya da 5. adımda yeni sürüm dağıtılmamış.
- **Bildirim gelmiyor**: danışman portalda "Bildirimlerim"den telefon bildirimini açmış olmalı. Sayfadaki listeye yine de düşer.
