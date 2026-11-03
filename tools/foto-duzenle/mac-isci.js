// RE/MAX Doğuş · Fotoğraf Düzenle — Mac işçisi (osascript -l JavaScript). Windows (UMT) işçisinin yerine, 2026-11-03.
// LaunchAgent dakikada bir çalıştırır (launchd aynı anda ikinci kopyayı açmaz). Sıradaki işi danisman-takip
// FotoDuzenle.js'ten alır, her fotoğrafı Mac'teki Chrome'da ChatGPT'ye (yeni sohbet, arka sekme) prompt.txt ile
// BİREBİR gönderir: metin dosyadan okunur, olduğu gibi yapıştırılır, önüne/arkasına hiçbir şey eklenmez.
// Sonuç ChatGPT'nin kendi dosya servisinden alınır, merkezden 4:3 kırpılıp 1600x1200 JPEG yapılır ve geri yüklenir.
// Biten klasörü mac-teslim.js Masaüstü'ne indirir. Gereken: Chrome > Görünüm > Geliştirici > "Apple Events'ten
// JavaScript'e izin ver" açık, Chrome'da chatgpt.com oturumu açık.
// Dosyalar: ~/Library/Application Support/DogusFoto/ (anahtar, prompt.txt, isci.log, is/<iş>/)
// Deneme: osascript -l JavaScript mac-isci.js test <girdi foto> <çıktı.jpg>
ObjC.import('Foundation');
const app = Application.currentApplication(); app.includeStandardAdditions = true;
const SERVIS = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec';
const EV = $.NSHomeDirectory().js, DIZIN = EV + '/Library/Application Support/DogusFoto';
const PROMPT_SHA = 'd6b8ce31fa3c4463268e8bf15374847c472d31703daa9b7715bb1110f097a8f8';
const fm = $.NSFileManager.defaultManager;
const PARCA = 200000;

