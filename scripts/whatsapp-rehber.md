# Haftalık WhatsApp Mesajları — Kurulum

Gönderim, kapanış/ödeme/talep bildirimlerini yollayan merkezi **dogus-whatsapp-service** üzerinden yapılır. Meta bağlantısı ve danışman numaraları zaten orada; yeni bir Meta kurulumu gerekmez.

Akış:
1. **Pazartesi 09:00** ve **Çarşamba 18:30**'da size e-posta gelir: "Mesajlar onayınızı bekliyor".
2. Linke dokununca `haftalik-mesajlar.html` açılır. Her danışmanın mesajı WhatsApp'ta göreceği haliyle hazırdır. İsterseniz düzenler, birini listeden çıkarırsınız.
3. **✅ Onayla ve gönder** → sayfa servise `action=haftalikMesaj` yollar, servis onaylı şablonlarla gönderir. Sonuç kartlarda görünür (yeşil gitti, kırmızı hata).

---

## 1. Şablonları onaya gönderin (WhatsApp Manager → Mesaj Şablonları → Oluştur)

Servisin kullandığı WhatsApp hesabında oluşturun.

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

## 2. dogus-whatsapp-service'e ekleyin (bir kez)

1. `scripts/whatsapp-appscript.js` içeriğini servisin Apps Script projesine ekleyin (yeni bir `.gs` dosyası olabilir).
2. Dosyanın başındaki iki uyarlama fonksiyonunu servisteki mevcut karşılıklarına bağlayın:
   - `hmTelefon_(id, ad)`: kapanış bildiriminin danışman numarasını bulduğu fonksiyon.
   - `hmSablonGonder_(telefon, sablon, params)`: servisin Meta'ya şablon gönderen fonksiyonu.
3. Dosyanın sonundaki `haftalikMesaj` bloğunu servisin `doPost`'una, `kapanisBildir`'in yanına ekleyin.
4. **Proje Ayarları → Script Properties**:

| Anahtar | Değer |
|---|---|
| `ONAY_PIN` | Sizin belirlediğiniz PIN (sayfa ilk gönderimde sorar, cihazda hatırlar) |
| `WA_TEST_NUMARA` | Kendi numaranız, `905…` biçiminde |
| `WA_ONAY_EPOSTA` | (isteğe bağlı) Onay e-postasının gideceği adres |

5. Editörde `kurHaftalikMesajTetikleri` fonksiyonunu bir kez çalıştırın.
6. **Dağıt → Dağıtımları yönet → Düzenle → Yeni sürüm** (aynı web app URL'i kalır, diğer uygulamalar etkilenmez).

## 3. İlk deneme

1. `haftalik-mesajlar.html?k=1520` açın → **Bana test gönder**. İlk kartın mesajı sadece `WA_TEST_NUMARA`'ya gider.
2. Telefonunuzda doğru görünüyorsa gerçek gönderime geçebilirsiniz.

## Sık hatalar

| Hata | Çözüm |
|---|---|
| `Template name does not exist in the translation` | Şablon henüz onaylanmadı ya da adı/dili farklı |
| `Number of parameters does not match` | Meta'daki metin ile `SABLON` farklı |
| `hmTelefon_ … bağlanmadı` | 2. adımdaki uyarlama fonksiyonları henüz servise bağlanmadı |
| `PIN hatalı` | `ONAY_PIN` ile girilen farklı; sayfa PIN'i unutur, tekrar sorar |
| Aynı mesaj iki kez gider mi? | Hayır. Her kişi+hafta+mod bir kez gönderilir (Script Properties'te `hm_gitti_…` kaydı) |

## Kişiye özel ayarlar

`haftalik-mesajlar.html` → `OZEL`:
- `mod: 'destek'`: sıralama, puan ve karne yerine `destek_mesaji` gider; ofis ortalamasına katılmaz.
- `takim: '<id>'`: mesajda takım arkadaşlığını takdir eden cümle çıkar.
