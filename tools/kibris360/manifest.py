import json,re
D=json.load(open('defs.json'));L=json.load(open('loc.json'))
by={x['id']:x for x in D if 'id' in x}
def T(v): return L.get(v[1:],v).strip() if isinstance(v,str) and v.startswith('@') else v
def ref(s): return s.replace('this.','') if isinstance(s,str) else s
mp=by['mainPlayList']
pli={};order=[];allidx=[]
for it in mp['items']:
    o=it if isinstance(it,dict) else by.get(ref(it)); m=ref(o.get('media')) if o else None
    allidx.append(m)
    if o and o['class']=='PanoramaPlayListItem':
        order.append(m)
        if 'id' in o: pli[o['id']]=m
out=[]
for pid in order:
    p=by[pid]; cam=by.get(pid+'_camera',{}); ip=cam.get('initialPosition',{})
    lv=p['frames'][0]['cube']['levels']; base=lv[0]['url'].split('/{face}')[0]
    hs=[]
    for o in p.get('overlays',[]):
        o=o if isinstance(o,dict) else by.get(ref(o))
        if not o or o['class']!='HotspotPanoramaOverlay': continue
        it=o['items'][0] if o.get('items') else None
        if not it or 'yaw' not in it: continue
        lab=(o.get('data') or {}).get('label') or (it.get('data') or {}).get('label') or ''
        tgt=None;ty=tp=None;cls=''
        for a in o.get('areas',[]):
            cl=(a if isinstance(a,dict) else by.get(ref(a),{})).get('click','') or ''; cls+=cl
            m=re.search(r'setPanoramaCameraWithSpot\(this\.mainPlayList, this\.(PanoramaPlayListItem_[0-9A-F_]+), ([-\d.e]+), ([-\d.e]+)',cl)
            if m: tgt=pli.get(m.group(1)); ty=float(m.group(2)); tp=float(m.group(3))
            else:
                m2=re.search(r"mainPlayList.{0,40}selectedIndex', *(\d+)",cl) or re.search(r"setPlayListSelectedIndex\(this\.mainPlayList, *(\d+)\)",cl)
                if m2: tgt=allidx[int(m2.group(1))]
        im0=it.get('image');img=im0 if isinstance(im0,dict) else by.get(ref(im0),{});iu=None
        try:
            l0=img['levels'][0]; iu=(l0 if isinstance(l0,dict) else by[ref(l0)])['url']
        except Exception: pass
        hs.append(dict(y=it['yaw'],p=it['pitch'],l=lab,t=tgt,ty=ty,tp=tp,hf=it.get('hfov'),vf=it.get('vfov'),img=iu,c=cls[:300] if not tgt else ''))
    out.append(dict(id=pid,ad=T(p.get('label')),b=base,lv=[[l['width']//6,l['rowCount']] for l in lv],ext=lv[0]['url'].rsplit('.',1)[1],th=p.get('thumbnailUrl') or p['frames'][0].get('thumbnailUrl'),y=ip.get('yaw',0),p=ip.get('pitch',0),hs=hs))
json.dump(out,open('manifest.json','w'),ensure_ascii=False)
