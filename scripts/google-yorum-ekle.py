#!/usr/bin/env python3
"""Tarayıcıdan çekilen yeni Google yorumlarını data/google-yorumlar.json'a ekler.

Kullanım: python3 scripts/google-yorum-ekle.py cekilen.json
cekilen.json: scripts/google-yorum-tarayici.js çıktısı ({"puan","toplam","yuklenen","yeni":[...]}).
Araç çıktısı dosyaya kaydedildiyse ([{"type":"text","text":"..."}] biçimi) o da kabul edilir.

Kurallar: sadece 4★ ve üzeri, data/danismanlar.json'daki danışmanlardan en az birinin adı geçen
yorumlar listeye girer. Görülen tüm yorum id'leri data/google-yorum-gorulen.json'a yazılır.
"""
import json, re, sys, datetime

VERI, GORULEN, DANISMAN = 'data/google-yorumlar.json', 'data/google-yorum-gorulen.json', 'data/danismanlar.json'

def norm(s):
    return (s or '').replace('ș', 'ş').replace('Ș', 'Ş').replace('İ', 'i').replace('I', 'ı').lower()

def yaklasik_tarih(once, simdi):
    m = re.search(r'(\d+|bir) (dakika|saat|gün|hafta|ay|yıl) önce', once or '')
    if not m:
        return simdi
    n = 1 if m.group(1) == 'bir' else int(m.group(1))
    gun = {'dakika': 1 / 1440, 'saat': 1 / 24, 'gün': 1, 'hafta': 7, 'ay': 30.4, 'yıl': 365}[m.group(2)]
    return simdi - datetime.timedelta(days=n * gun)

def main():
    cekilen = json.load(open(sys.argv[1]))
    # Araç çıktısı sarmalayıcısı ve JSON içinde JSON metni olabilir
    if isinstance(cekilen, list):
        cekilen = ''.join(p.get('text', '') for p in cekilen if isinstance(p, dict))
    while isinstance(cekilen, str):
        m = re.search(r'"(?:\\.|[^"\\])*"|\{.*\}', cekilen, re.S)
        cekilen = json.loads(m.group(0))
    if cekilen.get('hata'):
        sys.exit('Tarayıcı hatası: ' + cekilen['hata'])
    veri = json.load(open(VERI))
    gorulen = set(json.load(open(GORULEN)))
    desenler = [(d['id'], re.compile(r'(?<![a-zçğıöşü])(?:' + d['desen'] + ')')) for d in json.load(open(DANISMAN))]
    simdi = datetime.datetime.utcnow()
    ts = lambda t: t.strftime('%Y-%m-%dT%H:%M:%SZ')

    eklenen = []
    for y in cekilen.get('yeni', []):
        if y['id'] in gorulen:
            continue
        gorulen.add(y['id'])
        danismanlar = [i for i, p in desenler if p.search(norm(y.get('metin')))]
        if y.get('puan', 0) < 4 or not danismanlar:
            continue
        t = ts(yaklasik_tarih(y.get('once'), simdi))
        kayit = {
            'id': y['id'], 'yazar': y.get('yazar', ''), 'yazarUrl': y.get('yazarUrl', ''), 'foto': y.get('foto', ''),
            'puan': y['puan'], 'metin': y.get('metin', ''), 'yanit': y.get('yanit', ''),
            'tarih': t, 'tarihYaklasik': True, 'once': (y.get('once') or '').replace(' düzenlendi', ''),
            'danismanlar': danismanlar, 'kaynak': 'tarayici', 'ilkGorulme': ts(simdi),
        }
        veri['yorumlar'].append(kayit)
        eklenen.append(kayit)

    veri['yorumlar'].sort(key=lambda y: y.get('tarih', ''), reverse=True)
    if cekilen.get('puan'):
        veri['puan'] = cekilen['puan']
    if cekilen.get('toplam'):
        veri['toplam'] = cekilen['toplam']
    veri.pop('hata', None)
    veri['guncelleme'] = ts(simdi)
    json.dump(veri, open(VERI, 'w'), ensure_ascii=False, indent=1)
    json.dump(sorted(gorulen), open(GORULEN, 'w'), indent=0)

    ad = {d['id']: d['ad'] for d in json.load(open(DANISMAN))}
    print(f"Google: {veri['puan']}★ · {veri['toplam']} yorum | yüklenen {cekilen.get('yuklenen')} | "
          f"yeni görülen {len(cekilen.get('yeni', []))} | listeye eklenen {len(eklenen)}")
    for k in eklenen:
        print(' +', ', '.join(ad[i] for i in k['danismanlar']), '|', k['yazar'], '|', k['metin'][:80].replace('\n', ' '))

if __name__ == '__main__':
    main()
