"""3DVista pin görselinin ucu: hotspot yaw/pitch görselin MERKEZİdir, binayı gösteren uç ise
görselin altındadır (çubuk). Ucu görselin saydamlığından bulup gerçek yaw/pitch'e çevirir."""
import math,pathlib,re
from PIL import Image
_c={}
def tip(path):
    """görseldeki en alttaki opak piksellerin konumu (0..1, 0..1); bulunamazsa merkez"""
    if path in _c: return _c[path]
    r=(.5,.5)
    try:
        im=Image.open(path)
        if im.mode in ('RGBA','LA','P'):
            a=im.convert('RGBA').split()[3];w,h=a.size;px=a.load()
            for y in range(h-1,-1,-1):
                xs=[x for x in range(w) if px[x,y]>128]
                if xs: r=((sum(xs)/len(xs)+.5)/w,(y+.5)/h);break
    except Exception: pass
    _c[path]=r;return r
def anchor(y,p,hf,vf,fx,fy):
    """merkez (y,p), açısal boyut (hf,vf) olan düzlemsel görselde (fx,fy) noktasının yönü"""
    Y,P=math.radians(y),math.radians(p)
    c=(math.sin(Y)*math.cos(P),-math.sin(P),-math.cos(Y)*math.cos(P))
    r=(math.cos(Y),0,math.sin(Y));u=(-math.sin(Y)*math.sin(P),-math.cos(P),math.cos(Y)*math.sin(P))
    du=math.tan(math.radians(hf)/2)*(2*fx-1);dv=math.tan(math.radians(vf)/2)*(1-2*fy)
    v=[c[i]+du*r[i]+dv*u[i] for i in range(3)];n=math.sqrt(sum(x*x for x in v))
    return math.degrees(math.atan2(v[0],-v[2])),math.degrees(math.asin(-v[1]/n))
def fix(h,resdir):
    """manifest hotspot'u -> (yaw,pitch) uca göre"""
    if not h.get('img') or not h.get('hf') or not h.get('vf') or not resdir: return h['y'],h['p']
    # yön okları ve alan işaretleri yerinde durur; yalnız çubuklu/damla pinlerin ucu alınır
    if re.match(r'^(arrow|polygon|p\d*)$',(h.get('l') or '').strip(),re.I): return h['y'],h['p']
    f=pathlib.Path(resdir)/pathlib.Path(h['img']).name
    if not f.exists(): return h['y'],h['p']
    fx,fy=tip(str(f));return anchor(h['y'],h['p'],h['hf'],h['vf'],fx,fy)
