// Haftalık yatırım astrolojisi Reel'i: astrolog (assets/astrolog.png) haftanın yorumunu sesli anlatır.
//   node scripts/astro-reel.js metin    → data/yatirim-astroloji.json'dan ~55 sn konuşma metni (Gemini, olmazsa kalıp) → yatirim-astroloji/<hafta>-reel.json
//   node scripts/astro-reel.js ses      → ElevenLabs (ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID varsa), yoksa Edge TTS (ücretsiz)
//                                         → reel-ses.mp3 + reel-zaman.json (cümle başına başlangıç/bitiş saniyesi)
//   node scripts/astro-reel.js altyazi  → reel.ass (9:16, alt bölümde altyazı)
//   node scripts/astro-reel.js medya    → yatirim-astroloji/.media-reel (paylaşım bilgisi)
// Video birleştirme (ffmpeg) ve dudak senkronu (SadTalker) .github/workflows/astro-reel.yml içinde.
const fs = require('fs');
const { execFileSync } = require('child_process');

const DIR = 'yatirim-astroloji', VERI = 'data/yatirim-astroloji.json';
const veri = JSON.parse(fs.readFileSync(VERI, 'utf8'));
const METIN = `${DIR}/${veri.hafta}-reel.json`;
const MODELLER = ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.5-flash'];
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const wait = ms => new Promise(r => setTimeout(r, ms));

// 1-31 arası sayıyı yazıya çevirir (ses motoru tarihleri düzgün okusun)
function yazi(n) {
  const b = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'], o = ['', 'on', 'yirmi', 'otuz'];
  return [o[Math.floor(n / 10)], b[n % 10]].filter(Boolean).join(' ');
}
const tarihYazi = s => s.replace(new RegExp(`\\b(\\d{1,2}) (${AYLAR.join('|')})`, 'g'), (_, g, a) => `${yazi(+g)} ${a}`);

function kalip() {
  const c = ["Merhaba, RE/MAX Doğuş'un astroloji köşesine hoş geldiniz.",
    'Bu hafta yıldızlar ev ve yatırım kararlarınız için neler söylüyor, birlikte bakalım.'];
  for (const o of veri.olaylar.slice(0, 3)) {
    const t = tarihYazi(o.replace(/\s*\([^)]*\)/g, '').replace(':', ' günü,'));
    c.push(t[0].toLocaleUpperCase('tr') + t.slice(1) + '.');
  }
  c.push(veri.ozet.replace(/\bsana\b/g, 'size').replace(/\bbütçeni\b/g, 'bütçenizi').replace(/\badımlarını\b/g, 'adımlarınızı'));
  c.push('Burç burç detaylı yorumlar gönderimizde.', 'Burcunuz ne olursa olsun, doğru adım için RE/MAX Doğuş yanınızda.',
    'Keyifli bir hafta dilerim.');
  return c;
}

function istem() {
  return `Bir kadın astrolog, RE/MAX Doğuş (Fikirtepe/Kadıköy emlak ofisi) adına Instagram Reel'inde kameraya bakarak konuşacak.
Aşağıdaki haftalık yatırım astrolojisi verisinden onun söyleyeceği Türkçe konuşma metnini yaz.

KURALLAR
- Toplam 115-135 kelime (yaklaşık 55 saniye), 9-12 kısa cümle; her cümle en fazla 16 kelime.
- Sıcak, samimi, hafif enerjik; "siz" diye hitap et. Konuşma dili, liste ya da başlık yok, emoji yok.
- Tarihleri ve sayıları YAZIYLA yaz ("yirmi üç Ekim"), rakam kullanma. Kısaltma kullanma ("retro" yerine "geri hareket").
- İlk cümle: "Merhaba, RE/MAX Doğuş'un astroloji köşesine hoş geldiniz." Haftanın önemli gök olaylarını ev, kira, alım-satım, sözleşme gibi gayrimenkul kararlarına bağla.
- Sonlara doğru "Burç burç detaylı yorumlar gönderimizde." de; son cümle "Keyifli bir hafta dilerim." olsun. RE/MAX Doğuş'u toplam en fazla iki kez an.
- Kesin yatırım tavsiyesi ya da fiyat/kazanç vaadi verme.

VERİ
${JSON.stringify({ hafta: veri.hafta, tema: veri.tema, olaylar: veri.olaylar, durum: veri.durum, ozet: veri.ozet })}

Yalnızca şu JSON'u döndür: {"cumleler": ["...", "..."]}`;
}

