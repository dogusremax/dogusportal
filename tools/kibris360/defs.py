"""3DVista script_general.js + locale/en.txt -> defs.json, loc.json (çalıştırmadan, metin olarak ayrıştırır)
Kullanım: python3 -I defs.py <tur_klasoru> <cikti_klasoru>"""
import re,json,sys,pathlib
src,out=pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(src/'script_general.js').read_text()
i=s.find('"definitions":');j=s.index('[',i);d=0;k=j;ins=False;q=''
while True:
    c=s[k]
    if ins:
        if c=='\\': k+=2; continue
        if c==q: ins=False
    else:
        if c in '"\'': ins=True;q=c
        elif c=='[': d+=1
        elif c==']':
            d-=1
            if d==0: break
    k+=1
a=re.sub(r"trans\('([^']*)'\)",lambda m:json.dumps('@'+m.group(1)),s[j:k+1])
D=json.loads(a);json.dump(D,open(out/'defs.json','w'))
L={}
for ln in (src/'locale/en.txt').read_text(errors='replace').splitlines():
    if '=' in ln: x,v=ln.split('=',1);L[x.strip()]=v
json.dump(L,open(out/'loc.json','w'),ensure_ascii=False)
from collections import Counter;print(len(D),Counter(x.get('class') for x in D).most_common(12))
