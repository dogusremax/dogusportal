"""Dovec Group (360.dovecgroup.com/main) manifest.json -> assets/kibris360/data-dovec.js
Çok projelik tur (Long Beach, Mağusa, Karpaz): 'g' proje, 'v' projenin görünümü.
Kullanım: python3 dovec.py main/manifest.json main/pinler [d-point/manifest.json d-point/pinler [querencia/manifest.json querencia/pinler]]
D-Point ve Querencia ayrı 3DVista turları (360.dovecgroup.com/d-point, /querencia); sahneleri 's' alanında kendi görüntü kaynağını taşır."""
import json,re,sys,math,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent));from anchor import fix
R=pathlib.Path(__file__).resolve().parents[2]
M=json.load(open(sys.argv[1]));RES=sys.argv[2] if len(sys.argv)>2 else None
DP_SRC='https://360.dovecgroup.com/d-point/media';QU_SRC='https://360.dovecgroup.com/querencia/media'
for a,src in ((3,DP_SRC),(5,QU_SRC)):
    if len(sys.argv)>a:
        for o in json.load(open(sys.argv[a])):o['_src']=src;o['_res']=sys.argv[a+1] if len(sys.argv)>a+1 else None;M.append(o)
ODA=[('Living room','Salon'),('Livingroom','Salon'),('Living','Salon'),('Saloon','Salon'),('Salon','Salon'),('Kitchen','Mutfak'),
 ('Corridor','Koridor'),('Room View','Oda manzarası'),('Bath Room','Banyo'),('Bathroom','Banyo'),('Bedroom','Yatak odası'),
 ('Bed Room','Yatak odası'),('Room','Yatak odası'),('YATAK ODA','Yatak odası'),('HOME OFFICE','Ev ofisi'),('RECEPTION','Resepsiyon'),
 ('STUDIO','Stüdyo daire'),('Entrance','Giriş')]
def oda(s):
    for k,v in ODA:
        if k.lower() in s.lower():
            m=re.search(r'(\d+)\s*$',s);return v+((' '+m.group(1)) if m and m.group(1)!='1' else '')
    return s
# sahne adı -> (proje, görünüm); listede olmayan sahne atlanır
# Not: 'Courtyard Platinum' sahnesi yeni proje; COURT_YARD/COURTYARD sahneleri Long Beach'teki eski Courtyard sitesi (ayrı yer)
SAHNE={'LONG BEACH BIRDVIEW':('Long Beach','Havadan'),'Panorama':('Long Beach','Havadan 2'),'long_beach_4':('Long Beach','Havadan 3'),
 'HAVUZ':('Long Beach','Havuz'),'CAFE':('Long Beach','Kafe'),'TERAS BAR':('Long Beach','Teras bar'),'FITNESS':('Long Beach','Fitness'),
 'salon1':('Long Beach','Örnek daire 1 · Salon'),'yatak1':('Long Beach','Örnek daire 1 · Yatak odası'),'banyo_new':('Long Beach','Örnek daire 1 · Banyo'),
 'salon2':('Long Beach','Örnek daire 2 · Salon'),'banyo_new2':('Long Beach','Örnek daire 2 · Banyo'),
 'salon3':('Long Beach','Örnek daire 3 · Salon'),'banyo_new1':('Long Beach','Örnek daire 3 · Banyo'),
 'Magusa':('Mağusa','Havadan'),'Magusa 2':('Mağusa','Havadan 2'),'Magusa 3':('Mağusa','Havadan 3'),
 'Golden Residence':('Golden Residence',''),'Central Park 2':('Central Park',''),'Corner Park':('Corner Park',''),
 'ALFAM':('Alfam','Havadan'),'ALFAM Back':('Alfam','Arka'),'Alfam':('Alfam','Daire'),'Alfam Trrace':('Alfam','Teras'),
 'Alfam GYM 1':('Alfam','Spor salonu'),'Alfam GYM 2':('Alfam','Spor salonu 2'),'Alfam Room 1':('Alfam','Yatak odası'),'Alfam Room 2':('Alfam','Yatak odası 2'),
 'Port Karpas':('Port Karpas','Havadan'),'Port Karpas Back':('Port Karpas','Arka'),'Town House Villas':('Port Karpas','Town House villaları'),
 'Four Season Life':('Four Seasons Life','Havadan'),'Four Season Front':('Four Seasons Life','Ön'),'Four Season Center':('Four Seasons Life','Orta'),
 'Four Season Back':('Four Seasons Life','Arka'),'Foursesons2_Left':('Four Seasons Life','Sol'),'Foursesons2_Right':('Four Seasons Life','Sağ'),
 'Four2_Inside':('Four Seasons Life','Site içi'),'FOUR_SEASONS_4':('Four Seasons Life','Havadan 2'),
 'Park View Towers':('Park View Towers',''),'Laisla':('Laisla',''),'Querencia':('Querencia','Havadan 3'),'Natulux':('Natulux',''),
 'Platinum':('Platinum',''),'La Casalia':('La Casalia',''),
 'Four Seasons Villa':('Four Seasons Villa','Havadan'),'4_SEASONS_VILLA (1)':('Four Seasons Villa','1. açı'),'4_SEASONS_VILLA (2)':('Four Seasons Villa','2. açı'),
 'Courtyard Platinum':('Courtyard Platinum','Havadan'),'COURT_YARD (1)':('Courtyard','Havadan'),'COURT_YARD (3)':('Courtyard','Havadan 2'),
 'COURTYARD BACK':('Courtyard','Arka'),'COURTYARD CENTER':('Courtyard','Orta'),'COURTYARD CORNER':('Courtyard','Köşe'),
 'COURTYARD WALKSIDE':('Courtyard','Yürüyüş yolu'),'COURTYARD KIDS FACILITY':('Courtyard','Çocuk alanı'),
 'COURTYARD CAFE BAR':('Courtyard','Kafe bar'),
 'APOSTOLOS_ANDREAS_MONASTERY_(1)':('Gezilecek yerler','Apostolos Andreas Manastırı'),'APOSTOLOS_ANDREAS_MONASTERY_(2)':('Gezilecek yerler','Apostolos Andreas Manastırı 2'),
 'FINAL_DESTINATION_(1)':('Gezilecek yerler','Zafer Burnu'),'FINAL_DESTINATION_(2)':('Gezilecek yerler','Zafer Burnu 2'),
 'GOLDEN_BEACH_(1)':('Gezilecek yerler','Altın Kum Plajı'),'GOLDEN_BEACH_(2)':('Gezilecek yerler','Altın Kum Plajı 2'),
 'LALA_MUSTAFA_PASA_CAMII (1)':('Gezilecek yerler','Lala Mustafa Paşa Camii'),'LALA_MUSTAFA_PASA_CAMII (2)':('Gezilecek yerler','Lala Mustafa Paşa Camii 2'),
 'ST_BARNABAS_MONASTERY (1)':('Gezilecek yerler','St. Barnabas Manastırı'),'ST_BARNABAS_MONASTERY (2)':('Gezilecek yerler','St. Barnabas Manastırı 2'),
 'KALE_İÇİ':('Gezilecek yerler','Mağusa Kaleiçi'),'SALAMİS_HARABELERİ':('Gezilecek yerler','Salamis Harabeleri')}
