/* Fiyatlama raporu için veri kaynağı denemesi: arama sayfalarından ilan listesi çıkıyor mu?
 * Yalnız okur, hiçbir şey yazmaz. Çıktı: her kaynak için durum kodu, boyut ve bulunan ilan örnekleri. */
const UA_TR = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const UA_WA = "WhatsApp/2.23.20.0";
const KAYNAK = [
  ["emlakjet", "https://www.emlakjet.com/satilik-konut/istanbul-kadikoy-fikirtepe-mahallesi", UA_TR],
  ["emlakjet-sahibinden", "https://www.emlakjet.com/satilik-konut/istanbul-kadikoy-fikirtepe-mahallesi?sahibinden=1", UA_TR],
  ["remax1", "https://www.remax.com.tr/konut/satilik/istanbul-anadolu/kadikoy/fikirtepe", UA_TR],
  ["remax2", "https://www.remax.com.tr/satilik/konut/istanbul-anadolu/kadikoy/fikirtepe", UA_TR],
  ["remax3", "https://www.remax.com.tr/portfoy-arama?Islem=Satilik&Il=istanbul-anadolu&Ilce=kadikoy&Mahalle=fikirtepe", UA_TR],
  ["sahibinden", "https://www.sahibinden.com/satilik-daire/istanbul-kadikoy-fikirtepe", UA_WA],
  ["sahibinden-q", "https://www.sahibinden.com/emlak?query_text=fikirtepe%20sat%C4%B1l%C4%B1k%20daire", UA_WA],
  ["sahibinden-sahip", "https://www.sahibinden.com/satilik-daire/istanbul-kadikoy-fikirtepe/sahibinden", UA_WA]
];
(async () => {
  for (const [ad, url, ua] of KAYNAK) {
    try {
      const r = await fetch(url, { headers: { "user-agent": ua, "accept-language": "tr-TR,tr;q=0.9" }, redirect: "follow" });
      const h = await r.text();
      console.log("\n==== " + ad + " " + r.status + " " + h.length + "B → " + r.url);
      const next = h.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (next) {
        const s = next[1];
        console.log("NEXT_DATA " + s.length + "B; anahtarlar:", Object.keys(JSON.parse(s).props?.pageProps || {}).join(","));
        const i = s.search(/"(price|fiyat)"/i);
        console.log("ornek:", s.slice(Math.max(0, i - 600), i + 600));
      }
      const ld = (h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []).map(x => x.slice(0, 300));
      console.log("ld+json adet " + ld.length + (ld[0] ? ": " + ld[0] : ""));
      const satir = h.match(/<tr[^>]*data-id="\d+"[\s\S]*?<\/tr>/g) || [];
      console.log("sahibinden satır " + satir.length);
      if (satir[0]) console.log(satir[0].replace(/\s+/g, " ").slice(0, 1500));
      const fiyatlar = (h.match(/\d{1,3}(?:\.\d{3}){2,}\s*(TL|₺)/g) || []).slice(0, 15);
      console.log("fiyat örnekleri:", fiyatlar.join(" | "));
      const tarih = (h.match(/"(createdAt|createDate|publishDate|insertDate|ilanTarihi|date)"\s*:\s*"[^"]{6,30}"/gi) || []).slice(0, 5);
      console.log("tarih alanları:", tarih.join(" | "));
      if (!next && !satir.length) console.log("baş:", h.replace(/\s+/g, " ").slice(0, 400));
    } catch (e) { console.log("\n==== " + ad + " HATA " + e.message); }
  }
})();
