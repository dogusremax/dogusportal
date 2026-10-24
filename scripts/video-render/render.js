// Video Düzenle — bulutta yüksek kalite çıktı (video-render.yml çalıştırır).
// 1) Videoyu ve düzenleme bilgisini Danışman Takip'ten (Drive) alır.
// 2) Videoyu dik, SDR, sabit 30 kare/sn h264'e çevirir (HDR iPhone videoları da).
// 3) Kişi gerekiyorsa her kare için Robust Video Matting ile saç teli seviyesinde alfa maskesi çıkarır.
// 4) video-duzenle.html'i başsız Chromium'da açar, aynı motorla kare kare işletir.
// 5) Sonucu x264 ile yeniden kodlar, AAC ses, parça parça geri yükler.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync, spawn } = require('child_process');

const IS = process.env.IS, K = process.env.PORTAL_ANAHTAR;
const DT = process.env.DT_URL || 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec';
const KOK = path.resolve(__dirname, '../..'), IS_DIR = path.join(process.env.RUNNER_TEMP || '/tmp', 'vr-' + IS);
const PARCA = 4 * 1024 * 1024;
if (!/^[a-z0-9]{6,32}$/.test(IS || '') || !K) { console.log('IS / PORTAL_ANAHTAR eksik'); process.exit(1); }
fs.mkdirSync(IS_DIR, { recursive: true });

/* deneme modu (iş kimliği "deneme…"): depodaki örnek video ve deneme-proje.json ile çalışır, Drive'a dokunmaz */
const DENEME = /^deneme/.test(IS) ? (process.env.DENEME_VIDEO || path.join(KOK, 'assets/nobet-video/gizem.mp4')) : null;
async function istek(govde, deneme = 0) {
  if (DENEME) { if (govde.veri == null) console.log('[deneme] durum', govde.durum || '', govde.mesaj || ''); return { success: true }; }
  try {
    const r = await fetch(DT, { method: 'POST', body: JSON.stringify(Object.assign({ k: K, is: IS }, govde)) });
    const j = await r.json(); if (!j.success) throw new Error(j.error || 'hata');
    return j;
  } catch (e) {
    if (deneme >= 4) throw e;
    await new Promise(ok => setTimeout(ok, 2000 * (deneme + 1)));
    return istek(govde, deneme + 1);
  }
}
let sonDurum = 0;
async function durum(mesaj, yuzde, zorla) {
  console.log(new Date().toISOString().slice(11, 19), mesaj, yuzde != null ? Math.round(yuzde) + '%' : '');
  if (!zorla && Date.now() - sonDurum < 6000) return;
  sonDurum = Date.now();
  try { await istek({ action: 'vrIsYaz', durum: 'isleniyor', mesaj, yuzde: yuzde || 0 }); } catch (e) { console.log('durum yazılamadı', e.message); }
}
async function indir(no) {
  if (DENEME) {
    if (no === 'proje') return fs.readFileSync(path.join(__dirname, 'deneme-proje.json'));
    const v = fs.readFileSync(DENEME); return no * PARCA < v.length ? v.subarray(no * PARCA, (no + 1) * PARCA) : null;
  }
  for (let d = 0; d < 5; d++) {
    try {
      const r = await fetch(`${DT}?action=vrIndir&k=${encodeURIComponent(K)}&is=${IS}&no=${no}`);
      const t = (await r.text()).trim();
      if (t === 'yok') return null;
      if (t === 'yetki') throw new Error('yetki');
      return Buffer.from(t, 'base64');
    } catch (e) { if (e.message === 'yetki' || d === 4) throw e; await new Promise(ok => setTimeout(ok, 3000)); }
  }
}
function ff(args) { execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' }); }
function probe(f) {
  return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f]).toString());
}

