// Danışman sayfası video kapakları: data/danisman-site.json içindeki Instagram reels ve YouTube videolarının
// kapak görsellerini indirip assets/video-kapak/{kod}.webp olarak kaydeder (IG linkleri süreli olduğu için repoda tutulur).
// Reels videolarını da assets/reels/{kod}.mp4 (720p, hızlı başlangıç) olarak indirir; sayfa bunları kendi oynatıcısında gerçek oranıyla açar.
const fs = require('fs'), sharp = require('sharp'), { execFileSync } = require('child_process');
const G = 'https://graph.facebook.com/v23.0', TOK = process.env.IG_TOKEN, UID = process.env.IG_USER_ID;
const DIR = 'assets/video-kapak', VDIR = 'assets/reels';
fs.mkdirSync(DIR, { recursive: true }); fs.mkdirSync(VDIR, { recursive: true });
const site = JSON.parse(fs.readFileSync('data/danisman-site.json', 'utf8'));
const ekip = JSON.parse(fs.readFileSync('data/danismanlar.json', 'utf8'));
const igAdi = id => (ekip.find(d => d && d.id === id) || {}).instagram;

async function js(u) { const r = await fetch(u); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; }

// business_discovery (danışmanın kendi hesabı) veya /media (remaxdogus) → {shortcode: kapak url}
async function medya(ad) {
  const harita = {};
  let after = '', sayfa = 0;
  while (sayfa++ < 15) {
    let m;
    if (ad) {
      const j = await js(G + '/' + UID + '?fields=business_discovery.username(' + ad + '){media.limit(100)' + (after ? '.after(' + after + ')' : '') + '{shortcode,thumbnail_url,media_url,media_type}}&access_token=' + TOK);
      m = j.business_discovery.media;
    } else {
      m = await js(G + '/' + UID + '/media?fields=shortcode,thumbnail_url,media_url,media_type&limit=100' + (after ? '&after=' + after : '') + '&access_token=' + TOK);
    }
    (m.data || []).forEach(x => { if (x.shortcode) harita[x.shortcode] = { kapak: x.thumbnail_url || x.media_url, video: x.media_type === 'VIDEO' ? x.media_url : null }; });
    after = m.paging && m.paging.next && m.paging.cursors && m.paging.cursors.after;
    if (!after) break;
  }
  return harita;
}

async function videoKaydet(kod, url) {
  const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status);
  const ham = VDIR + '/' + kod + '.ham.mp4'; fs.writeFileSync(ham, Buffer.from(await r.arrayBuffer()));
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', ham, '-vf', "scale='min(720,iw)':-2", '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', VDIR + '/' + kod + '.mp4']);
  } finally { fs.unlinkSync(ham); }
}

async function kaydet(kod, url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const tip = r.headers.get('content-type') || '';
  if (!tip.startsWith('image/')) throw new Error('görsel değil: ' + tip);
  const buf = Buffer.from(await r.arrayBuffer());
  await sharp(buf).resize({ width: 360, withoutEnlargement: true }).webp({ quality: 72 }).toFile(DIR + '/' + kod + '.webp');
}

(async () => {
  const sonuc = { tamam: [], yok: [], video: [], videoYok: [] };
  let ofis = null;
  for (const [id, d] of Object.entries(site)) {
    if (id.startsWith('_') || !d || !Array.isArray(d.videolar)) continue;
    const vl = d.videolar.map(v => typeof v === 'string' ? { yt: v } : v).filter(Boolean);
    for (const v of vl.filter(v => v.yt)) {
      if (fs.existsSync(DIR + '/' + v.yt + '.webp')) continue;
      try { await kaydet(v.yt, 'https://i.ytimg.com/vi/' + v.yt + '/hqdefault.jpg'); sonuc.tamam.push(v.yt); }
      catch (e) { sonuc.yok.push(v.yt + ' (' + e.message + ')'); }
    }
    const ig = vl.filter(v => v.ig).map(v => v.ig).filter(k => !fs.existsSync(DIR + '/' + k + '.webp') || !fs.existsSync(VDIR + '/' + k + '.mp4'));
    if (!ig.length) continue;
    const harita = {};
    const ad = igAdi(id);
    if (ad) try { Object.assign(harita, await medya(ad)); } catch (e) { console.log('business_discovery ' + ad + ': ' + e.message); }
    if (!ofis) try { ofis = await medya(null); } catch (e) { ofis = {}; console.log('remaxdogus medya: ' + e.message); }
    for (const k of Object.keys(ofis)) if (!harita[k]) harita[k] = ofis[k];
    for (const k of ig) {
      const h = harita[k] || {};
      if (!fs.existsSync(VDIR + '/' + k + '.mp4')) {
        if (h.video) try { await videoKaydet(k, h.video); sonuc.video.push(k); } catch (e) { sonuc.videoYok.push(k + ' (' + e.message + ')'); }
        else sonuc.videoYok.push(k + ' (video linki yok)');
      }
      if (fs.existsSync(DIR + '/' + k + '.webp')) continue;
      const adaylar = [h.kapak, 'https://www.instagram.com/p/' + k + '/media/?size=l'].filter(Boolean);
      let ok = false, hata = '';
      for (const u of adaylar) { try { await kaydet(k, u); ok = true; break; } catch (e) { hata = e.message; } }
      ok ? sonuc.tamam.push(k) : sonuc.yok.push(k + ' (' + hata + ')');
    }
  }
  sonuc.videolar = fs.readdirSync(VDIR).filter(f => f.endsWith('.mp4')).map(f => f.slice(0, -4));
  console.log(JSON.stringify(sonuc, null, 1));
  fs.writeFileSync(DIR + '/sonuc.json', JSON.stringify(sonuc, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
