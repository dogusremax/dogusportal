# GEÇİCİ: Umut'un yeni görselini "Doğuş Astrolog" grubuna yeni görünüm olarak ekler (fotoğraf avatarı sınırına takılmaz),
# sonra 26 Ekim sesiyle TEK HeyGen videosu (Avatar IV). Başa 0,6 sn sessizlik, sonra kırpılır.
import json, os, subprocess, time, requests
K = os.environ["HEYGEN_API_KEY"]; H = {"X-Api-Key": K}
GRUP = "1488a5f81c834cf9a1e8a34ea720d4af"
def goster(ad, r): print(ad, r.status_code, r.text[:600], flush=True)
onceki = {a["id"] for a in requests.get(f"https://api.heygen.com/v2/avatar_group/{GRUP}/avatars", headers=H, timeout=60).json()["data"]["avatar_list"]}
print("mevcut görünümler", onceki)
r = requests.post("https://upload.heygen.com/v1/asset", headers={**H, "Content-Type": "image/png"}, data=open("gecici/gunes-ayakta.png", "rb").read(), timeout=120)
goster("gorsel", r); d = r.json()["data"]; anahtar = d.get("image_key") or d.get("key") or d.get("id")
r = requests.post("https://api.heygen.com/v2/photo_avatar/avatar_group/add", headers=H, timeout=60,
                  json={"group_id": GRUP, "image_keys": [anahtar], "name": "Güneş ayakta"})
goster("gorunum ekle", r)
yeni = None
for i in range(40):
    lst = requests.get(f"https://api.heygen.com/v2/avatar_group/{GRUP}/avatars", headers=H, timeout=60).json()["data"]["avatar_list"]
    yeniler = [a for a in lst if a["id"] not in onceki]
    if yeniler:
        print("yeni görünüm", json.dumps(yeniler)[:500])
        if all(a.get("status") in (None, "COMPLETED", "completed") for a in yeniler) or i > 20: yeni = yeniler[0]["id"]; break
    time.sleep(15)
if not yeni: raise SystemExit("Yeni görünüm oluşmadı, video üretilmedi (para harcanmadı).")
open("gecici/gorunum-id.txt", "w").write(yeni + "\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-t", "0.6", "-i", "anullsrc=r=44100:cl=mono", "-i", "gecici/hafta-26-ekim.mp3",
                "-filter_complex", "[1]aformat=sample_rates=44100:channel_layouts=mono[s];[0][s]concat=n=2:v=0:a=1", "giris.mp3"], check=True)
r = requests.post("https://upload.heygen.com/v1/asset", headers={**H, "Content-Type": "audio/mpeg"}, data=open("giris.mp3", "rb").read(), timeout=120)
goster("ses", r); ses = r.json()["data"]["id"]
r = requests.post("https://api.heygen.com/v2/video/generate", headers=H, timeout=60, json={
    "video_inputs": [{"character": {"type": "talking_photo", "talking_photo_id": yeni, "use_avatar_iv_model": True},
                      "voice": {"type": "audio", "audio_asset_id": ses}}],
    "dimension": {"width": 1080, "height": 1920}})
goster("uret", r); vid = r.json()["data"]["video_id"]
open("gecici/video-id.txt", "w").write(vid + "\n")
for i in range(240):
    s = requests.get(f"https://api.heygen.com/v1/video_status.get?video_id={vid}", headers=H, timeout=60).json()["data"]
    print(i, s.get("status"), flush=True)
    if s.get("status") == "completed": url = s["video_url"]; break
    if s.get("status") == "failed": raise SystemExit("HeyGen hata: " + str(s.get("error")))
    time.sleep(15)
else: raise SystemExit("zaman aşımı")
open("ham.mp4", "wb").write(requests.get(url, timeout=600).content)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "0.6", "-i", "ham.mp4", "-c:v", "libx264", "-crf", "16", "-c:a", "aac", "-b:a", "192k", "gecici/gunes-26-ekim-ayakta.mp4"], check=True)
