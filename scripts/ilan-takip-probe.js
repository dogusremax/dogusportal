/* İlan takibi (emlakjet + remax.com.tr) için kart yapısı denemesi. Yalnız okur. */
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const al = async u => { const r = await fetch(u, { headers: { "user-agent": UA, "accept-language": "tr-TR" } }); return [r.status, r.url, await r.text()]; };
(async () => {
  let [s, u, h] = await al("https://www.emlakjet.com/satilik-konut/istanbul-kadikoy-fikirtepe-mahallesi");
  console.log("== emlakjet", s, u, h.length);
  const i = h.search(/15\.900\.000|\d{1,3}\.\d{3}\.\d{3}\s*₺/);
  console.log(h.slice(i - 2500, i + 1500).replace(/\s+/g, " "));
  console.log("ilan linkleri:", [...new Set(h.match(/\/ilan\/[a-z0-9-]+-\d{6,9}/g) || [])].slice(0, 5).join(" "), "adet", new Set(h.match(/\/ilan\/[a-z0-9-]+-\d{6,9}/g) || []).size);
  console.log("toplam:", (h.match(/[\d.]+\s*(ilan|sonuç)[^<]{0,40}/gi) || []).slice(0, 5).join(" | "));
  console.log("sayfa:", [...new Set(h.match(/[?&]sayfa=\d+|\/\d+\/?"/g) || [])].slice(0, 8).join(" "));
  [s, u, h] = await al("https://www.emlakjet.com/satilik-konut/istanbul-kadikoy-fikirtepe-mahallesi/2");
  console.log("== emlakjet s2", s, u, h.length, new Set(h.match(/\/ilan\/[a-z0-9-]+-\d{6,9}/g) || []).size);
  [s, u, h] = await al("https://remax.com.tr/tr/konut/satilik/istanbul-anadolu/kadikoy/fikirtepe");
  console.log("== remax", s, u, h.length);
  const j = h.indexOf("rmx-prop__body");
  console.log(h.slice(j - 1500, j + 2500).replace(/\s+/g, " "));
  console.log("kart adet", (h.match(/rmx-prop__price/g) || []).length);
  console.log("toplam:", (h.match(/[\d.]+\s*(ilan|portföy|sonuç)[^<]{0,40}/gi) || []).slice(0, 5).join(" | "));
  console.log("sayfa:", [...new Set(h.match(/[?&](page|sayfa)=\d+/g) || [])].slice(0, 8).join(" "));
})();