async function gemini(anahtar) {
  for (const model of MODELLER) for (let d = 0; d < 3; d++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': anahtar },
      body: JSON.stringify({ contents: [{ parts: [{ text: istem() }] }],
        generationConfig: { temperature: 0.8, responseMimeType: 'application/json' } }),
    }).catch(() => null);
    if (r && (r.status === 429 || r.status === 503)) { await wait(20000); continue; }
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { console.error('Gemini hatası', model, r?.status, j.error?.message?.slice(0, 150)); break; }
    try {
      const c = JSON.parse((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')).cumleler;
      const kelime = (c || []).join(' ').split(/\s+/).length;
      if (Array.isArray(c) && c.length >= 6 && kelime >= 90 && kelime <= 160 && !/\d/.test(c.join(' '))) { console.log('Model:', model, '·', kelime, 'kelime'); return c; }
      console.error('Metin kurala uymadı:', kelime, 'kelime');
    } catch (e) { console.error('JSON okunamadı'); }
  }
  return null;
}

async function metin() {
  if (fs.existsSync(METIN) && !process.env.YENIDEN) { console.log('Metin hazır:', METIN); return; }
  let anahtar = process.env.GEMINI_API_KEY;
  if (!anahtar) try { anahtar = JSON.parse(process.env.GOOGLE_PLACES_KEY || '').gemini; } catch (e) {}
  const c = (anahtar && await gemini(anahtar)) || kalip();
  fs.writeFileSync(METIN, JSON.stringify({ hafta: veri.hafta, cumleler: c }, null, 1));
  console.log(c.join('\n'));
}

const sure = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });

