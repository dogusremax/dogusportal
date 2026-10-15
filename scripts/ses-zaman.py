# Yüklenen ses dosyasını (ör. ElevenLabs sitesinden indirilen) yazıya döker, altyazı için cümle zamanlarını çıkarır.
# Kullanım: python scripts/ses-zaman.py reel-ses.mp3 reel-zaman.json   (faster-whisper, CPU, ücretsiz)
import json, re, sys
from faster_whisper import WhisperModel

# "medium" Türkçede marka ve burç adlarını "small"dan çok daha doğru yazar; ipucu metni de bu kelimeleri tanıtır
model = WhisperModel("medium", device="cpu", compute_type="int8")
IPUCU = ("Merhaba, RE/MAX Doğuş'un astroloji köşesine hoş geldiniz. Burç burç detaylı yorumlar. "
         "Koç, Boğa, İkizler, Yengeç, Aslan, Başak, Terazi, Akrep, Yay, Oğlak, Kova, Balık. "
         "Merkür, Venüs, Mars, Jüpiter, Satürn, retro, geri hareket. Tapu, kira, sözleşme, gayrimenkul, yatırım.")
parcalar, _ = model.transcribe(sys.argv[1], language="tr", word_timestamps=True, vad_filter=True, initial_prompt=IPUCU)
kelimeler = [w for p in parcalar for w in p.words]
cumleler, simdi = [], []
for w in kelimeler:
    simdi.append(w)
    if re.search(r"[.!?]$", w.word.strip()):
        cumleler.append(simdi); simdi = []
if simdi: cumleler.append(simdi)
# Whisper'ın bu seste bilinen yanlış duyuşları
DUZELT = [(r"(?i)\b(re ?/? ?max|remex|rimeks|remaks)\b", "RE/MAX"), (r"(?i)\bastrologik\s+öşesine\b", "astroloji köşesine"),
          (r"(?i)\böşesine\b", "köşesine"), (r"(?i)\bbuç buç\b", "Burç burç"), (r"(?i)\bkirabelge", "kira belge")]
def duzelt(t):
    for a, b in DUZELT: t = re.sub(a, b, t)
    return t
z = [{"t": duzelt("".join(w.word for w in c).strip()), "bas": round(c[0].start, 2), "son": round(c[-1].end, 2)} for c in cumleler]
json.dump(z, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print("\n".join(f'{x["bas"]:6.2f}-{x["son"]:6.2f} {x["t"]}' for x in z))