async function ana() {
  if (DENEME) {
    /* canlı uçların kontrolü: anahtar doğru mu, Danışman Takip yeni sürümde mi */
    try {
      const g = await (await fetch(`${DT}?action=vrIndir&k=${encodeURIComponent(K)}&is=${IS}&no=0`)).text();
      const p = await (await fetch(DT, { method: 'POST', body: JSON.stringify({ action: 'vrIsYaz', k: K, is: IS, durum: 'deneme', mesaj: 'uç kontrolü' }) })).text();
      console.log('[deneme] vrIndir:', g.slice(0, 40), '| vrIsYaz:', p.slice(0, 120));
    } catch (e) { console.log('[deneme] uç kontrolü hatası', e.message); }
  }
  await durum('Sunucu hazır, video alınıyor', 1, true);
  const proje = JSON.parse((await indir('proje')).toString());
  const parcalar = [];
  for (let i = 0; ; i++) { const b = await indir(i); if (!b) break; parcalar.push(b); await durum('Video alınıyor', 1 + i); }
  if (!parcalar.length) throw new Error('video bulunamadı');
  const ham = path.join(IS_DIR, 'ham'), duz = path.join(IS_DIR, 'duz.mp4');
  fs.writeFileSync(ham, Buffer.concat(parcalar));

  /* dik, SDR, sabit 30 kare/sn */
  const p = probe(ham), vs = p.streams.find(s => s.codec_type === 'video');
  if (!vs) throw new Error('dosyada video yok');
  const hdr = /arib-std-b67|smpte2084/.test(vs.color_transfer || '');
  const vf = [];
  if (hdr) vf.push('zscale=t=linear:npl=203', 'format=gbrpf32le', 'zscale=p=bt709', 'tonemap=tonemap=mobius:desat=0', 'zscale=t=bt709:m=bt709:r=tv');
  if (proje.yonEk === 90) vf.push('transpose=1'); else if (proje.yonEk === 270) vf.push('transpose=2'); else if (proje.yonEk === 180) vf.push('hflip,vflip');
  vf.push('fps=30', 'format=yuv420p');
  const sesVar = p.streams.some(s => s.codec_type === 'audio');
  await durum('Video hazırlanıyor' + (hdr ? ' (HDR renkleri dönüştürülüyor)' : ''), 5, true);
  ff(['-i', ham, '-vf', vf.join(','), '-c:v', 'libx264', '-preset', 'fast', '-crf', '12', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      ...(sesVar ? ['-c:a', 'aac', '-b:a', '256k'] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:a', 'aac']), '-movflags', '+faststart', duz]);
  const sure = +probe(duz).format.duration;

  /* kişi maskesi */
  let maske = null;
  if (proje.kisi) {
    maske = path.join(IS_DIR, 'maske.mp4');
    await durum('Kişi ayrılıyor (saç teli seviyesinde)', 8, true);
    const toplamKare = Math.round(sure * 30);
    await new Promise((ok, no) => {
      const c = spawn('python3', [path.join(__dirname, 'matte.py'), duz, maske, path.join(IS_DIR, '..', 'rvm.onnx')], { stdio: ['ignore', 'pipe', 'inherit'] });
      c.stdout.on('data', d => {
        const m = String(d).match(/(\d+) kare/); process.stdout.write(d);
        if (m) durum('Kişi ayrılıyor (saç teli seviyesinde)', 8 + 52 * Math.min(1, +m[1] / toplamKare));
      });
      c.on('exit', k => k === 0 ? ok() : no(new Error('maske çıkarılamadı (' + k + ')')));
    });
  }

  /* sayfayı başsız tarayıcıda çalıştır */
  const sunucu = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const f = u === '/duz.mp4' ? duz : u === '/maske.mp4' ? maske : path.join(KOK, path.normalize(u));
    if (!f || !(f === duz || f === maske || f.startsWith(KOK + path.sep)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end(); return; }
    const tur = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream';
    const boy = fs.statSync(f).size, r = q.headers.range;
    if (r) {
      const [a, b] = r.replace('bytes=', '').split('-'), bas = +a, son = b ? +b : boy - 1;
      s.writeHead(206, { 'Content-Type': tur, 'Content-Range': `bytes ${bas}-${son}/${boy}`, 'Accept-Ranges': 'bytes', 'Content-Length': son - bas + 1 });
      fs.createReadStream(f, { start: bas, end: son }).pipe(s);
    } else { s.writeHead(200, { 'Content-Type': tur, 'Content-Length': boy, 'Accept-Ranges': 'bytes' }); fs.createReadStream(f).pipe(s); }
  }).listen(8799);

  /* gerçek Chrome: h264 çözme ve kodlama ondadır (Playwright'ın kendi Chromium'unda yok) */
  const tarayici = await chromium.launch({ channel: process.env.CHROME_KANAL === 'yok' ? undefined : 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const sayfa = await tarayici.newPage({ viewport: { width: 1280, height: 900 } });
  sayfa.on('pageerror', e => console.log('SAYFA HATASI', e.message));
  sayfa.on('console', m => { if (/hata|error|pro /i.test(m.text())) console.log('SAYFA', m.text().slice(0, 300)); });
  await sayfa.route('**/assets/broker.js', r => r.fulfill({ body: 'window.brokerKapi=function(){};window.brokerPinAl=function(){return ""};', contentType: 'text/javascript' }));
  await sayfa.addInitScript(() => { window.renderModu = true; try { localStorage.clear(); } catch (e) {} });
  await sayfa.goto('http://localhost:8799/video-duzenle.html');
  await sayfa.setInputFiles('#dosya', duz);
  await sayfa.waitForFunction(() => video.readyState >= 2 && video.videoWidth > 0, null, { timeout: 120000 });
  /* kişi maskesi düzenleme yüklenmeden önce bağlanır: tarayıcıdaki kişi ayırma hiç çalışmaz */
  if (maske) await sayfa.evaluate(() => hariciMaskeKur('/maske.mp4'));
  await sayfa.evaluate(async (pr) => {
    projeYukle(pr); kesimler = Array.isArray(pr.kesimler) ? pr.kesimler : [];
    /* resimler yüklensin */
    const srcler = [];
    (function topla(x) { if (!x || typeof x !== 'object') return; for (const k in x) { const v = x[k]; if (typeof v === 'string' && /^data:image\//.test(v)) srcler.push(v); else if (typeof v === 'object') topla(v); } })(pr);
    await Promise.all(srcler.map(s => new Promise(ok => { const im = resimAl(s); if (im) return ok(); const i2 = resimOnbellek[s]; i2.addEventListener('load', ok, { once: true }); i2.addEventListener('error', ok, { once: true }); setTimeout(ok, 15000); })));
    if (document.fonts) { await document.fonts.ready; }
  }, proje);
  /* gürültü temizleme modeli */
  await sayfa.evaluate(async () => {
    const b = sesHazirla();
    if (ses.gurultu && b) { rnnHazirla(); for (let i = 0; i < 100 && !(b.rnnDurum === 'hazir' || b.rnnDurum === 'hata'); i++) await new Promise(ok => setTimeout(ok, 200)); }
  });
  await durum('Efektler işleniyor', 60, true);
  await sayfa.evaluate(() => { window.renderHata = null; disaAktarPro().catch(e => { window.renderHata = String(e && e.message || e); }); });
  for (;;) {
    await new Promise(ok => setTimeout(ok, 3000));
    const d = await sayfa.evaluate(() => ({ bitti: !!window.renderSonuc, hata: window.renderHata, metin: f('indirDurum').textContent }));
    if (d.hata) throw new Error('işleme hatası: ' + d.hata);
    if (d.bitti) break;
    const m = d.metin.match(/%(\d+)/);
    await durum('Efektler işleniyor', 60 + (m ? +m[1] * .3 : 0));
  }
  const ara = path.join(IS_DIR, 'sayfa.mp4'), yaz = fs.createWriteStream(ara);
  await sayfa.exposeFunction('parcaYaz', b => new Promise(ok => yaz.write(Buffer.from(b, 'base64'), ok)));
  await sayfa.evaluate(async () => {
    const b = window.renderSonuc, P = 6 * 1024 * 1024;
    for (let i = 0; i < b.size; i += P) {
      const v = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(b.slice(i, i + P)); });
      await window.parcaYaz(v);
    }
  });
  await new Promise(ok => yaz.end(ok));
  await tarayici.close(); sunucu.close();

  /* son kodlama: x264 yüksek kalite + AAC, hızlı başlatma */
  await durum('Son kalite kodlaması', 92, true);
  const son = path.join(IS_DIR, 'sonuc.mp4');
  ff(['-i', ara, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', son]);

  /* geri yükle */
  const veri = fs.readFileSync(son), n = Math.ceil(veri.length / PARCA);
  for (let i = 0; i < n; i++) {
    await istek({ action: 'vrIsYaz', no: i, veri: veri.subarray(i * PARCA, (i + 1) * PARCA).toString('base64') });
    await durum('Sonuç gönderiliyor', 95 + 5 * (i + 1) / n);
  }
  await istek({ action: 'vrIsYaz', durum: 'hazir', mesaj: 'Hazır', yuzde: 100, sonucParca: n, boyut: veri.length, sure });
  if (DENEME) fs.copyFileSync(son, path.join(process.env.RUNNER_TEMP || '/tmp', 'deneme-sonuc.mp4'));
  console.log('TAMAM', n, 'parça', (veri.length / 1048576).toFixed(1), 'MB');
}

ana().catch(async e => {
  console.log('HATA', e && e.stack || e);
  try { await istek({ action: 'vrIsYaz', durum: 'hata', mesaj: String(e && e.message || e).slice(0, 200) }); } catch (e2) {}
  process.exit(1);
});
