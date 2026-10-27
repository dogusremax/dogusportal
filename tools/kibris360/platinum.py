"""Döveç turunda Courtyard Platinum düzeltmesi (dovec.py'den sonra çalıştır: python3 platinum.py).
3DVista'daki 'Courtyard Platinum' sahnesi aslında Long Beach'teki eski Courtyard sitesinin havadan görüntüsü;
güncel Courtyard Platinum görüntüsü turda 'Platinum' adlı sahne. Eski sahne çıkarılır, 'Platinum' sahnesi
'Courtyard Platinum' adıyla eskisinin yerine geçer; eskiye giden pinler yenisine yönlenir
(aynı sahnede Döveç'in kendi 'Platinum' pini varsa eskisi atılır)."""
import json,pathlib
F=pathlib.Path(__file__).resolve().parents[2]/'assets/kibris360/data-dovec.js'
t=F.read_text();h,_,b=t.partition('window.K360=');K=json.loads(b.rstrip().rstrip(';'))
eski=[i for i,k in enumerate(K) if k['g']=='Courtyard Platinum']
yeni=[i for i,k in enumerate(K) if k['g']=='Platinum']
if not yeni: print('zaten düzeltilmiş');raise SystemExit
eski,yeni=eski[0],yeni[0]
K[yeni]['g']='Courtyard Platinum';K[yeni]['v']=''
sira=[i for i in range(len(K)) if i not in (eski,yeni)];sira.insert(eski,yeni)
m={o:n for n,o in enumerate(sira)}
for k in K:
    var=any(x[3]==yeni for x in k['h']);hs=[]
    for x in k['h']:
        if x[3]==eski:
            if var or k is K[yeni]: continue
            x=[x[0],x[1],'Courtyard Platinum',yeni]
        elif x[3]==yeni: x=[x[0],x[1],'Courtyard Platinum']+x[3:]
        hs.append(x[:3]+[m[x[3]]]+x[4:])
    k['h']=hs
F.write_text(h+'window.K360='+json.dumps([K[i] for i in sira],ensure_ascii=False,separators=(',',':'))+';\n')
print('eski',eski,'çıkarıldı; Platinum',yeni,'->',m[yeni])
