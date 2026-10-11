"""Northernland Blu / Sapphire (360.northernland.com/blu) manifest.json -> assets/kibris360/data-sapphire.js
Tek projelik tur: 'g' alanı projenin bölümüdür (Havadan, Site içi, Havuzlar, daire tipleri).
Kullanım: python3 sapphire.py manifest.json [pin_gorselleri_klasoru]"""
import json,re,sys,math,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent));from anchor import fix
R=pathlib.Path(__file__).resolve().parents[2]
M=json.load(open(sys.argv[1]));RES=sys.argv[2] if len(sys.argv)>2 else None
OUT=sys.argv[3] if len(sys.argv)>3 else 'data-sapphire.js'
HAVA={'Air View':'Genel','Front':'Ön','Front Left':'Ön sol','Front Right':'Ön sağ','Back Air':'Arka',
 'Back Left':'Arka sol','Back Right':'Arka sağ','Top View':'Tepeden','Cyprus Map_6':'Konum'}
ODA=[('Living','Salon'),('Kitchen','Mutfak'),('Corridor','Koridor'),('Bedroom','Yatak odası'),('Bath','Banyo'),('Terrace','Teras')]
# 3DVista arayüz parçaları (menü, logo, seçim kutuları): panoramaya yapışık, bizde gerekmez
ATLA=re.compile(r'select|selection|home|^map$|^go |logo|live|vr |walik|^\d+ m$|^blue$',re.I)
UCLU=('res_349650F4','res_8461B391','res_E6428004')
def sahne(ad):
    """(bölüm, görünüm, sıra anahtarı)"""
    if ad in HAVA: return 'Havadan',HAVA[ad],list(HAVA).index(ad)
    m=re.match(r'([0-9]\+[0-9])(?: L(\d))? (\D+?)(\d*)$',ad)
    if m:
        tip,kat,oda,no=m.groups();o=next((v for k,v in ODA if oda.startswith(k)),oda)
        v=((kat+'. kat · ') if kat else '')+o+((' '+no) if no else '')
        return tip+' daire',v,(-(int(kat or 9)),[k for k,_ in ODA].index(next(k for k,_ in ODA if oda.startswith(k))),int(no or 0))
    u=ad.replace('_',' ').replace('Enterance','Entrance')
    no=(re.search(r'(\d+)',u) or [None,''])[1];l2=' L2' in u
    for j,(k,v,g) in enumerate([('Infinity Pool','Sonsuzluk havuzu','Havuzlar'),('Sand Pool Entrance','Kum havuzu girişi','Havuzlar'),
                  ('Main Pool Entrance','Ana havuz girişi','Havuzlar'),('Sand Pool','Kum havuzu','Havuzlar'),('Pool','Havuz','Havuzlar'),
                  ('Play Ground','Oyun alanı','Site içi'),('Sport','Spor alanı','Site içi'),('Campus','Site içi','Site içi'),
                  ('Terrace','Teras','Site içi'),('Entrance','Giriş','Site içi')]):
        if u.startswith(k):
            if k=='Campus': no=re.match(r'Campus (\d+)',u).group(1)
            return g,v+((' '+no) if no else '')+(' · üst' if l2 else ''),(j,l2,int(no or 0))
    return None
P=[];idx={}
for o in M:
    s=sahne(o['ad'])
    if not s: print('atlandı',o['ad']);continue
    idx[o['id']]=len(P);P.append([o,*s])
SIRA=['Havadan','Site içi','Havuzlar','3+1 daire','2+1 daire','1+1 daire','1+0 daire']
ordr=sorted(range(len(P)),key=lambda i:(SIRA.index(P[i][1]),P[i][3],i))
yeni={old:n for n,old in enumerate(ordr)}
def etiket(t):
    """başka bölümdeki hedefin etiketi"""
    o,g,v,_=P[ordr[t]]
    if g=='Havadan': return 'Tepeden' if v=='Tepeden' else ('Konum' if v=='Konum' else 'Havadan · '+v.lower())
    if g.endswith('daire'): return g+(' · '+v.split(' · ')[0] if '. kat' in v else '')
    return v
def aci(a,b):
    Y1,P1,Y2,P2=map(math.radians,(a[0],a[1],b[0],b[1]))
    return math.degrees(math.acos(max(-1,min(1,math.sin(P1)*math.sin(P2)+math.cos(P1)*math.cos(P2)*math.cos(Y1-Y2)))))
def seviyeler(lv):
    """yalnız 512'lik karolu seviyeler (3DVista'nın sondaki tek parça seviyeleri bizde kullanılmaz)"""
    n=[]
    for res,rows in lv:
        if res!=rows*512: break
        n.append(rows)
    return n
out=[]
for i in ordr:
    o,g,v,_=P[i];hs=[]
    for h in o['hs']:
        if h['t'] not in idx or ATLA.search(h['l'] or ''): continue
        t=yeni[idx[h['t']]]
        if ordr[t]==i: continue
        # aşağı bakan V işaretlerinde uç gösterilen yerdir; yukarı oklar ve kat/alan şekillerinde merkez
        hy,hp=fix(dict(h,l=''),RES) if any(k in (h.get('img') or '') for k in UCLU) else (h['y'],h['p'])
        if any(x[3]==t and aci(x,(hy,hp))<8 for x in hs): continue
        hs.append([round(hy,2),round(hp,2),etiket(t),t]+([round(h['ty'],1),round(h['tp'],1)] if h.get('ty') is not None else []))
    e={'id':o['id'].split('_',1)[1],'g':g,'v':v,'n':seviyeler(o['lv']),'y':round(o['y'],1),'p':round(o['p'],1),'h':hs}
    th=pathlib.Path(o['th']).name
    if th!='panorama_'+e['id']+'_t.jpg': e['t']=th
    out.append(e)
(R/'assets/kibris360'/OUT).write_text('// Kaynak: tools/kibris360/sapphire.py (otomatik üretilir)\nwindow.K360='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
for x in out: print(x['g'],'|',x['v'],'|',x['n'],len(x['h']),[h[2] for h in x['h']][:6])
