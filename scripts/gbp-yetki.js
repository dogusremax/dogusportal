// Business Profile API için bir kerelik izin alır (yerelde çalıştırılır, GitHub'da değil).
// Kullanım: node scripts/gbp-yetki.js ~/Downloads/client_secret_....json
// Tarayıcıda "İzin ver" denince ~/.config/dogus-gbp/kimlik.json yazılır (client_id, client_secret, refresh_token).
// Bu dosyanın içeriği GitHub'da GOOGLE_PLACES_KEY secret'ına konur; scripts/google-yorum.js onu okur.
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const dosya = process.argv[2];
if (!dosya) { console.error('Kullanım: node scripts/gbp-yetki.js client_secret.json'); process.exit(1); }
const c = JSON.parse(fs.readFileSync(dosya, 'utf8')).installed;
const HEDEF = path.join(os.homedir(), '.config/dogus-gbp/kimlik.json');

const sunucu = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  const kod = u.searchParams.get('code');
  if (!kod) { res.end(u.searchParams.get('error') || 'Bekleniyor'); return; }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: kod, client_id: c.client_id, client_secret: c.client_secret,
      redirect_uri: yonlendirme, grant_type: 'authorization_code',
    }),
  });
  const t = await r.json();
  if (!t.refresh_token) {
    res.end('Hata: refresh token gelmedi. Terminale bakın.');
    console.error('Token hatası:', t.error, t.error_description);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(HEDEF), { recursive: true });
  fs.writeFileSync(HEDEF, JSON.stringify({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: t.refresh_token }), { mode: 0o600 });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<h2 style="font-family:sans-serif">Tamam! İzin alındı, bu sekmeyi kapatabilirsiniz.</h2>');
  console.log('İzin alındı, kaydedildi:', HEDEF);
  sunucu.close();
});

let yonlendirme;
sunucu.listen(0, '127.0.0.1', () => {
  yonlendirme = `http://127.0.0.1:${sunucu.address().port}`;
  const q = new URLSearchParams({
    client_id: c.client_id, redirect_uri: yonlendirme, response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline', prompt: 'consent', login_hint: 'umuttokkus80@gmail.com',
  });
  console.log('IZIN_URL https://accounts.google.com/o/oauth2/v2/auth?' + q);
});
