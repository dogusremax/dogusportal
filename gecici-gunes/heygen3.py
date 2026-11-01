# GEÇİCİ (main'e alınmayacak): 2 Kasım Güneş videosu, HeyGen v3, TEK istek. MOD=kontrol yalnız bakiye okur.
import os, sys, json, subprocess, time, requests
K = os.environ["HEYGEN_API_KEY"]; H = {"X-Api-Key": K}; A = "https://api.heygen.com/v3"
MOD = open("gecici-gunes/mod.txt").read().strip()
me = requests.get(f"{A}/users/me", headers=H, timeout=60)
print("users/me", me.status_code)
try:
    d = me.json().get("data", {}); print(json.dumps({k: d.get(k) for k in ("billing_type", "wallet", "subscription", "usage_based")}, ensure_ascii=False)[:1500])
except Exception as e: print(me.text[:500])
try:
    sp = requests.get("https://developers.heygen.com/openapi/external-api.json", timeout=60).json()
    v = sp["paths"].get("/v3/videos", {}).get("post", {})
    open("gecici-gunes/v3-videos-sema.json", "w").write(json.dumps(v, ensure_ascii=False, indent=1)[:200000])
except Exception as e: print("şema alınamadı", e)
if MOD != "uret": sys.exit(0)
def yukle(yol, tip):
    r = requests.post(f"{A}/assets", headers=H, files={"file": (os.path.basename(yol), open(yol, "rb"), tip)}, timeout=180)
    print("asset", r.status_code, r.text[:300]); dd = r.json()["data"]; return dd.get("asset_id") or dd.get("id")
# Avatar IV ilk ~1 sn'de dudakları geç oturtuyor: başa 0,6 sn sessizlik, sonra videodan kesilir
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-t", "0.6", "-i", "anullsrc=r=44100:cl=mono", "-i", "gecici-gunes/hafta-02-kasim.mp3",
                "-filter_complex", "[1]aformat=sample_rates=44100:channel_layouts=mono[s];[0][s]concat=n=2:v=0:a=1", "-b:a", "192k", "giris.mp3"], check=True)
foto = yukle("gecici-gunes/gunes-02-kasim-beyaz-yelek.png", "image/png")
ses = yukle("giris.mp3", "audio/mpeg")
r = requests.post(f"{A}/avatars", headers=H, timeout=120, json={"type": "photo", "name": "Güneş 2 Kasım", "file": {"type": "asset_id", "asset_id": foto}})
print("avatar", r.status_code, r.text[:600]); av = r.json()["data"]["avatar_item"]["id"]
govde = {"type": "avatar", "avatar_id": av, "audio_asset_id": ses, "aspect_ratio": "9:16", "resolution": "1080p", "engine": {"type": "avatar_iv"}, "title": "Güneş 2 Kasım"}
for i in range(40):   # avatar hazırlanırken 409 resource_not_ready döner; video isteği yalnız kabul edilince bir kez oluşur
    r = requests.post(f"{A}/videos", headers=H, timeout=120, json=govde); print("video", r.status_code, r.text[:400])
    if r.status_code == 409: time.sleep(15); continue
    r.raise_for_status(); break
vid = r.json()["data"]["video_id"]; open("gecici-gunes/video-id.txt", "w").write(vid + "\n")
for i in range(300):
    s = requests.get(f"{A}/videos/{vid}", headers=H, timeout=60).json()["data"]; print(i, s.get("status"), flush=True)
    if s.get("status") == "completed": url = s["video_url"]; break
    if s.get("status") == "failed": raise SystemExit("HeyGen hata: " + str(s.get("failure_code")) + " " + str(s.get("failure_message")))
    time.sleep(15)
else: raise SystemExit("zaman aşımı")
open("ham.mp4", "wb").write(requests.get(url, timeout=600).content)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "0.6", "-i", "ham.mp4", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-c:a", "aac", "-b:a", "192k", "gecici-gunes/gunes-02-kasim-ham.mp4"], check=True)
print(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height:format=duration", "-of", "json", "gecici-gunes/gunes-02-kasim-ham.mp4"], capture_output=True, text=True).stdout)
