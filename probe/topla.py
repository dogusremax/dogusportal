import re, urllib.request, os, sys
UA = "WhatsApp/2.23.20.0"
os.makedirs("probe/img", exist_ok=True)
urls = []
qs=[]
for b in ["satilik-daire/istanbul-kadikoy","kiralik-daire/istanbul-uskudar","satilik-daire/istanbul-atasehir","kiralik-daire/istanbul-kadikoy","satilik-isyeri/istanbul","satilik-daire/ankara-cankaya"]:
    for o in [0,20,40,60]: qs.append(b+("?pagingOffset=%d"%o if o else ""))
for q in qs:
    try:
        h = urllib.request.urlopen(urllib.request.Request("https://www.sahibinden.com/" + q, headers={"User-Agent": UA}), timeout=20).read().decode("utf8", "ignore")
        f = re.findall(r'https://i\d\.shbdn\.com/photos/[^"\s]+?\.jpg', h)
        print(q, len(h), len(f)); urls += f
    except Exception as e: print(q, e)
seen = set(); n = 0
for u in urls:
    u = re.sub(r'/(lthmb|thmb|x5|big)_', '/', u); u = re.sub(r'(/photos/\d+/\d+/\d+/)', r'\1big_', u)
    if u in seen: continue
    seen.add(u)
    try:
        d = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=20).read()
        open("probe/img/b%03d.jpg" % n, "wb").write(d); n += 1
    except Exception as e: print(u, e)
    if n >= 260: break
print("indirilen", n)
