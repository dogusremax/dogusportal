#!/usr/bin/env python3
"""Güneş Reel montajı: cümle başlarında yakınlaştırma (punch-in/out), açılışta yavaş zoom,
sonda zoom-out, her geçişte sentez whoosh, açılışta hafif vuruş sesi.
Kullanım: gunes-montaj.py giris.mp4 zaman.json cikis.mp4
giris.mp4 beyaz bantları kırpılmış 1080x1920 video olmalı."""
import json, subprocess, sys, wave
import numpy as np

giris, zaman, cikis = sys.argv[1:4]
YUZ_Y = 658          # yüzün dikey konumu (1080x1920 karede)
SR = 44100
cumle = json.load(open(zaman))
sure = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                      "-of", "csv=p=0", giris]))

# (baslangic, sure, hedef zoom, ses tipi)
plan = []
if len(cumle) > 1:  # tanıtım cümlesinde yavaş yakınlaşma
    a, b = cumle[1]["bas"], cumle[1]["son"]
    plan.append((a, b - a, 1.28, "vurus"))
seviye = [1.0, 1.14, 1.0, 1.22]
son_gecis = plan[-1][0] + plan[-1][1] if plan else 0
i = 0
for c in cumle[2:]:
    if c["bas"] - son_gecis < 3.5 or c["bas"] > sure - 5:
        continue
    plan.append((c["bas"] - 0.08, 0.22, seviye[i % len(seviye)], "whoosh"))
    son_gecis, i = c["bas"], i + 1
if plan[-1][2] == 1.0 and len(plan) > 1:  # sonda zoom-out görünsün diye son geçiş yakın plan olsun
    a, d, _, tip = plan[-1]; plan[-1] = (a, d, 1.18, tip)
plan.append((sure - 2.6, 2.0, 1.0, "whoosh-uzun"))

# zoom ifadesi: z = 1 + sum(dz * smoothstep)
terimler, z = [], 1.0
for a, d, hedef, _ in plan:
    s = f"clip((t-{a:.3f})/{d:.3f},0,1)"
    terimler.append(f"{hedef - z:+.4f}*{s}*{s}*(3-2*{s})")
    z = hedef
Z = "(1" + "".join(terimler) + ")"

# efekt sesleri
toplam = np.zeros(int((sure + 1) * SR))
rng = np.random.default_rng(7)
def whoosh(uz):
    n = int(uz * SR); t = np.arange(n) / n
    gurultu = rng.standard_normal(n)
    kesim = 400 + 5000 * np.sin(np.pi * t) ** 2          # süpürülen alçak geçiren
    y, out = 0.0, np.empty(n)
    for k in range(n):
        al = 1 - np.exp(-2 * np.pi * kesim[k] / SR)
        y += al * (gurultu[k] - y); out[k] = y
    return out * np.sin(np.pi * t) ** 1.5 * 0.5
def vurus():
    n = int(0.9 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (55 + 30 * np.exp(-t * 8)) * t) * np.exp(-t * 4.5) * 0.8
            + whoosh(0.9)[:n] * 0.4)
for a, d, _, tip in plan:
    ses = vurus() if tip == "vurus" else whoosh(0.9 if tip == "whoosh-uzun" else 0.45)
    bas = max(0, int((a - (0.1 if tip == "vurus" else 0.2)) * SR))
    toplam[bas:bas + len(ses)] += ses[:len(toplam) - bas]
toplam = np.clip(toplam / max(1e-9, np.abs(toplam).max()) * 0.9, -1, 1)
with wave.open("/tmp/gunes-sfx.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((toplam * 32767).astype(np.int16).tobytes())

vf = (f"scale=w='2*trunc(540*{Z})':h='2*trunc(960*{Z})':eval=frame:flags=lanczos,"
      f"crop=1080:1920:'(iw-1080)/2':'max(0,min(ih-1920,{YUZ_Y}*(ih/1920-1)))'")
af = "[1:a]volume=0.32[e];[0:a][e]amix=inputs=2:duration=first:normalize=0[a]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", giris, "-i", "/tmp/gunes-sfx.wav",
                "-filter_complex", f"[0:v]{vf}[v];{af}", "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "192k", cikis], check=True)
for a, d, h, tip in plan:
    print(f"{a:6.2f}s  {tip:12s} zoom {h}")
