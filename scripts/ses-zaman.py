# Yüklenen ses dosyasını (ör. ElevenLabs sitesinden indirilen) yazıya döker, altyazı için cümle zamanlarını çıkarır.
# Kullanım: python scripts/ses-zaman.py reel-ses.mp3 reel-zaman.json   (faster-whisper, CPU, ücretsiz)
import json, re, sys
from faster_whisper import WhisperModel

model = WhisperModel("small", device="cpu", compute_type="int8")
parcalar, _ = model.transcribe(sys.argv[1], language="tr", word_timestamps=True, vad_filter=True)
kelimeler = [w for p in parcalar for w in p.words]
cumleler, simdi = [], []
for w in kelimeler:
    simdi.append(w)
    if re.search(r"[.!?]$", w.word.strip()):
        cumleler.append(simdi); simdi = []
if simdi: cumleler.append(simdi)
duzelt = lambda t: re.sub(r"(?i)\bre ?/? ?max\b", "RE/MAX", t)
z = [{"t": duzelt("".join(w.word for w in c).strip()), "bas": round(c[0].start, 2), "son": round(c[-1].end, 2)} for c in cumleler]
json.dump(z, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print("\n".join(f'{x["bas"]:6.2f}-{x["son"]:6.2f} {x["t"]}' for x in z))
