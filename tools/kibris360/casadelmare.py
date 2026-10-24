"""Northernland Casa del Mare (360.northernland.com/casadelmare) manifest.json -> assets/kibris360/data-casadelmare.js
Tek projelik tur: 'g' alanı projenin bölümüdür (Havadan, Havuzlar, Site içi, villalar, daire tipleri, çatı terasları).
Kullanım: python3 casadelmare.py manifest.json [pin_gorselleri_klasoru]"""
import json,re,sys,math,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent));from anchor import fix
R=pathlib.Path(__file__).resolve().parents[2]
M=json.load(open(sys.argv[1]));RES=sys.argv[2] if len(sys.argv)>2 else None
ODA=[('Living Terrace','Salon terası'),('Bedroom Terrace','Yatak odası terası'),('Terrace_Living','Salon terası'),('Terrace_Bedroom','Yatak odası terası'),
 ('Up Bedroom Bath','Üst kat banyo'),('Up Bedroom','Üst kat yatak odası'),('Bedroom 1 Bath','Yatak odası 1 banyo'),('Bedroom2 Bath','Yatak odası 2 banyo'),
 ('Bedroom 3_Bath','Yatak odası 3 banyo'),('Bedroom Bath','Yatak odası banyo'),('Bedroom 4_Corridor','Yatak odası 4 koridor'),('Fitting Bath','Giyinme odası banyo'),
 ('Fitting Room','Giyinme odası'),('Floor1_Corridor','Üst kat koridor'),('Bathroom','Banyo'),('Bedroom','Yatak odası'),('Living','Salon'),
 ('Kitchen','Mutfak'),('Corridor','Koridor'),('Staircase','Merdiven'),('terrace','Teras'),('Terrace','Teras')]
def oda(s):
    s=s.strip(' _-')
    for k,v in ODA:
        if k.lower() in s.lower():
            m=re.search(r'(\d+)\s*$',s);n=m.group(1) if m and not re.search(r'\d',v) else ''
            if k=='Kitchen' and '_2' in s: n='2'
            return v+((' '+n) if n else '')
    return s
HAVA={'Air View':'Genel','Air View_2':'Genel 2','Air Front NEW':'Ön','Air Front Far New':'Ön uzak','Front Left':'Ön sol','Front Left_New_02':'Ön sol 2',
 'Front Right':'Ön sağ','Back':'Arka','Back Far':'Arka uzak','Left Side_':'Sol','Left Side_NEW_02':'Sol 2','Right Side Near':'Sağ yakın',
 'Right Side Far':'Sağ uzak','Stage 2 Air Pool':'2. etap havuz'}
SITE={'Phase1_Front Pool':('Havuzlar','1. etap ön havuz'),'Phase1_Sea Pool':('Havuzlar','1. etap deniz havuzu'),'Phase1 - Sea Pool 2':('Havuzlar','1. etap deniz havuzu 2'),
 'Phase1_Front Pool BAR':('Havuzlar','1. etap havuz bar'),'Phase2_Front Pool':('Havuzlar','2. etap ön havuz'),'Phase2_Front Pool 2 NEW':('Havuzlar','2. etap ön havuz 2'),
 'Phase2_Front Pool Door NEW':('Havuzlar','2. etap havuz girişi'),'Pera - pool view':('Havuzlar','Pera havuz'),
 'Phase1_Campus':('Site içi','1. etap'),'Phase2_Campus':('Site içi','2. etap'),'Phase3_Campus':('Site içi','3. etap'),'Phase1_LeftSide':('Site içi','1. etap yan'),
 'Phase1_WalkSide':('Site içi','1. etap yürüyüş yolu'),'Phase1 - Villa 8 1':('Site içi','Villa 8'),'Phase1 - Villa 8 2':('Site içi','Villa 8 · 2'),
 'Peran site view':('Site içi','Pera'),'Pera Bar 2':('Site içi','Pera bar'),'Pera Path way':('Site içi','Pera yolu'),'360 sokak 1':('Site içi','Sokak 1'),
 '360 sokak 2':('Site içi','Sokak 2'),'360 sokak 3':('Site içi','Sokak 3'),'Tenis court':('Site içi','Tenis kortu'),'Stage2 Green Area':('Site içi','2. etap yeşil alan'),
 'Stage 2 - Office Enterance':('Site içi','2. etap ofis girişi')}