DP_HAVA={'Front':'Havadan ön','Front Left':'Havadan ön sol','Front Left Far':'Havadan sol uzak','Front Top':'Havadan üst',
 'Left Side':'Havadan sol','Back':'Havadan arka','Mid Top':'Tepeden'}
DP_SIRA=['Front Top','Front','Front Left','Front Left Far','Left Side','Back','Mid Top']
def dpoint(ad):
    if ad in DP_HAVA: return ('D-Point',DP_HAVA[ad])
    m=re.match(r'360 vr_([A-Za-z]+)\s*(\d*)$',ad) or re.match(r'(Green) (\d+)$',ad)
    if m:
        k,n=m.groups();v={'Green':'Yeşil alan','pool':'Havuz','shop':'Market','Path':'Yürüyüş yolu','sr':'Site içi'}.get(k,k)
        return ('D-Point',v+((' '+n) if n else ''))
    m=re.match(r'2\+1 (?:Bedroom |Bed )?(.*)$',ad)
    if m:
        r=m.group(1);v={'Living':'Salon','Kitchen':'Mutfak','Corridor 1':'Koridor','Corridor 2':'Koridor 2','1':'Yatak odası',
         '2':'Yatak odası 2','Bath':'Banyo','Terrace':'Teras'}.get(r,r)
        return ('D-Point','2+1 daire · '+v)
    return None
QU={'Project_View':'Havadan','Air_View':'Havadan 2','Air_Right View':'Havadan sağ','Project Back Right':'Arka sağ',
 'Project Back':'Arka','Project Left':'Sol','Pool View Back':'Havuz arka','Pool View_1':'Havuz 1','Pool View_2':'Havuz 2',
 'Parking':'Otopark','Tennis':'Tenis kortu','Store_2':'Mağaza','Coffee':'Kafe önü','Lobby_1':'Lobi','Lobby_2':'Lobi 2',
 'Cafe_1':'Kafe','Cafe_2':'Kafe 2','Executive business 1 - B1':'Ofis','Executive business 2 - B1':'Ofis 2',
 'Penthouse Living':'Penthouse · Salon','Penthouse living 2':'Penthouse · Salon 2','Roof Pool 1':'Çatı havuzu 1',
 'Roof Pool 2':'Çatı havuzu 2','Roof Pool 2_1':'Çatı havuzu 3','Roof Pool 4':'Çatı havuzu 4','Roof Pool 4_1':'Çatı havuzu 5','Roof Pool 4_3':'Çatı havuzu 6'}
