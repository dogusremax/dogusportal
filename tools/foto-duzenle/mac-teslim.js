// RE/MAX Doğuş · Fotoğraf Düzenle — Mac teslim betiği (osascript -l JavaScript).
// LaunchAgent dakikada bir çalıştırır: Windows'ta (UMT) biten işleri danisman-takip FotoDuzenle.js'ten
// alır, Masaüstü'ne iş adıyla klasör açıp fotoğrafları koyar ve "İşlem bitti" bildirimi gösterir.
// Anahtar repoda durmaz: ~/Library/Application Support/DogusFoto/anahtar (mac-kur.sh yazar).
ObjC.import('Foundation');
const app = Application.currentApplication(); app.includeStandardAdditions = true;
const SERVIS = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec';
const EV = $.NSHomeDirectory().js, DIZIN = EV + '/Library/Application Support/DogusFoto', MASAUSTU = EV + '/Desktop';
const fm = $.NSFileManager.defaultManager;

function oku(yol) { const s = $.NSString.stringWithContentsOfFileEncodingError(yol, $.NSUTF8StringEncoding, null); return s.isNil() ? '' : s.js; }
function yaz(yol, metin) { $(metin).writeToFileAtomicallyEncodingError(yol, true, $.NSUTF8StringEncoding, null); }
function q(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
function log(m) { app.doShellScript('echo ' + q(new Date().toISOString() + ' ' + m) + ' >> ' + q(DIZIN + '/teslim.log')); }
function servis(govde) {
  const gir = DIZIN + '/istek.json', cik = DIZIN + '/yanit.json';
  yaz(gir, JSON.stringify(govde));
  app.doShellScript('curl -sSL --max-time 180 --retry 2 -H "Content-Type: text/plain" --data-binary @' + q(gir) + ' -o ' + q(cik) + ' ' + q(SERVIS));
  return JSON.parse(oku(cik));
}
function varMi(yol) { return fm.fileExistsAtPath(yol); }

function calis() {
  const k = oku(DIZIN + '/anahtar').trim();
  if (!k) { log('anahtar yok'); return; }
  const r = servis({ action: 'fdTeslimBekleyen', k });
  if (!r.success) { log('hata: ' + r.error); return; }
  (r.liste || []).forEach(is => {
    if (!is.dosyalar || !is.dosyalar.length) return;
    // Aynı adda başka bir klasör varsa "(2)" ekle; yarım kalmış aynı iş ise onu kullan
    let ad = String(is.ad || 'Fotoğraflar').replace(/[\/:]/g, ' ').trim() || 'Fotoğraflar', hedef = MASAUSTU + '/' + ad, n = 2;
    while (varMi(hedef) && !varMi(hedef + '/.dogus-' + is.is)) hedef = MASAUSTU + '/' + ad + ' (' + (n++) + ')';
    fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(hedef, true, $(), null);
    yaz(hedef + '/.dogus-' + is.is, is.is);
    let tamam = 0;
    is.dosyalar.forEach(d => {
      const dosya = hedef + '/' + String(d.ad).replace(/[\/:]/g, ' ');
      if (varMi(dosya)) { tamam++; return; }
      const j = servis({ action: 'fdIndir', k, is: is.is, no: d.no, tur: 'out' });
      if (!j.success) { log(is.is + ' ' + d.no + ': ' + j.error); return; }
      const veri = $.NSData.alloc.initWithBase64EncodedStringOptions(j.veri, 0);
      if (veri.isNil() || !veri.writeToFileAtomically(dosya, true)) { log(is.is + ' ' + d.no + ': yazılamadı (Masaüstü izni?)'); return; }
      tamam++;
    });
    if (tamam !== is.dosyalar.length) { log(is.is + ': ' + tamam + '/' + is.dosyalar.length + ', sonra tekrar denenecek'); return; }
    fm.removeItemAtPathError(hedef + '/.dogus-' + is.is, null);
    servis({ action: 'fdTeslimEdildi', k, is: is.is, yol: hedef.replace(EV, '~') });
    const klasorAdi = hedef.split('/').pop();
    app.displayNotification('"' + klasorAdi + '" klasörü masaüstünde, ' + tamam + ' fotoğraf.', { withTitle: 'İşlem bitti ✅', subtitle: 'RE/MAX Doğuş · Fotoğraf Düzenle', soundName: 'Glass' });
    log(is.is + ' teslim: ' + hedef);
  });
}
function run() { try { calis(); } catch (e) { log('çöktü: ' + e); } }
