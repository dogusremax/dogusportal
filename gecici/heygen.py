# GEÇİCİ: Umut'un yeni görseli + 26 Ekim sesi ile TEK HeyGen videosu (Avatar IV). Başa 0,6 sn sessizlik, sonra kırpılır.
import os, subprocess, time, requests
K = os.environ["HEYGEN_API_KEY"]; H = {"X-Api-Key": K}
r = requests.post("https://upload.heygen.com/v1/talking_photo", headers={**H, "Content-Type": "image/png"},
                  data=open("gecici/gunes-ayakta.png", "rb").read(), timeout=120)
print("foto", r.status_code, r.text[:300]); foto = r.json()["data"]["talking_photo_id"]
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-t", "0.6", "-i", "anullsrc=r=44100:cl=mono", "-i", "gecici/hafta-26-ekim.mp3",
                "-filter_complex", "[1]aformat=sample_rates=44100:channel_layouts=mono[s];[0][s]concat=n=2:v=0:a=1", "giris.mp3"], check=True)
r = requests.post("https://upload.heygen.com/v1/asset", headers={**H, "Content-Type": "audio/mpeg"}, data=open("giris.mp3", "rb").read(), timeout=120)
print("ses", r.status_code, r.text[:200]); ses = r.json()["data"]["id"]
r = requests.post("https://api.heygen.com/v2/video/generate", headers=H, timeout=60, json={
    "video_inputs": [{"character": {"type": "talking_photo", "talking_photo_id": foto, "use_avatar_iv_model": True},
                      "voice": {"type": "audio", "audio_asset_id": ses}}],
    "dimension": {"width": 1080, "height": 1920}})
print("uret", r.status_code, r.text[:300]); vid = r.json()["data"]["video_id"]
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