def querencia(ad):
    if ad in QU: return ('Querencia',QU[ad])
    m=re.match(r'(A Blo(?:c?k) )?(Studio|[0-9]\+[0-9]) (.*)$',ad,re.I)
    if m:
        a,t,r=m.groups();t='Stüdyo' if t.lower()=='studio' else t+' daire'
        return ('Querencia',('A Blok ' if a else '')+t+' · '+oda(r.replace('room','room ').strip()))
    return None
def sahne(ad):
    if ad in SAHNE: return SAHNE[ad]
    m=re.match(r'SKY SAKARYA (.*)$',ad)
    if m:
        r=m.group(1);t=re.match(r'([0-9]\+[0-9]) (.*)$',r)
        return ('Sky Sakarya',(t.group(1)+' daire · '+oda(t.group(2))) if t else oda(r))
    m=re.match(r'Terrace Park (\d)$',ad)
    if m: return ('Terrace Park',m.group(1)+'. açı')
    m=re.match(r'Terrace Park (.*)$',ad)
    if m: return ('Terrace Park',oda(m.group(1)))
    m=re.match(r'(3\+1|Dublex) (.*)$',ad)  # Terrace Park örnek daireleri (Salon/Kitchen/Corridor/Bedroom olanlar Four Seasons'ta)
    if m and ad in ('3+1 Room','3+1 Bath Room','3+1 Living','Dublex Room','Dublex Bath Room','Dublex Living'):
        return ('Terrace Park',('3+1 daire' if m.group(1)=='3+1' else 'Dubleks')+' · '+oda(m.group(2)))
    m=re.match(r'([0-9]\+[0-9]) (.*)$',ad)
    if m: return ('Four Seasons Life',m.group(1)+' daire · '+oda(m.group(2)))
    m=re.match(r'Four2_(.*)$',ad)
    if m: return ('Four Seasons Life','Örnek daire · '+oda(m.group(1).replace('_',' ')))
    return None
P=[];idx={}
for o in M:
    s=(dpoint(o['ad']) if o['_src']==DP_SRC else querencia(o['ad'])) if o.get('_src') else sahne(o['ad'])
    if not s: print('atlandı',o['ad']);continue
    idx[o['id']]=len(P);P.append([o,*s])
# aynı adı alan görünümleri numarala
from collections import Counter,defaultdict
cnt=Counter((g,v) for _,g,v in P);seen=defaultdict(int)
for x in P:
    k=(x[1],x[2])
    if cnt[k]>1: seen[k]+=1;x[2]=x[2]+(' '+str(seen[k]) if seen[k]>1 else '')
SIRA=['Long Beach','Querencia','D-Point','Courtyard Platinum','Courtyard','Four Seasons Life','Four Seasons Villa','Park View Towers','Laisla','Natulux',
 'Platinum','La Casalia','Mağusa','Golden Residence','Sky Sakarya','Terrace Park','Central Park','Corner Park','Alfam','Port Karpas','Gezilecek yerler']
def anahtar(i):
    o,g,v=P[i]
    if o.get('_src')==QU_SRC: return (SIRA.index(g),0,(list(QU).index(o['ad']) if o['ad'] in QU else 100+i))
    if o.get('_src'):
        k=DP_SIRA.index(o['ad']) if o['ad'] in DP_SIRA else 100+(0 if o['ad'].startswith('2+1') else 1)*100+i
        return (SIRA.index(g),0,k)
    if o['ad']=='Querencia': return (SIRA.index(g),0,2.5)  # Long Beach turundaki Querencia görünümü, havadanların arkasına
    k=list(SAHNE).index(o['ad']) if o['ad'] in SAHNE else 1000+i
    return (SIRA.index(g),0 if v.startswith('Havadan') or v=='' else 1,k)
ordr=sorted(range(len(P)),key=anahtar);yeni={old:n for n,old in enumerate(ordr)}
out=[]
for i in ordr:
    o,g,v=P[i];hs=[];kon=defaultdict(list)
    for h in o['hs']:
        if h['t'] not in idx: continue
        t=yeni[idx[h['t']]]
        if t==yeni[i]: continue
        hy,hp=fix(h,o.get('_res',RES))
        # aynı hedefe giden yakın pinlerden (çokgen + ok) yalnızca biri
        if any(math.hypot((hy-a+180)%360-180,hp-b)<8 for a,b in kon[t]): continue
        kon[t].append((hy,hp))
        hs.append([round(hy,2),round(hp,2),P[ordr[t]][1],t]+([round(h['ty'],1),round(h['tp'],1)] if h.get('ty') is not None else []))
    out.append({'id':o['id'].split('_',1)[1],'g':g,'v':v,'n':[l[1] for l in o['lv']],'y':round(o['y'],1),'p':round(o['p'],1),'h':hs,**({'s':o['_src']} if o.get('_src') else {})})
(R/'assets/kibris360/data-dovec.js').write_text('// Kaynak: tools/kibris360/dovec.py (otomatik üretilir)\nwindow.K360='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
gs=[]
for x in out:
    if x['g'] not in gs: gs.append(x['g'])
print(len(out),'panorama',len(gs),'proje',gs)
for x in out: print(x['g'],'|',x['v'],'|',x['n'],len(x['h']))
