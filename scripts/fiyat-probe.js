/* Fiyatlama raporu için veri kaynağı denemesi (2. tur): ilan satırlarının alanları. Yalnız okur. */
const UA_TR = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const UA_WA = "WhatsApp/2.23.20.0";
const duz = s => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
async function al(url, ua) {
  const r = await fetch(url, { headers: { "user-agent": ua, "accept-language": "tr-TR,tr;q=0.9" }, redirect: "follow" });
  return { s: r.status, u: r.url, h: await r.text() };
}
(async () => {
  // sahibinden: satırdaki tüm hücreler + sayfalama + toplam
  for (const url of ["https://www.sahibinden.com/satilik-daire/istanbul-kadikoy-fikirtepe/sahibinden",
                     "https://www.sahibinden.com/kiralik-daire/istanbul-kadikoy-fikirtepe?pagingOffset=20"]) {
    const { s, u, h } = await al(url, UA_WA);
    console.log("\n==== sahibinden " + s + " " + u);
    console.log("toplam:", duz((h.match(/class="result-text"[\s\S]{0,400}/) || [""])[0]).slice(0, 200));
    console.log("sayfalama:", (h.match(/pagingOffset=\d+/g) || []).slice(0, 8).join(","));
    const satir = h.match(/<tr[^>]*data-id="\d+"[\s\S]*?<\/tr>/g) || [];
    satir.slice(0, 4).forEach(r => {
      const tdler = (r.match(/<td class="([^"]+)"[^>]*>([\s\S]*?)<\/td>/g) || []).map(td => {
        const c = (td.match(/class="([^"]+)"/) || [])[1]; return c.split(" ")[0] + "=" + duz(td).slice(0, 80);
      });
      console.log("- " + (r.match(/data-id="(\d+)"/) || [])[1] + " :: " + tdler.join(" | "));
    });
  }
  // emlakjet: ilan JSON alanları
  {
    const { s, h } = await al("https://www.emlakjet.com/satilik-konut/istanbul-kadikoy-fikirtepe-mahallesi", UA_TR);
    console.log("\n==== emlakjet " + s);
    for (const k of ["squareMeter", "grossSquareMeter", "roomCount", "createdAt", "updatedAt", "publishDate", "listingId", "\\\"id\\\":", "priceDetail", "totalCount", "ownerType", "isOwner"]) {
      const i = h.indexOf(k.replace(/\\/g, ""));
      console.log(k + " @" + i + (i > 0 ? ": " + h.slice(Math.max(0, i - 150), i + 250).replace(/\s+/g, " ") : ""));
    }
  }
  // remax
  {
    const { s, h } = await al("https://remax.com.tr/tr/konut/satilik/istanbul-anadolu/kadikoy/fikirtepe", UA_TR);
    console.log("\n==== remax " + s + " " + h.length);
    for (const k of ["price", "squareMeter", "roomCount", "createdDate", "listingDate", "portfolioNo", "totalCount", "\"count\""]) {
      const i = h.indexOf(k);
      console.log(k + " @" + i + (i > 0 ? ": " + h.slice(Math.max(0, i - 150), i + 250).replace(/\s+/g, " ") : ""));
    }
  }
})();