function oku(yol) { const s = $.NSString.stringWithContentsOfFileEncodingError(yol, $.NSUTF8StringEncoding, null); return s.isNil() ? '' : s.js; }
function yaz(yol, metin) { $(metin).writeToFileAtomicallyEncodingError(yol, true, $.NSUTF8StringEncoding, null); }
function varMi(yol) { return fm.fileExistsAtPath(yol); }
function sil(yol) { fm.removeItemAtPathError(yol, null); }
function klasor(yol) { fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(yol, true, $(), null); }
function q(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
function sh(k) { return app.doShellScript(k); }
function log(m) { try { sh('echo ' + q(new Date().toISOString() + ' ' + m) + ' >> ' + q(DIZIN + '/isci.log')); } catch (e) {} }
function bekle(sn) { delay(sn); }

let ANAHTAR = '';
function servis(govde) {
  govde.k = ANAHTAR;
  const gir = DIZIN + '/istek-isci.json', cik = DIZIN + '/yanit-isci.json';
  yaz(gir, JSON.stringify(govde));
  sh('curl -sSL --max-time 300 --retry 2 -H "Content-Type: text/plain; charset=utf-8" --data-binary @' + q(gir) + ' -o ' + q(cik) + ' ' + q(SERVIS));
  const j = JSON.parse(oku(cik)); sil(gir); sil(cik); return j;
}
function durum(is, alanlar) { const g = Object.assign({ action: 'fdIsYaz', is }, alanlar); servis(g); }

// ---------------- Chrome (Umut'un Chrome'u, ayrı arka sekme) ----------------
let chrome = null, sekmeId = null;
function sekmeBul() {
  const ws = chrome.windows();
  for (let i = 0; i < ws.length; i++) { const ts = ws[i].tabs(); for (let k = 0; k < ts.length; k++) if (ts[k].id() === sekmeId) return ts[k]; }
  throw new Error('ChatGPT sekmesi kapandı');
}
function JS(kod) {
  let r;
  try { r = sekmeBul().execute({ javascript: kod }); }
  catch (e) {
    if (/JavaScript/i.test(String(e)) && /Apple/i.test(String(e))) throw new Error('APPLE_JS');
    throw e;
  }
  return r;
}
function sekmeAc(url) {
  chrome = Application('Google Chrome');
  if (!chrome.running()) { chrome.launch(); bekle(5); }
  if (!chrome.windows().length) { chrome.Window().make(); bekle(2); }
  const w = chrome.windows[0], once = w.activeTabIndex();
  const t = chrome.Tab({ url }); w.tabs.push(t); bekle(1);
  const ts = w.tabs(); sekmeId = ts[ts.length - 1].id();
  try { if (once) w.activeTabIndex = once; } catch (e) {} // Umut'un sekmesi önde kalsın
}
function sekmeKapat() { try { if (sekmeId != null) sekmeBul().close(); } catch (e) {} sekmeId = null; }
// Sayfada async iş başlatır, sonucu window.__fdR'de bekler
function JSAsync(govde, saniye) {
  JS('window.__fdR=null;(async()=>{try{window.__fdR=JSON.stringify({ok:true,v:await (async()=>{' + govde + '})()})}catch(e){window.__fdR=JSON.stringify({ok:false,e:String(e&&e.message||e)})}})();1');
  const son = Date.now() + saniye * 1000;
  while (Date.now() < son) {
    bekle(1);
    const r = JS('window.__fdR');
    if (r && typeof r === 'string') { const j = JSON.parse(r); if (!j.ok) throw new Error(j.e); return j.v; }
  }
  throw new Error('sayfa yanıt vermedi');
}
function sayfayaKoy(ad, metin) {
  JS('window.' + ad + '=""');
  for (let i = 0; i < metin.length; i += PARCA) JS('window.' + ad + '+=' + JSON.stringify(metin.slice(i, i + PARCA)) + ';1');
  if (JS('window.' + ad + '.length') !== metin.length) throw new Error('veri sayfaya aktarılamadı');
}
function sayfadanAl(ad) {
  const n = JS('window.' + ad + '.length'); let s = '';
  for (let i = 0; i < n; i += PARCA) s += JS('window.' + ad + '.slice(' + i + ',' + (i + PARCA) + ')');
  if (s.length !== n) throw new Error('sonuç sayfadan alınamadı');
  return s;
}

// ---------------- ChatGPT: tek fotoğraf ----------------
const EDITOR = "document.querySelector('#prompt-textarea, div.ProseMirror[contenteditable=true]')";
const GONDER = "document.querySelector('[data-testid=\"send-button\"], button[aria-label=\"Gönder\"], button[aria-label=\"Send prompt\"], button[aria-label=\"Send\"]')";
const GIRIS = "(document.querySelector('[data-testid=\"login-button\"]') || [...document.querySelectorAll('a,button')].some(b => /^(Oturum aç|Giriş yap|Log in)$/i.test(b.innerText.trim())))";
const norm = s => String(s).replace(/\s+/g, '');

function chatgptDuzenle(girdiJpg, cikisJpg, prompt) {
  sekmeAc('https://chatgpt.com/');
  try {
    let hazir = '';
    for (let i = 0; i < 90 && !hazir; i++) {
      bekle(1);
      try { hazir = JS("(() => { if (" + EDITOR + " && !" + GIRIS + ") return 'ok'; if (document.readyState === 'complete' && " + GIRIS + ") return 'giris'; return ''; })()") || ''; }
      catch (e) { if (String(e.message) === 'APPLE_JS') throw e; }
    }
    if (hazir === 'giris') throw new Error('GIRIS');
    if (!hazir) throw new Error('ChatGPT sayfası açılmadı');
    bekle(2);
    // 1) fotoğrafı ekle (önce yapıştırma, olmazsa dosya alanı)
    sayfayaKoy('__fdIn', sh('base64 -i ' + q(girdiJpg) + " | tr -d '\\n'"));
    const ek = JS(`(() => {
      const b = atob(window.__fdIn), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      const f = new File([u], 'foto.jpg', { type: 'image/jpeg' }); window.__fdFile = f;
      const e = ${EDITOR}; const dt = new DataTransfer(); dt.items.add(f);
      e.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      return 'ok'; })()`);
    const ekVar = "(() => { const e = " + EDITOR + "; const f = e && (e.closest('form') || e.parentElement.parentElement.parentElement); return !!(f && f.querySelector('img, [data-testid*=attachment], [class*=attachment]')); })()";
    let eklendi = false;
    for (let i = 0; i < 8 && !eklendi; i++) { bekle(1); eklendi = !!JS(ekVar); }
    if (!eklendi) {
      JS(`(() => { const inp = document.querySelector('input[type=file][accept*="image"]') || document.querySelector('input[type=file]');
        const dt = new DataTransfer(); dt.items.add(window.__fdFile); inp.files = dt.files;
        inp.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`);
      for (let i = 0; i < 10 && !eklendi; i++) { bekle(1); eklendi = !!JS(ekVar); }
    }
    if (!eklendi) throw new Error('Fotoğraf ChatGPT\'ye eklenemedi');
    JS('window.__fdIn=null;1');
    // 2) prompt: dosyadan okunur, olduğu gibi yazılır; editördeki metin dosyayla (boşluklar hariç) birebir tutmazsa gönderilmez
    sayfayaKoy('__fdPrompt', prompt);
    let tuttu = false;
    for (const yol of ['yapistir', 'yaz']) {
      JS("(() => { const e = " + EDITOR + "; e.focus(); document.execCommand('selectAll'); document.execCommand('delete'); return 1; })()");
      if (yol === 'yapistir') JS("(() => { const e = " + EDITOR + "; const dt = new DataTransfer(); dt.setData('text/plain', window.__fdPrompt); e.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return 1; })()");
      else JS("(() => { const e = " + EDITOR + "; e.focus(); document.execCommand('insertText', false, window.__fdPrompt); return 1; })()");
      bekle(2);
      const a1 = norm(JS(EDITOR + '.innerText')), a2 = norm(prompt);
      if (a1 === a2) { tuttu = true; break; }
      let k = 0; while (k < Math.min(a1.length, a2.length) && a1[k] === a2[k]) k++;
      log('  prompt farkı (' + yol + '): editör ' + a1.length + ' / dosya ' + a2.length + ', ilk fark ' + k + ": '" + a1.substr(Math.max(0, k - 25), 60) + "' / '" + a2.substr(Math.max(0, k - 25), 60) + "'");
    }
    if (!tuttu) throw new Error('Prompt editöre birebir yazılamadı');
    // fotoğraf hâlâ ekli mi (selectAll/delete eki silmiş olabilir)
    if (!JS(ekVar)) throw new Error('Prompt yazılırken fotoğraf eki düştü');
    // 3) yükleme bitince gönder
    let gitti = false;
    for (let i = 0; i < 80 && !gitti; i++) {
      bekle(1.5);
      gitti = !!JS("(() => { const b = " + GONDER + "; if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return false; b.click(); return true; })()");
    }
    if (!gitti) throw new Error('Gönder tuşu açılmadı (fotoğraf yüklenemedi)');
    // 4) sonucu sohbetin kendisinden bekle (en fazla 10 dk): araç mesajındaki üretilmiş görsel + biten tur
    let cid = '';
    for (let i = 0; i < 30 && !cid; i++) { bekle(2); cid = JS("(location.pathname.match(/\\/c\\/([0-9a-f-]{20,})/) || [])[1] || ''"); }
    if (!cid) throw new Error('Sohbet başlamadı');
    bekle(15);
    const son = Date.now() + 10 * 60 * 1000; let d = null, ayni = 0, oncekiAp = '', yaziSakin = 0;
    while (Date.now() < son) {
      bekle(8);
      try {
        d = JSAsync(`
          const s = await (await fetch('/api/auth/session')).json(); window.__fdTok = s.accessToken;
          const j = await (await fetch('/backend-api/conversation/${cid}', { headers: { Authorization: 'Bearer ' + s.accessToken } })).json();
          const ms = Object.values(j.mapping || {}).map(x => x.message).filter(Boolean).sort((a, b) => (a.create_time || 0) - (b.create_time || 0));
          let ap = null, w = 0, h = 0, metin = '', sonAsistanBitti = false, apZaman = 0;
          for (const m of ms) {
            if (m.author.role === 'user') continue;
            for (const p of (m.content.parts || [])) {
              if (p && typeof p === 'object' && p.content_type === 'image_asset_pointer' && p.metadata && p.metadata.generation && m.status === 'finished_successfully') { ap = p.asset_pointer; w = p.width; h = p.height; apZaman = m.create_time || 0; }
              if (typeof p === 'string' && m.author.role === 'assistant') metin = p;
            }
          }
          const sa = ms.filter(m => m.author.role === 'assistant').pop();
          sonAsistanBitti = !!(sa && sa.status === 'finished_successfully' && (sa.create_time || 0) >= apZaman);
          const stop = !!document.querySelector('[data-testid="stop-button"], button[aria-label*="durdur" i], button[aria-label*="Stop" i]');
          return { ap, w, h, metin: metin.slice(0, 300), bitti: sonAsistanBitti, stop };`, 60);
      } catch (e) { log('  durum okunamadı: ' + e.message); continue; }
      if (d.ap) {
        ayni = (d.ap === oncekiAp) ? ayni + 1 : 0; oncekiAp = d.ap;
        if ((d.bitti && !d.stop) || ayni >= 3) break;
      } else if (d.bitti && !d.stop && d.metin) { if (++yaziSakin >= 6) break; } else yaziSakin = 0;
    }
    if (!d || !d.ap) throw new Error('Görsel gelmedi. ChatGPT: ' + (d && d.metin || ''));
    // 5) tam çözünürlükte indir, merkezden 4:3 kırp, 1600x1200 JPEG (%92)
    const fid = String(d.ap).replace(/^.*:\/\//, '');
    const uzun = JSAsync(`
      const H = { Authorization: 'Bearer ' + window.__fdTok };
      const r = await (await fetch('/backend-api/files/download/${fid}?conversation_id=${cid}&inline=false', { headers: H })).json();
      if (!r.download_url) throw new Error('indirme adresi yok: ' + JSON.stringify(r).slice(0, 150));
      const blob = await (await fetch(r.download_url, { credentials: 'include' })).blob();
      const img = await createImageBitmap(blob), W = img.width, Hh = img.height;
      let cw, ch; if (W / Hh > 4 / 3) { cw = Math.round(Hh * 4 / 3); ch = Hh; } else { cw = W; ch = Math.round(W * 3 / 4); }
      const c = document.createElement('canvas'); c.width = 1600; c.height = 1200;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, Math.floor((W - cw) / 2), Math.floor((Hh - ch) / 2), cw, ch, 0, 0, 1600, 1200);
      window.__fdOut = c.toDataURL('image/jpeg', 0.92).split(',')[1];
      return window.__fdOut.length;`, 180);
    if (!uzun) throw new Error('Görsel indirilemedi');
    const b64 = sayfadanAl('__fdOut');
    const gecici = cikisJpg + '.b64'; yaz(gecici, b64);
    sh('base64 -D -i ' + q(gecici) + ' -o ' + q(cikisJpg)); sil(gecici);
    if (!varMi(cikisJpg)) throw new Error('Görsel yazılamadı');
  } finally { sekmeKapat(); }
}

// Girdiyi ChatGPT için hazırlar: HEIC/PNG de olsa JPEG, uzun kenar en fazla 2048
function hazirla(girdi, cikis) {
  sh('/usr/bin/sips -s format jpeg -s formatOptions 90 -Z 2048 ' + q(girdi) + ' --out ' + q(cikis) + ' >/dev/null');
  if (!varMi(cikis)) throw new Error('Fotoğraf açılamadı');
}

function tekFoto(girdi, cikis, prompt) {
  for (let deneme = 1; ; deneme++) {
    try { chatgptDuzenle(girdi, cikis, prompt); return; }
    catch (e) {
      const m = String(e.message || e);
      if (m === 'GIRIS' || m === 'APPLE_JS' || deneme >= 2) throw new Error(m);
      log('  deneme ' + deneme + ' hata: ' + m); bekle(20);
    }
  }
}

function dosyaAdi(s) { return String(s || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim(); }
function promptOku() {
  const p = DIZIN + '/prompt.txt';
  const sha = sh('/usr/bin/shasum -a 256 ' + q(p) + " | awk '{print $1}'").trim();
  if (sha !== PROMPT_SHA) throw new Error('prompt.txt Umut\'un promptuyla birebir aynı değil');
  return oku(p);
}

// Prompt seçici (2026-11-03): iş "profesyonel" (ya da türsüz, eski iş) ise Mac'teki prompt.txt (SHA kontrollü);
// başka bir türse metin işle birlikte FotoDuzenle.js'ten gelir ve yine olduğu gibi yapıştırılır.
function promptSec(is) {
  if (!is.tur || is.tur === 'profesyonel') return promptOku();
  if (typeof is.prompt === 'string' && is.prompt.trim()) return is.prompt;
  throw new Error('"' + is.tur + '" promptu sunucuda yok');
}

function isIsle(is, prompt) {
  const id = is.is, ad = dosyaAdi(is.ad) || 'Fotoğraflar', dosyalar = is.dosyalar || [], bitenler = is.bitenler || [];
  log('iş ' + id + " '" + ad + "' " + dosyalar.length + ' fotoğraf');
  const ham = DIZIN + '/is/' + id; klasor(ham);
  yaz(DIZIN + '/suren-is', id);
  let tamam = 0; const hatalar = [];
  durum(id, { islenen: 0, mesaj: 'Mac aldı, fotoğraflar alınıyor' });
  for (const f of dosyalar) {
    const no = +f.no, sira = ('0' + no).slice(-2);
    if (varMi(ham + '/yuklendi_' + sira) || bitenler.indexOf(no) >= 0) { tamam++; continue; }
    try {
      const j = servis({ action: 'fdIndir', is: id, no, tur: 'in' });
      if (!j.success) throw new Error(j.error);
      const ham64 = ham + '/in_' + sira + '.b64', ham1 = ham + '/in_' + sira + '.bin', girdi = ham + '/in_' + sira + '.jpg', gpt = ham + '/gpt_' + sira + '.jpg';
      yaz(ham64, j.veri); sh('base64 -D -i ' + q(ham64) + ' -o ' + q(ham1)); sil(ham64);
      hazirla(ham1, girdi); sil(ham1);
      durum(id, { islenen: tamam, mesaj: "ChatGPT'de: " + sira + ' · ' + tamam + ' / ' + dosyalar.length + ' hazır' });
      tekFoto(girdi, gpt, prompt);
      const veri = sh('base64 -i ' + q(gpt) + " | tr -d '\\n'");
      tamam++;
      durum(id, { no, ad: ad + ' ' + sira + '.jpg', veri, islenen: tamam, mesaj: tamam + ' / ' + dosyalar.length + ' hazır' });
      yaz(ham + '/yuklendi_' + sira, '1');
      log('  ' + sira + ' tamam');
    } catch (e) {
      const m = String(e.message || e);
      if (m === 'GIRIS' || m === 'APPLE_JS') {
        const msj = m === 'GIRIS' ? "ChatGPT oturumu kapalı: Mac'te Chrome'da chatgpt.com'a giriş yap, sonra işi yeniden gönder."
                                  : "Mac Chrome'da Görünüm > Geliştirici > \"Apple Events'ten JavaScript'e izin ver\" kapalı.";
        if (tamam === 0) { durum(id, { durum: 'hata', mesaj: msj }); sil(DIZIN + '/suren-is'); log('  ' + m); return; }
        hatalar.push('kalanlar (' + msj + ')'); break;
      }
      hatalar.push(sira + ' (' + m + ')'); log('  ' + sira + ' BAŞARISIZ: ' + m);
    }
  }
  if (tamam === 0) durum(id, { durum: 'hata', islenen: 0, mesaj: ('Hiçbir fotoğraf düzenlenemedi: ' + hatalar.join('; ')).slice(0, 300) });
  else { let m = tamam + ' / ' + dosyalar.length + ' fotoğraf hazır'; if (hatalar.length) m += ' · olmayanlar: ' + hatalar.join('; '); durum(id, { durum: 'bitti', islenen: tamam, mesaj: m.slice(0, 300) }); }
  sil(DIZIN + '/suren-is'); sh('rm -rf ' + q(ham));
  log('iş ' + id + ' bitti: ' + tamam + ' / ' + dosyalar.length);
}

function run(argv) {
  klasor(DIZIN);
  let kafein = '';
  try {
    if (argv && argv[0] === 'test') {
      const t = DIZIN + '/test-girdi.jpg'; hazirla(argv[1], t);
      tekFoto(t, argv[2], promptOku()); sil(t); return 'tamam: ' + argv[2];
    }
    ANAHTAR = oku(DIZIN + '/anahtar').trim();
    if (!ANAHTAR) { log('anahtar yok'); return; }
    // önceki çalışma iş ortasında kesildiyse (Mac uyudu / kapandı) iş kaldığı yerden yeniden sıraya
    if (varMi(DIZIN + '/suren-is')) {
      const eski = oku(DIZIN + '/suren-is').trim(); sil(DIZIN + '/suren-is');
      try { servis({ action: 'fdYenidenSiraya', is: eski }); log('yarıda kalan iş yeniden sırada: ' + eski); } catch (e) {}
    }
    const is = servis({ action: 'fdSiradaki', ilk: 0 });
    if (!is.success || !is.is) return;
    kafein = sh('/usr/bin/caffeinate -i -t 7200 >/dev/null 2>&1 & echo $!').trim(); // iş sürerken Mac uyumasın
    let prompt;
    try { prompt = promptSec(is); }
    catch (e) { durum(is.is, { durum: 'hata', mesaj: String(e.message || e) }); log('iş ' + is.is + ' prompt yok: ' + (e.message || e)); return; }
    log('iş ' + is.is + ' prompt: ' + (is.tur || 'profesyonel'));
    isIsle(is, prompt);
  } catch (e) { log('hata: ' + (e.message || e)); if (argv && argv[0] === 'test') throw e; }
  finally { if (kafein) try { sh('kill ' + kafein); } catch (e) {} }
}
