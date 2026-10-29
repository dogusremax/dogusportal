#!/usr/bin/env python3
# Danışmanların remax.com.tr profillerinden müşteri yorumlarını, e-posta ve sosyal medya hesaplarını
# data/remax-profil.json'a yazar (danisman.html kişisel sitelerde gösterir). Profil adresleri data/danismanlar.json'dan.
# Çalıştır: python3 scripts/remax-profil.py   (remax-profil.yml her gün çalıştırır)
import json, re, urllib.request

ekip = json.load(open('data/danismanlar.json'))
SOSYAL = ['facebook', 'linkedin', 'twitter', 'youtube']

def temiz(u):
    # LinkedIn adresinin sonuna yazılmış fazlalıkları ve paylaşım izleme parametrelerini at
    m = re.match(r'https?://(?:www\.)?linkedin\.com/in/[^/?\s]+', u)
    if m:
        return m.group(0).replace('http://', 'https://') + '/'
    a, _, q = u.partition('?')
    q = '&'.join(x for x in q.split('&') if x and not re.match(r'(utm_\w+|mibextid|s|igsh|locale)=', x))
    return a + ('?' + q if q else '')

def sayfa(url):
    t = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read().decode('utf-8')
    return ''.join(json.loads('"' + m + '"') for m in re.findall(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)', t))

eski = {}
try:
    eski = json.load(open('data/remax-profil.json'))
except Exception:
    pass

cikti = {}
for d in ekip:
    if not d.get('remax'):
        continue
    try:
        s = sayfa(d['remax'])
        i = s.index('"employeeData":')
        e = json.JSONDecoder().raw_decode(s[i + len('"employeeData":'):])[0]['data']
    except Exception as x:
        print(d['id'], 'okunamadı, eski veri kalıyor:', x)
        if d['id'] in eski:
            cikti[d['id']] = eski[d['id']]
        continue
    yorumlar = [{'yazar': (r.get('name', '') + ' ' + r.get('surname', '')).strip(), 'puan': r.get('point'),
                 'metin': (r.get('comment') or '').strip(), 'tarih': r.get('dateSort')}
                for r in e.get('reviews') or [] if not r.get('isAnswer')]
    sosyal = {k: temiz(e[k]) for k in SOSYAL if isinstance(e.get(k), str) and e[k].startswith('http')}
    cikti[d['id']] = {'eposta': e.get('email'), 'sosyal': sosyal, 'yil': e.get('activeYear'),
                      'bolgeler': e.get('areas') or [], 'diller': e.get('languages') or [],
                      'yorumSayisi': e.get('reviewsCount'), 'puan': e.get('reviewsAvgPoint'), 'yorumlar': yorumlar}
    print(d['id'], len(yorumlar), 'yorum')

open('data/remax-profil.json', 'w').write(json.dumps(cikti, ensure_ascii=False, indent=1))