async function elevenlabs(c) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: JSON.stringify({ text: c.join(' '), model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', language_code: 'tr',
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('ElevenLabs: ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
  fs.writeFileSync('reel-ses.mp3', Buffer.from(j.audio_base64, 'base64'));
  const a = j.alignment, zaman = [];
  let i = 0;
  for (const t of c) {
    const bas = i, son = i + t.length - 1;
    zaman.push({ t, bas: a.character_start_times_seconds[bas], son: a.character_end_times_seconds[Math.min(son, a.characters.length - 1)] });
    i = son + 2;   // cümleler arası boşluk
  }
  return zaman;
}

function edge(c) {
  // Her cümle ayrı okunur, aralarına kısa sessizlik konur; böylece altyazı zamanları kesin olur
  const ses = process.env.EDGE_SES || 'tr-TR-EmelNeural', liste = [], zaman = [];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.35', '-c:a', 'libmp3lame', 'bosluk.mp3']);
  let t0 = 0;
  c.forEach((t, k) => {
    const f = `parca-${k}.mp3`;
    execFileSync('edge-tts', ['--voice', ses, '--rate=+4%', '--text', t, '--write-media', f]);
    const d = sure(f);
    zaman.push({ t, bas: t0, son: t0 + d });
    t0 += d + 0.35;
    liste.push(`file '${f}'`, `file 'bosluk.mp3'`);
  });
  fs.writeFileSync('liste.txt', liste.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'liste.txt', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', 'reel-ses.mp3']);
  return zaman;
}

async function ses() {
  const c = JSON.parse(fs.readFileSync(METIN, 'utf8')).cumleler;
  let zaman = null;
  if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) {
    try { zaman = await elevenlabs(c); console.log('Ses: ElevenLabs'); } catch (e) { console.error(e.message, '→ Edge TTS ile devam'); }
  }
  if (!zaman) { zaman = edge(c); console.log('Ses: Edge TTS'); }
  fs.writeFileSync('reel-zaman.json', JSON.stringify(zaman, null, 1));
  console.log('Süre:', sure('reel-ses.mp3').toFixed(1), 'sn');
}

// Uzun cümleyi en fazla iki satırlık altyazı parçalarına böler (süreyi harf sayısına göre paylaştırır)
function parcala({ t, bas, son }) {
  const k = t.split(/\s+/), parcalar = [];
  let p = [];
  for (const w of k) {
    if ((p.join(' ') + ' ' + w).length > 40 && p.length) { parcalar.push(p.join(' ')); p = []; }
    p.push(w);
    if (/,$/.test(w) && p.join(' ').length >= 16) { parcalar.push(p.join(' ')); p = []; }   // virgülde böl
  }
  if (p.length) parcalar.push(p.join(' '));
  const top = parcalar.reduce((s, x) => s + x.length, 0);
  let t0 = bas;
  return parcalar.map(x => { const d = (son - bas) * x.length / top; const r = { t: x, bas: t0, son: t0 + d }; t0 += d; return r; });
}

function altyazi() {
  const z = JSON.parse(fs.readFileSync('reel-zaman.json', 'utf8')).flatMap(parcala);
  z.forEach((x, i) => { if (z[i + 1] && z[i + 1].bas - x.son < 0.6) x.son = z[i + 1].bas; });   // cümle aralarında altyazı yanıp sönmesin
  const ts = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = (s % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${x}`; };
  const sar = s => { if (s.length <= 24) return s; const k = s.split(' '); let i = 1, best = 1, fark = 1e9;
    for (; i < k.length; i++) { const f = Math.abs(k.slice(0, i).join(' ').length - k.slice(i).join(' ').length); if (f < fark) { fark = f; best = i; } }
    return k.slice(0, best).join(' ') + '\\N' + k.slice(best).join(' '); };
  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Alt,Plus Jakarta Sans,58,&H00FFFFFF,&H00FFFFFF,&H00300A05,&H8C300A05,1,0,0,0,100,100,0,0,3,18,0,2,90,90,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${z.map(x => `Dialogue: 0,${ts(x.bas)},${ts(x.son)},Alt,,0,0,0,,${sar(x.t)}`).join('\n')}
`;
  fs.writeFileSync('reel.ass', ass);
  console.log(z.length, 'altyazı satırı');
}

function medya() {
  const site = 'https://dogusportal.com';
  fs.writeFileSync(`${DIR}/.media-reel`, JSON.stringify({
    hafta: veri.hafta,
    video: `${site}/${DIR}/${veri.hafta}-reel.mp4`,
    kapak: `${site}/${DIR}/${veri.hafta}-reel-kapak.jpg`,
    aciklama: `🔮 Haftanın yatırım astrolojisi\n\n${veri.ozet}\n\nBurç burç detaylı yorumlar gönderimizde. Ev, kira ve yatırım kararlarınızda RE/MAX Doğuş yanınızda.\n\n📍 RE/MAX Doğuş · Fikirtepe / Kadıköy\n\nBu videodaki astrolog ve ses yapay zeka ile oluşturulmuştur.\n\n#remaxdoğuş #yatırımastrolojisi #burçyorumları #kadıköy #fikirtepe #gayrimenkul #emlak`,
  }, null, 1));
}

const is = { metin, ses, altyazi, medya }[process.argv[2]];
if (!is) { console.error('Kullanım: node scripts/astro-reel.js metin|ses|altyazi|medya'); process.exit(1); }
Promise.resolve(is()).catch(e => { console.error(e); process.exit(1); });
