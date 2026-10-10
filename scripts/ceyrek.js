// Çeyrek şampiyonları: biten çeyreğin gönderi (1080x1440) ve story (1080x1920) görsellerini üretir
// → performans/ceyrek/YYYY-Qn/{gonderi,story}_N.jpg + performans/ceyrek/.media (yayın listesi).
// Story kapağı videodur: kupa 360° döner (assets/kupa-360 kareleri) → story_1.mp4.
// Kullanım: node scripts/ceyrek.js [YYYY-Qn]  (boş = son tamamlanan çeyrek, Türkiye saatiyle)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const RAW = 'https://raw.githubusercontent.com/dogusremax/dogusportal/main/';
const SITE = 'https://dogusportal.com/';   // video, Instagram'ın doğru içerik türüyle alabilmesi için Pages'ten verilir
const BASE = process.env.CEYREK_BASE || SITE;
// Story kapağındaki sabit kupayı gizleyip zemini çeker, dönen kupa karelerini aynı yere bindirir (24 fps, 3 tur = 9 sn)
async function kupaVideo(page, slide, hedef) {
  const kutu = await slide.evaluate(el => {
    const k = el.querySelector('[data-kupa=kapak]'); if (!k) return null;
    const s = el.getBoundingClientRect(), r = k.getBoundingClientRect();
    k.querySelector('img').style.visibility = 'hidden';
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height, sw: s.width };
  });
  if (!kutu) return false;
  const zemin = hedef.replace(/\.mp4$/, '_zemin.png');
  await slide.screenshot({ path: zemin });
  await slide.evaluate(el => { el.querySelector('[data-kupa=kapak] img').style.visibility = ''; });
  const k = 1080 / kutu.sw, H = Math.round(kutu.h * k * 1.04), alt = Math.round((kutu.y + kutu.h) * k) + 4, ox = Math.round((kutu.x + kutu.w / 2) * k);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '24', '-i', zemin,
    '-stream_loop', '2', '-framerate', '24', '-i', 'assets/kupa-360/%03d.png',
    '-filter_complex', `[0:v]scale=1080:1920[z];[1:v]scale=-1:${H}:flags=lanczos[k];[z][k]overlay=x=${ox}-w/2:y=${alt}-h:shortest=1,format=yuv420p`,
    '-c:v', 'libx264', '-crf', '18', '-r', '24', '-movflags', '+faststart', hedef]);
  fs.unlinkSync(zemin);
  return true;
}
function bitenCeyrek() {
  const ay = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }).slice(0, 7);
  const y = +ay.slice(0, 4), q = Math.floor((+ay.slice(5) - 1) / 3);
  return q === 0 ? `${y - 1}-Q4` : `${y}-Q${q}`;
}
(async () => {
  const q = process.argv[2] || bitenCeyrek();
  if (!/^\d{4}-Q[1-4]$/.test(q)) throw new Error('Geçersiz çeyrek: ' + q);
  try { const pub = JSON.parse(fs.readFileSync('performans/ceyrek/.pub', 'utf8')); if (pub.q === q && pub.tamam) { console.log('Zaten yayınlanmış, atlandı:', q); return; } } catch (e) {}
  const out = path.join('performans', 'ceyrek', q); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const media = { q, caption: '', gonderi: [], story: [] };
  for (const [tur, ek] of [['gonderi', ''], ['story', '&fmt=story']]) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1080 / 420 });
    await page.addInitScript(() => sessionStorage.setItem('perfAuth', 'ok'));
    await page.goto(`${BASE}performans-gorsel.html?set=birinci&donem=ceyrek&ay=${q}${ek}&cb=${Date.now()}`, { waitUntil: 'networkidle' });
    try { await page.waitForSelector('body[data-ready]', { timeout: 180000 }); }
    catch (e) { throw new Error(`${tur} sayfası hazır olmadı: ${await page.textContent('#status').catch(() => '?')}`); }
    await page.waitForTimeout(1500);
    if (!media.caption) media.caption = await page.evaluate(() => igCaption());
    const slides = await page.$$('.slide');
    if (slides.length < 2) throw new Error(`${tur}: yetersiz slayt (${slides.length})`);
    for (let i = 0; i < Math.min(slides.length, 10); i++) {   // Instagram carousel en fazla 10
      const f = path.join(out, `${tur}_${i + 1}.jpg`);
      await slides[i].screenshot({ path: f, type: 'jpeg', quality: 95 });
      const v = f.replace(/\.jpg$/, '.mp4');
      if (tur === 'story' && i === 0 && await kupaVideo(page, slides[i], v)) { media[tur].push(SITE + v.replace(/\\/g, '/')); console.log('✓', q, tur, 1, '(video)'); continue; }
      media[tur].push(RAW + f.replace(/\\/g, '/'));
      console.log('✓', q, tur, i + 1);
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync('performans/ceyrek/.media', JSON.stringify(media, null, 1));
})().catch(e => { console.error(e.message || e); process.exit(1); });
