# Drive Nöbet klasöründen videoları indirir, 1080x1920 h264 mp4'e çevirir, assets/nobet-video/ günceller
import subprocess, unicodedata, re, sys
from pathlib import Path
FOLDER = "1EAW0ygIfJSLWnw1hUreDBrxM49vtkHno"
IDS = {"evsen ozazman":"evsen","irem aleyna tetik":"irem","irem tetik":"irem","gizem gok":"gizem","orhan ozazman":"orhan","ozlem varol":"ozlem_varol","gamze yetkin":"gamze","aysegul alpay":"aysegul_alpay","aysun yilmaz":"aysun"}
def norm(s):
    s=s.lower().replace("ı","i").replace("ş","s").replace("ğ","g").replace("ü","u").replace("ö","o").replace("ç","c")
    s=unicodedata.normalize("NFKD",s); s="".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+"," ",re.sub(r"\.[a-z0-9]+$","",s)).strip()
subprocess.run([sys.executable,"-m","pip","install","-q","gdown"],check=True)
r=subprocess.run(["gdown","--folder",FOLDER,"-O","dl"])
if r.returncode!=0:
    print("KLASÖR İNDİRİLEMEDİ — klasör 'bağlantıya sahip herkes' olarak paylaşılmamış olabilir.")
    sys.exit(2)
out=Path("assets/nobet-video"); out.mkdir(parents=True,exist_ok=True)
ok=0
for f in Path("dl").rglob("*"):
    if not f.is_file(): continue
    cid=IDS.get(norm(f.name))
    if not cid: print("eşleşmedi:",f.name); continue
    subprocess.run(["ffmpeg","-v","error","-y","-i",str(f),"-vf","scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920","-c:v","libx264","-crf","20","-preset","medium","-c:a","aac","-b:a","128k","-movflags","+faststart",str(out/f"{cid}.mp4")],check=True)
    print("✓",f.name,"->",cid); ok+=1
print("toplam",ok)
if ok==0: sys.exit(1)
