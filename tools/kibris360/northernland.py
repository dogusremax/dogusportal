"""Northernland turu: Grand Sapphire Blu (data-sapphire.js) + Casa del Mare (data-casadelmare.js) -> data-northernland.js
Diğer firmalarla aynı yapı: 'g' proje, 'v' projenin bölümü · görünümü; her sahne kendi görüntü kaynağını 's' alanında taşır.
Kullanım: python3 northernland.py (sapphire.py / casadelmare.py yeniden üretildikten sonra)"""
import json,pathlib
A=pathlib.Path(__file__).resolve().parents[2]/'assets/kibris360'
PR=[('data-sapphire.js','Grand Sapphire Blu','https://360.northernland.com/blu/media'),
    ('data-casadelmare.js','Casa del Mare','https://360.northernland.com/casadelmare/media')]
out=[]
for f,ad,src in PR:
    K=json.loads((A/f).read_text().split('window.K360=',1)[1].rstrip().rstrip(';'));o=len(out)
    for k in K:
        k=dict(k);k["v"]=k["g"]+(" · "+k["v"] if k["v"] and k["v"]!="Genel" else "");k['g']=ad;k.setdefault('s',src)
        k['h']=[h[:3]+[h[3]+o if h[3]>=0 else h[3]]+h[4:] for h in k['h']];out.append(k)
(A/'data-northernland.js').write_text('// Kaynak: tools/kibris360/northernland.py (otomatik üretilir)\nwindow.K360='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(out),'sahne')