def sahne(ad):
    """(bölüm, görünüm)"""
    if ad in HAVA: return 'Havadan',HAVA[ad]
    if ad in SITE: return SITE[ad]
    m=re.match(r'Villa_(\d\+1)_(.*)$',ad)
    if m: return 'Villa '+m.group(1),oda(m.group(2))
    m=re.match(r'P(\d)_(\d\+\d)_(.*)$',ad)
    if m: return ('Stüdyo' if m.group(2)=='1+0' else m.group(2)+' daire'),m.group(1)+'. etap · '+oda(m.group(3))
    m=re.match(r'1_1 (Floor 1|Ground)\s*-\s*(.*)$',ad)
    if m: return '1+1 loft',('Üst kat' if m.group(1)=='Floor 1' else 'Zemin kat')+' · '+oda(m.group(2))
    m=re.match(r'(B\d+|Villa \d+)[_ ]+\s*Roof.*?(Night)?$',ad.replace('.jpg',''))
    if m: return 'Çatı terasları',m.group(1).replace('B','Blok ',1)+(' · gece' if m.group(2) else '')
    m=re.match(r'B(\d+)_(First|Ground)$',ad)
    if m: return 'Blok manzaraları','Blok '+m.group(1)+' · '+('1. kat' if m.group(2)=='First' else 'zemin')
    return None
P=[];idx={}
for o in M:
    s=sahne(o['ad'])
    if not s: print('atlandı',o['ad']);continue
    idx[o['id']]=len(P);P.append([o,*s])
# aynı adı alan görünümleri numarala
from collections import Counter,defaultdict
cnt=Counter((g,v) for _,g,v in P);seen=defaultdict(int)
for x in P:
    if cnt[(x[1],x[2])]>1: seen[(x[1],x[2])]+=1;x[2]=x[2]+' '+str(seen[(x[1],x[2])])
SIRA=['Havadan','Havuzlar','Site içi','Villa 4+1','Villa 3+1','2+1 daire','1+1 daire','1+1 loft','Stüdyo','Çatı terasları','Blok manzaraları']
ordr=sorted(range(len(P)),key=lambda i:(SIRA.index(P[i][1]),list(HAVA).index(P[i][0]['ad']) if P[i][1]=='Havadan' else 0,i))
yeni={old:n for n,old in enumerate(ordr)}
def etiket(t,g0):
    """hedefin etiketi: aynı bölümdeyse görünüm adı, değilse bölüm + görünüm"""
    o,g,v=P[ordr[t]]
    if g==g0: return v
    if g=='Havadan': return 'Havadan · '+v.lower()
    if g in ('Havuzlar','Site içi'): return v
    return g+' · '+v
def aci(a,b):
    Y1,P1,Y2,P2=map(math.radians,(a[0],a[1],b[0],b[1]))
    return math.degrees(math.acos(max(-1,min(1,math.sin(P1)*math.sin(P2)+math.cos(P1)*math.cos(P2)*math.cos(Y1-Y2)))))
def seviyeler(lv):
    """yalnız 512'lik karolu seviyeler"""
    n=[]
    for res,rows in lv:
        if res!=rows*512: break
        n.append(rows)
    return n
out=[]
for i in ordr:
    o,g,v=P[i];hs=[]
    for h in o['hs']:
        if h['t'] not in idx: continue
        t=yeni[idx[h['t']]]
        if ordr[t]==i: continue
        # havadan açılar arası geçiş üstteki görünüm düğmelerinde var; havadan görüntüde yalnız yerdeki noktalar kalsın (kalabalık olmasın)
        if g=='Havadan' and P[ordr[t]][1]=='Havadan': continue
        hy,hp=fix(h,RES)
        if any(x[3]==t and aci(x,(hy,hp))<8 for x in hs): continue
        hs.append([round(hy,2),round(hp,2),etiket(t,g),t]+([round(h['ty'],1),round(h['tp'],1)] if h.get('ty') is not None else []))
    e={'id':o['id'].split('_',1)[1],'g':g,'v':v,'n':seviyeler(o['lv']),'y':round(o['y'],1),'p':round(o['p'],1),'h':hs}
    th=pathlib.Path(o['th']).name
    if th!='panorama_'+e['id']+'_t.jpg': e['t']=th
    out.append(e)
(R/'assets/kibris360/data-casadelmare.js').write_text('// Kaynak: tools/kibris360/casadelmare.py (otomatik üretilir)\nwindow.K360='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
for x in out: print(x['g'],'|',x['v'],'|',x['n'],len(x['h']),[h[2] for h in x['h']][:5])
