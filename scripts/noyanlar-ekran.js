// Ekran görüntüsü: varsayılan 360.noyanlar.com; SAYFA verilirse o adres (önizleme kontrolü için)
// SAYFA: "url|ad|bekle_ms|js" öğeleri, ';' ile ayrılır
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-gpu-rasterization', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const isler = (process.env.SAYFA || 'https://360.noyanlar.com/|noyanlar|25000|').split(';').filter(Boolean);
  for (const is of isler) {
    const [url, ad, bekle, js] = is.split('|');
    for (const [cihaz, opt] of [['masaustu', { viewport: { width: 1440, height: 860 } }], ['telefon', devices['iPhone 13']]]) {
      const ctx = await b.newContext(opt), p = await ctx.newPage();
      p.on('console', m => console.log(cihaz, ad, m.type(), m.text()));
      p.on('pageerror', e => console.log(cihaz, ad, 'PAGEERR', e.message));
      p.on('requestfailed', r => console.log(cihaz, ad, 'FAIL', r.url().slice(0, 140), r.failure() && r.failure().errorText));
      await p.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(e => console.log(e.message));
      await p.waitForTimeout(+bekle || 12000);
      if (js) { await p.evaluate(js).catch(e => console.log('JS', e.message)); await p.waitForTimeout(5000); }
      await p.screenshot({ path: `noyanlar-veri/ekran-${ad}-${cihaz}.png` });
      await ctx.close();
    }
  }
  await b.close();
})();
