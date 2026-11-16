// Danışman Takip yönetim çağrısı (A1). Anahtar YALNIZ ortamdan (GitHub secret YONETIM_ANAHTARI) okunur,
// POST gövdesinde gider; URL'ye, loga ya da dosyaya yazılmaz.
// Geçiş uyumu: sunucu henüz A1 öncesi sürümdeyse POST "bilinmeyen action" döner; o zaman eski
// GET çağrısı (açık anahtar, yönetim anahtarı YOK) bir kez denenir. A1 canlıya çıkınca bu yedek
// yol sunucuda "unauthorized" döner ve hiçbir şey yapmaz; A1 oturduktan sonra silinecek (GECIS_YEDEGI).
// Kullanım: node scripts/dt-yonetim.js <action> ad=deger ...   (cevap JSON'u stdout'a)
const DT = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec';
const ACIK = 'dogus-performans';   // eski sunucunun okuma anahtarı (zaten herkese açık; yönetim anahtarı değil)
const GECIS_YEDEGI = true;

async function yonetim(action, params = {}) {
  const y = String(process.env.YONETIM_ANAHTARI || '').replace(/\s+/g, '');
  const govde = Object.assign({}, params, { action, y });
  const r = await fetch(DT, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(govde) });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (GECIS_YEDEGI && j && j.error === 'bilinmeyen action') {
    const q = new URLSearchParams(Object.assign({}, params, { action, k: ACIK }));
    const g = await fetch(DT + '?' + q.toString(), { redirect: 'follow' });
    const gt = await g.text();
    try { return JSON.parse(gt); } catch (e) { return { error: 'json değil', ham: gt.slice(0, 200) }; }
  }
  return j || { error: 'json değil', ham: t.slice(0, 200) };
}
module.exports = { yonetim, DT, ACIK };

if (require.main === module) {
  const [action, ...rest] = process.argv.slice(2);
  const p = {}; for (const a of rest) { const i = a.indexOf('='); if (i > 0) p[a.slice(0, i)] = a.slice(i + 1); }
  yonetim(action, p).then((j) => console.log(JSON.stringify(j))).catch((e) => { console.log(JSON.stringify({ error: e.message })); process.exitCode = 1; });
}
