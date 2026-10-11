"""manifest.json (manifest.py çıktısı) -> assets/kibris360/data.js (sayfanın veri dosyası)
Kullanım: python3 data.py manifest.json [pin_gorselleri_klasoru]"""
import json,re,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent));from anchor import fix
RES=sys.argv[2] if len(sys.argv)>2 else None  # pin görsellerinin klasörü (media)
R=pathlib.Path(__file__).resolve().parents[2]
M=json.load(open(sys.argv[1] if len(sys.argv)>1 else '/tmp/claude-0/nvs/manifest.json'))
AD={'LONG BEACH':'Long Beach','HEAD OFFICE':'Merkez Ofis','MAIN OFFICE':'Merkez Ofis','ROYAL SUN':'Royal Sun','ROYAL LIFE':'Royal Life',
 'LONG BEACH LIFE':'Long Beach Life','SEA LIFE':'Sea Life','SEA VIEW':'Sea View','MEDITERRANEAN':'Mediterranean Life',
 'SEA BREEZE':'Sea Breeze','SEA BRAZE':'Sea Breeze','SEA BREAZE':'Sea Breeze','RIVERSIDE':'Riverside','PARK RESIDENCE':'Park Residence',
 'BELLAGIO':'Bellagio','OCEAN LIFE':'Ocean Life','OCEAN LIFE 1':'Ocean Life','NEO':'Neo Residence','NEO RESIDENCE':'Neo Residence',
 'ROYAL SUN ELITE':'Royal Sun Elite','ELITE':'Royal Sun Elite','OLEA':'Olea','SEA PEARL':'Sea Pearl','SEA PERAL':'Sea Pearl',
 'TERRA LIFE':'Terra Life','BLUE':'The Blue','SITE1 & MIRACLE':'Site 1 & Miracle','MIRACLE':'Miracle','ROSE VILLA':'Rose Villas',
 'ROSE VILLAS':'Rose Villas','ANGEL TOWERS':'Angel Towers','BOAZ_AIR LINK':'Boğaz','KARPAZ AIR LINK':'Karpaz','CITY LIFE':'City Life',
 'FOURSEASONS':'Four Seasons Life','FOURSEASON':'Four Seasons Life','FOURSEASONS LIFE':'Four Seasons Life','LA PALAZZO':'La Palazzo','LA_PALAZZO':'La Palazzo','LAPALAZZO':'La Palazzo',
 'MAGNOLIA VILLALARI':'Magnolia Villaları','MAGNOLIA':'Magnolia Villaları','ROYAL POINT':'Royal Point','SKY DIORA':'Sky Diora',
 'SOLMARIS':'Solmaris','ISKELE YASAM':'İskele Yaşam','MAGUSA':'Mağusa','OTUKEN YASAM':'Ötüken Yaşam',
 'YENIBOGAZICI YASAM SITESI':'Yeniboğaziçi Yaşam Sitesi','ELYSIAN AYFILON':'Elysian Ayfilon'}
def ad(l):
    u=l.strip().upper().replace('İ','I')
    if u.startswith('ARROW'): return ''
    if u in AD: return AD[u]
    m=re.match(r'^(.*?)[ _]?(\d+)$',u)
    if m and m.group(1).strip() in AD: return AD[m.group(1).strip()]+(' '+m.group(2) if m.group(1).strip()=='CITY LIFE' else '')
    m=re.match(r'^SITE ?(\d+)$',u)
    if m: return 'Site '+m.group(1)
    return l.strip().title()
def grup(l):
    u=l.strip().upper()
    if u.startswith('NEW MAP'): return None,None
    if u in ('ELITE 2','ELITE 3'): return 'Royal Sun Elite',u[-1]+'. açı'
    if u=='FOURSEASON TOP VIEW': return 'Four Seasons Life','Tepeden'
    if 'AIR LINK' in u: return ad(l),'Havadan'
    if u=='SITE 8_2': return 'Site 8','2. açı'
    if u=='CITY LIFE 2': return 'City Life 2',''
    m=re.match(r'^(.*?)[ _](\d)$',u)
    if m and not u.startswith('SITE '): return ad(m.group(1)), m.group(2)+'. açı'
    return ad(l),''
P=[];idx={}
for o in M:
    g,v=grup(o['ad'])
    if g is None: continue
    idx[o['id']]=len(P); P.append([o,g,v])
out=[]
for o,g,v in P:
    hs=[]
    for h in o['hs']:
        t=idx.get(h['t'],-1) if h['t'] else -1
        a=ad(h['l']) or (P[t][1] if t>=0 else '')
        if not a and t<0: continue
        hy,hp=fix(h,RES)
        hs.append([round(hy,2),round(hp,2),a,t]+([round(h['ty'],1),round(h['tp'],1)] if h.get('ty') is not None and t>=0 else []))
    out.append({'id':o['id'].split('_',1)[1],'g':g,'v':v,'r':o['lv'][0][1],'y':round(o['y'],1),'p':round(o['p'],1),'h':hs})
(R/'assets/kibris360').mkdir(parents=True,exist_ok=True)
(R/'assets/kibris360/data.js').write_text('// Kaynak: tools/kibris360 (otomatik üretilir)\nwindow.K360='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
gs=[]
for x in out:
    if x['g'] not in gs: gs.append(x['g'])
print(len(out),'panorama',len(gs),'proje');print(gs)
