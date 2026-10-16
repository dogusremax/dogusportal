#!/usr/bin/env python3
"""Güneş Reel kurgusu, Umut'un CapCut tarzında (19 Ekim örneği):
siyahtan bulanık açılış, tek kelime altyazı, yakın/geniş plan kesmeleri, kırmızı-turuncu ışık geçişi.
Kullanım: gunes-capcut.py ham.mp4 zaman.json cikis.mp4 font.ttf
ham.mp4 beyaz bantları kırpılmış 1080x1920 HeyGen videosu; zaman.json ses-zaman.py çıktısı (kelime zamanlı)."""
import json, os, re, subprocess, sys, tempfile

ham, zaman, cikis, font = sys.argv[1:5]
YUZ_Y, YAKIN = 640, 1.35          # yüzün dikey konumu ve yakın plan büyütmesi
ACILIS = float(os.environ.get("ACILIS", "0"))  # >0: siyah-bulanık açılış (yalnız dudak kayması olan videolarda)
cumle = json.load(open(zaman))
sure = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", ham]))

# tek kelime altyazı (ASS)
def zm(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
kelimeler = [k for c in cumle for k in c["k"]]
ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "",
       "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV",
       f"Style: K,{{AD}},92,&H00FFFFFF,&H00000000,&H90000000,-1,0,1,4,3,2,40,40,400", "",
       "[Events]", "Format: Layer, Start, End, Style, Text"]
for i, k in enumerate(kelimeler):
    w = re.sub(r"[.,!?;:\"“”]", "", k["w"]).strip()
    if not w: continue
    bas = max(k["b"], 0.25)
    son = kelimeler[i + 1]["b"] if i + 1 < len(kelimeler) and kelimeler[i + 1]["b"] - k["s"] < 0.6 else k["s"] + 0.15
    if son <= bas: son = bas + 0.12
    ass.append(f"Dialogue: 0,{zm(bas)},{zm(son)},K,{{\\fscx92\\fscy92\\t(0,90,\\fscx100\\fscy100)}}{w}")
ad = subprocess.check_output(["fc-scan", "--format", "%{family[0]}", font]).decode()
gecici = tempfile.mkdtemp()
open(f"{gecici}/k.ass", "w").write("\n".join(ass).replace("{AD}", ad) + "\n")

# yakın / geniş plan kesmeleri: her iki cümlede bir yakın plan (anlık kesme)
yakin = [(c["bas"] - 0.05, cumle[i + 1]["bas"] - 0.05) for i, c in enumerate(cumle[:-1]) if i % 3 == 1]
Z = "(1+%.2f*(%s))" % (YAKIN - 1, "+".join(f"between(t,{a:.2f},{b:.2f})" for a, b in yakin) or "0")

# ışık geçişleri: ilk cümlenin sonu ve son cümlenin başı
isik = [cumle[0]["son"] - 0.2, cumle[-1]["bas"] - 0.35] if len(cumle) > 2 else []
D = 0.75
leak = (f"color=c=black:s=1080x1920:r=30:d={D},format=rgba,"
        "geq=r='255':g='70+150*exp(-(pow(Y-560-120*T,2))/90)+60*exp(-(pow(X-700,2)+pow(Y-650,2))/250000)':"
        "b='20+120*exp(-(pow(Y-560-120*T,2))/90)':"
        f"a='255*sin(PI*T/{D})*min(1,0.55+0.45*exp(-(pow(X-700,2)+pow(Y-650,2))/350000)+exp(-(pow(Y-560-120*T,2))/60))'")
temel = (f"[0:v]scale=w='2*trunc(540*{Z})':h='2*trunc(960*{Z})':eval=frame:flags=lanczos,"
         f"crop=1080:1920:'(iw-1080)/2':'max(0,min(ih-1920,{YUZ_Y}*(ih/1920-1)))'")
if ACILIS > 0:
    vf = [temel + ",split[a][b]",
          f"[b]gblur=sigma=45,format=yuva420p,fade=t=out:st={ACILIS * 0.35:.2f}:d={ACILIS * 0.65:.2f}:alpha=1[bl]",
          "[a][bl]overlay=eof_action=pass,fade=t=in:st=0:d=0.6[v0]"]
else:
    vf = [temel + "[v0]"]
son = "v0"
for j, t in enumerate(isik):
    vf.append(f"{leak},setpts=PTS+{t:.2f}/TB[l{j}]")
    vf.append(f"[{son}][l{j}]overlay=eof_action=pass[v{j + 1}]")
    son = f"v{j + 1}"
vf.append(f"[{son}]ass={gecici}/k.ass:fontsdir={os.path.dirname(os.path.abspath(font))}[v]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ham, "-filter_complex", ";".join(vf), "-map", "[v]", "-map", "0:a",
                "-af", "afade=t=in:st=0:d=0.3", "-r", "30", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", cikis], check=True)
print("yakın planlar:", yakin, "ışık:", isik)
