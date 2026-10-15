// Astrolog Reel'inin yüz videosunu paralel üretmek için sesi parçalara böler ve parçaları geri birleştirir.
//   node scripts/reel-parca.js bol [adet]  → reel-zaman.json'daki cümle aralarından keser → parcalar.json [{bas, son}]
//   node scripts/reel-parca.js birlestir   → yuz-0.mp4 … yuz-N.mp4'ü kısa geçişle (BINDIRME sn) birleştirir → yuz.mp4
// Her parça (sonuncu hariç) BINDIRME kadar uzun üretilir; geçiş bu bindirmede yapıldığı için ses-görüntü senkronu kaymaz.
const fs = require('fs');
const { execFileSync } = require('child_process');

const BINDIRME = 0.2;
const sure = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

function bol() {
  const adet = parseInt(process.argv[3] || '8', 10);
  const D = sure('reel-ses.mp3');
  const z = JSON.parse(fs.readFileSync('reel-zaman.json', 'utf8'));
  // Aday kesim noktaları: ardışık cümlelerin arasındaki sessizliğin ortası
  const aday = [];
  for (let i = 1; i < z.length; i++) aday.push(+((z[i - 1].son + z[i].bas) / 2).toFixed(2));
  const kesim = [];
  for (let k = 1; k < adet; k++) {
    const hedef = (D * k) / adet;
    let en = null;
    for (const a of aday) if (!kesim.includes(a) && (en === null || Math.abs(a - hedef) < Math.abs(en - hedef))) en = a;
    if (en !== null) kesim.push(en);
  }
  const s = [...new Set(kesim)].sort((a, b) => a - b).filter(x => x > 1 && x < D - 1);
  const sinir = [0, ...s, +D.toFixed(2)];
  const p = [];
  for (let i = 0; i < sinir.length - 1; i++) {
    const son = i < sinir.length - 2 ? +(sinir[i + 1] + BINDIRME).toFixed(2) : sinir[i + 1];
    p.push({ bas: sinir[i], son });
  }
  fs.writeFileSync('parcalar.json', JSON.stringify(p, null, 1));
  console.log(p.map((x, i) => `${i}: ${x.bas}-${x.son} (${(x.son - x.bas).toFixed(1)} sn)`).join('\n'));
}

function birlestir() {
  const p = JSON.parse(fs.readFileSync('parcalar.json', 'utf8'));
  const dosya = p.map((_, i) => `yuz-${i}.mp4`);
  const eksik = dosya.filter(f => !fs.existsSync(f));
  if (eksik.length) { console.log('Eksik parça:', eksik.join(', '), '→ hareketli video kullanılmayacak'); return; }
  if (dosya.length === 1) { fs.copyFileSync(dosya[0], 'yuz.mp4'); return; }
  const giris = dosya.flatMap(f => ['-i', f]);
  let filtre = '', onceki = '[0:v]', uzunluk = sure(dosya[0]);
  for (let i = 1; i < dosya.length; i++) {
    const cikis = i === dosya.length - 1 ? '[v]' : `[x${i}]`;
    filtre += `${onceki}[${i}:v]xfade=transition=fade:duration=${BINDIRME}:offset=${(uzunluk - BINDIRME).toFixed(3)}${cikis};`;
    uzunluk += sure(dosya[i]) - BINDIRME;
    onceki = cikis;
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...giris, '-filter_complex', filtre.slice(0, -1), '-map', '[v]',
    '-r', '25', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', 'yuz.mp4'], { stdio: 'inherit' });
  console.log('yuz.mp4:', sure('yuz.mp4').toFixed(2), 'sn, ses:', sure('reel-ses.mp3').toFixed(2), 'sn');
}

({ bol, birlestir })[process.argv[2]]();
