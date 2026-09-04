#!/usr/bin/env node
/** EVDS teşhis: hangi adres/kimlik kalıbı JSON döndürüyor, bulur. */
const KEY = process.env.EVDS_API_KEY || '';
const S = process.env.EVDS_SERIES || 'TP.FG.J0';
const per = 'startDate=01-01-2024&endDate=01-09-2026';

const denemeler = [
  ['1 https + header key',        `https://evds2.tcmb.gov.tr/service/evds/series=${S}&${per}&type=json`, {key:KEY}],
  ['2 https + query key',         `https://evds2.tcmb.gov.tr/service/evds/series=${S}&${per}&type=json&key=${KEY}`, {}],
  ['3 kategori testi (header)',   `https://evds2.tcmb.gov.tr/service/evds/categories/type=json`, {key:KEY}],
  ['4 kategori testi (query)',    `https://evds2.tcmb.gov.tr/service/evds/categories/key=${KEY}&type=json`, {}],
  ['5 frequency=5 eklenmiş',      `https://evds2.tcmb.gov.tr/service/evds/series=${S}&${per}&type=json&frequency=5`, {key:KEY}],
  ['6 csv çıktı',                 `https://evds2.tcmb.gov.tr/service/evds/series=${S}&${per}&type=csv`, {key:KEY}],
  ['7 http (tls yok)',            `http://evds2.tcmb.gov.tr/service/evds/series=${S}&${per}&type=json`, {key:KEY}],
  ['8 anahtarsız (blok testi)',   `https://evds2.tcmb.gov.tr/service/evds/series=${S}&${per}&type=json`, {}]
];

(async () => {
  console.log('Anahtar uzunluğu:', KEY.length, '| seri:', S);
  for (const [ad, url, h] of denemeler) {
    try {
      const r = await fetch(url, { headers: Object.assign({
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        'Accept':'application/json,text/plain,*/*',
        'Accept-Language':'tr-TR,tr;q=0.9'
      }, h), redirect:'follow', signal: AbortSignal.timeout(20000) });
      const t = await r.text();
      const html = /^\s*<(!doctype|html)/i.test(t);
      let tip = html ? 'HTML (arayüz)' : 'düz metin';
      let ek = '';
      if (!html) {
        try { const j = JSON.parse(t); const it = j.items || j.Items || [];
              tip = `JSON ✅ kayıt:${it.length}`;
              if (it.length) ek = ' alanlar: ' + Object.keys(it[0]).join(',') + ' | ilk: ' + JSON.stringify(it[0]);
        } catch(e) { tip = 'JSON değil'; }
      }
      console.log(`${ad} -> HTTP ${r.status} | ${tip}${ek}`);
      if (html || tip === 'JSON değil') console.log('   ilk 120: ' + t.replace(/\s+/g,' ').slice(0,120));
    } catch (e) {
      console.log(`${ad} -> BAĞLANTI HATASI: ${e.message}`);
    }
  }
})();
