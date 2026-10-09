// Umut'a e-posta (Danışman Takip yorumBildir; alıcı orada sabit). Kullanım: node scripts/bildir.js "<konu>" <metin-dosyası>
const fs = require('fs');
const URL = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec';
(async () => {
  const metin = fs.readFileSync(process.argv[3], 'utf8');
  const r = await fetch(URL, { method: 'POST', redirect: 'follow', body: JSON.stringify({ action: 'yorumBildir', k: 'dogus-performans', konu: process.argv[2], metin }) });
  const t = await r.text();
  console.log('Bildirim:', t.slice(0, 200));
  if (!/"success":\s*true/.test(t)) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
