# HeyGen'den gelen astrolog videosunu Reel'e çevirir: beyaz boşlukları kırpar, 9:16 doldurur,
# "Yapay zeka" etiketi + açılış başlığı + düzeltilmiş altyazı + kapanış kartı ekler.
# Kullanım: python3 scripts/gunes-kurgu.py heygen.mp4 zaman.json "19-25 Ekim" cikti.mp4 [font.ttf]
import json, re, subprocess, sys, os

giris, zaman, tarih, cikti = sys.argv[1:5]
FONT = sys.argv[5] if len(sys.argv) > 5 else 'fontlar/PlusJakartaSans.ttf'
# Güneş Reellerinde logo yok: arka plandaki RE/MAX Doğuş tabelası yeterli (Umut, 2026-10-16)
DUZELT = [(r"RE-?MAX|Re-?Max|Remex|REMAX", "RE/MAX"), (r"\badışım\b", "adaşım"), (r"\baydat", "aidat"),
          (r"Akrep'de", "Akrep'te"), (r"\benkârlı\b", "en kârlı"), (r"Burç Burç", "Burç burç"),
          (r"Boğa Burcu'nda", "Boğa burcunda"), (r"Aslan Burcu'nda", "Aslan burcunda"), (r"Dolunay'la", "Dolunay ile")]

def sure(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))

# 1) Beyaz boşlukların sınırını bul (orta sütunda parlaklığı 235 altı ilk/son satır)
ham = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', '5', '-i', giris, '-frames:v', '1', '-vf', 'scale=1:ih,format=gray', '-f', 'rawvideo', '-'])
koyu = [i for i, b in enumerate(ham) if b < 235]
ust, alt = (koyu[0], koyu[-1]) if koyu else (0, len(ham) - 1)
yuk = (alt - ust + 1) // 2 * 2

# 2) Altyazı (ASS)
z = json.load(open(zaman))
def duz(t):
    for a, b in DUZELT: t = re.sub(a, b, t)
    return t
satir = []
for c in z:
    t = duz(c['t']); k = t.split(); par = []; p = []
    for w in k:
        if p and len(' '.join(p + [w])) > 34: par.append(' '.join(p)); p = []
        p.append(w)
        if re.search(r',$', w) and len(' '.join(p)) >= 18: par.append(' '.join(p)); p = []
    if p: par.append(' '.join(p))
    top = sum(len(x) for x in par); t0 = c['bas']
    for x in par:
        d = (c['son'] - c['bas']) * len(x) / top; satir.append([t0, t0 + d, x]); t0 += d
for i in range(len(satir) - 1):
    if satir[i + 1][0] - satir[i][1] < 0.6: satir[i][1] = satir[i + 1][0]
ts = lambda s: f"{int(s // 3600)}:{int(s // 60) % 60:02d}:{s % 60:05.2f}"
def sar(s):
    if len(s) <= 20: return s
    k = s.split(); b = min(range(1, len(k)), key=lambda i: abs(len(' '.join(k[:i])) - len(' '.join(k[i:]))))
    return ' '.join(k[:b]) + r'\N' + ' '.join(k[b:])
SES = sure(giris)
SON = 2.6   # kapanış kartı
ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Alt,Plus Jakarta Sans,60,&H00FFFFFF,&H00FFFFFF,&H00401808,&H90401808,1,0,0,0,100,100,0,0,3,20,0,2,90,90,330,1
Style: Ust,Plus Jakarta Sans,40,&H0066D9FF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,0,3,8,80,80,300,1
Style: Baslik,Plus Jakarta Sans,74,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,4,8,80,80,350,1
Style: Kart1,Plus Jakarta Sans,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,3,5,80,80,0,1
Style: Kart2,Plus Jakarta Sans,40,&H0066D9FF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,1,0,1,0,2,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,{ts(0.15)},{ts(3.6)},Ust,,0,0,0,,{{\\fad(400,500)}}GÜNEŞ İLE · {tarih.upper()}
Dialogue: 1,{ts(0.15)},{ts(3.6)},Baslik,,0,0,0,,{{\\fad(400,500)\\pos(540,410)\\an8}}Haftanın Yatırım\\NAstrolojisi
""" + '\n'.join(f"Dialogue: 0,{ts(a)},{ts(b)},Alt,,0,0,0,,{sar(t)}" for a, b, t in satir) + f"""
Dialogue: 2,{ts(SES + 0.25)},{ts(SES + SON)},Kart1,,0,0,0,,{{\\fad(350,0)\\pos(540,880)}}Burç burç yorumlar\\Nsayfamızda
Dialogue: 2,{ts(SES + 0.45)},{ts(SES + SON)},Kart2,,0,0,0,,{{\\fad(350,0)\\pos(540,1080)}}@remaxdogus · Fikirtepe / Kadıköy
"""
open('gunes.ass', 'w').write(ass)

# 3) Kurgu: kırp, doldur, kapanışta karart, etiket, altyazı
fd = os.path.dirname(os.path.abspath(FONT))
ust_tikla = "Yapay zeka ile oluşturulmuştur"
f = (f"[0:v]crop=iw:{yuk}:0:{ust},scale=-2:1920:flags=lanczos,crop=1080:1920,setsar=1,fps=30,"
     f"tpad=stop_mode=clone:stop_duration={SON},"
     f"drawbox=x=0:y=0:w=iw:h=ih:color=0x0a1230@0.0:t=fill,"
     f"geq=lum='lum(X,Y)*if(gt(T,{SES}),max(0.35,1-(T-{SES})*1.8),1)':cb='cb(X,Y)':cr='cr(X,Y)'[b];"
     f"[b]ass=gunes.ass:fontsdir={fd},drawtext=fontfile={FONT}:text='{ust_tikla}':fontsize=26:fontcolor=white@0.85:x=48:y=96:shadowcolor=black@0.5:shadowx=1:shadowy=1[v];"
     f"[0:a]apad=pad_dur={SON}[a]")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', giris, '-filter_complex', f, '-map', '[v]', '-map', '[a]',
                '-t', f'{SES + SON:.2f}', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '19',
                '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-movflags', '+faststart', cikti], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '1.2', '-i', cikti, '-frames:v', '1', '-q:v', '3', cikti.replace('.mp4', '-kapak.jpg')], check=True)
print('Hazır:', cikti, f'{sure(cikti):.1f} sn', '· kırpma', ust, alt)
