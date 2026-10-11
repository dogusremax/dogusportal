// 360.noyanlar.com'un masaüstü ve telefon ekran görüntüleri (inceleme için)
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const runs = [['masaustu', { viewport: { width: 1440, height: 860 } }], ['telefon', devices['iPhone 13']]];
  for (const [ad, opt] of runs) {
    const ctx = await b.newContext(opt), p = await ctx.newPage();
    await p.goto('https://360.noyanlar.com/', { waitUntil: 'load', timeout: 60000 }).catch(e => console.log(e.message));
    await p.waitForTimeout(25000);
    await p.screenshot({ path: `noyanlar-veri/ekran-${ad}.png` });
    // menüyü açmayı dene
    await p.mouse.click(60, 45).catch(() => {});
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `noyanlar-veri/ekran-${ad}-menu.png` });
    await ctx.close();
  }
  await b.close();
})();
