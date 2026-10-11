"""Kıbrıs İnşaat (360.cyprusconstructions.com) manifest.json -> assets/kibris360/data-esentepe.js
Kullanım: python3 esentepe.py manifest.json [pin_gorselleri_klasoru]"""
import json,re,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent));from anchor import fix
R=pathlib.Path(__file__).resolve().parents[2]
M=json.load(open(sys.argv[1]));RES=sys.argv[2] if len(sys.argv)>2 else None
ODA=[('BEDROOM UP','Üst kat yatak odası'),('TERRACE_GRASS','Bahçe'),('BEDROOM','Yatak odası'),('BATHROOM','Banyo'),('BATH','Banyo'),
 ('LIVING','Salon'),('KITCHEN','Mutfak'),('CORRIDOR','Koridor'),('TERRACE','Teras'),('ENTERANCE','Giriş'),('ENTRANCE','Giriş'),
 ('POOL','Havuz'),('FRONT','Ön cephe')]
PROJE=[('HAWAII','Hawaii Homes'),('MALDIVE','Maldives'),('MYKONOS','Mykonos'),('PEARL','Pearl Island'),('PERAL','Pearl Island'),
 ('PHUKET','Phuket'),('IDYLL','Idyll'),('CALICUP','Calicup'),('BAHAMA','Bahamas'),('MAHAMAS','Bahamas'),('CALIFORIAN','Californian'),
 ('SEALS OFFICE','Satış ofisi'),('RENTAL OFFICE','Kiralama ofisi'),('ESENTEPE PLAJ','Esentepe Plajı'),('NEW MAP','Genel bakış'),
 ('ALOHA','Aloha'),('MOON LIGHT','Moon Light'),('MAIN OFFICE','Merkez ofis')]
def proje(l):
    u=l.upper().replace('_',' ')
    for k,v in PROJE:
        if k in u: return v
    return None
def gorunum(l):
    u=l.upper().strip()
    if u in ('NEW MAP',): return ''
    if 'AIR' in u or u.startswith('GENEL'): return 'Havadan'
    for k,v in ODA:
        if k in u.replace(' ','_') or k in u:
            m=re.search(r'(\d+)\s*$',u);return v+(' '+m.group(1) if m else '')
    m=re.search(r'(\d+)\s*$',u)
    return (m.group(1)+'. açı') if m else ''
P=[];idx={}
for o in M:
    g=proje(o['ad'])
    if not g: print('atlandı',o['ad']);continue
    idx[o['id']]=len(P);P.append([o,g,gorunum(o['ad'])])
# aynı projede aynı adı alan görünümleri numarala
from collections import Counter,defaultdict
cnt=Counter((g,v) for _,g,v in P);seen=defaultdict(int)
for x in P:
    if cnt[(x[1],x[2])]>1:
        seen[(x[1],x[2])]+=1;x[2]=(x[2]+' ' if x[2] else '')+str(seen[(x[1],x[2])]) if x[2] else str(seen[(x[1],x[2])])+'. açı'
# Satış ofisi: 26 iç mekan, sırayla
for x in P:
    if x[1]=='Satış ofisi':
        m=re.search(r'_(\d+)$',x[0]['ad']);x[2]='Giriş' if 'ENTRANCE' in x[0]['ad'].upper() else ('Bölüm '+m.group(1) if m else x[2])
# proje sırası: havadan görünümler önde, genel bakış en başta
SIRA=['Genel bakış','Pearl Island','Maldives','Mykonos','Hawaii Homes','Phuket','Bahamas','Idyll','Esentepe Plajı','Calicup','Californian','Kiralama ofisi','Satış ofisi']
def anahtar(i):
    o,g,v=P[i];return (SIRA.index(g) if g in SIRA else 99, 0 if v in ('','Havadan') else 1, i)
ordr=sorted(range(len(P)),key=anahtar);yeni={old:n for n,old in enumerate(ordr)}
out=[]
for i in ordr:
    o,g,v=P[i];hs=[]
    for h in o['hs']:
        t=yeni[idx[h['t']]] if h['t'] in idx else -1
        a=proje(h['l']) if h['l'] else None
        if t>=0: a=P[ordr[t]][1]
        if not a: continue
        if t<0 and (a==g or a in ('Genel bakış',)): continue
        hy,hp=fix(h,RES)
        hs.append([round(hy,2),round(hp,2),a,t]+([round(h['ty'],1),round(h['tp'],1)] if h.get('ty') is not None and t>=0 else []))
    out.append({'id':o['id'].split('_',1)[1],'g':g,'v':v,'n':[l[1] for l in o['lv']],'y':round(o['y'],1),'p':round(o['p'],1),'h':hs})
(R/'assets/kibris360/data-esentepe.js').write_text('// Kaynak: tools/kibris360/esentepe.py (otomatik üretilir)\nwindow.K360='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
gs=[]
for x in out:
    if x['g'] not in gs: gs.append(x['g'])
print(len(out),'panorama',len(gs),'proje',gs)
for x in out[:60]: print(x['g'],'|',x['v'],'|',x['n'],len(x['h']))
