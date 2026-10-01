#!/usr/bin/env python3
"""Tarayıcıdan çekilen yeni Google yorumlarını data/google-yorumlar.json'a ekler.

Kullanım: python3 scripts/google-yorum-ekle.py cekilen.json
cekilen.json: scripts/google-yorum-tarayici.js çıktısı ({"puan","toplam","yuklenen","yeni":[...]}).
Araç çıktısı dosyaya kaydedildiyse ([{"type":"text","text":"..."}] biçimi) o da kabul edilir.

Kurallar: sadece 4★ ve üzeri, data/danismanlar.json'daki danışmanlardan en az birinin adı geçen
yorumlar listeye girer. Metninde danışman adı geçmeyen yorumlarda yorumu yazanın adı kapanış
formundaki mal sahibi / alıcı-kiracı adlarıyla eşleştirilir (önce ad+soyad, yoksa soyad); yorum,
müşterinin tarafını temsil eden (o taraftan hizmet bedeli alan) danışman aktifse ona yazılır. Aynı
tarafı birden çok danışman sahipleniyorsa (co-op) atama yapılmaz, raporda "taraf belirsiz" çıkar. Eşleşmeyen yeni (30 günden genç) isimsiz
yorumlar görülen listesine yazılmaz; kapanış formu sonradan doldurulursa sonraki çalışmada eşleşir.
Görülen tüm yorum id'leri data/google-yorum-gorulen.json'a yazılır.
"""
import json, re, sys, datetime, urllib.request

VERI, GORULEN, DANISMAN = 'data/google-yorumlar.json', 'data/google-yorum-gorulen.json', 'data/danismanlar.json'
KAPANIS_URL = 'https://script.google.com/macros/s/AKfycby3N2cq5LI99_UgjzlxIjZr7looJz88Rft-BJ9E5ZgP9-ZmUEmoXARoIm717JAmTGuD/exec?action=getRecords'

def norm(s):
    return (s or '').replace('ș', 'ş').replace('Ș', 'Ş').replace('İ', 'i').replace('I', 'ı').lower()

def yaklasik_tarih(once, simdi):
    m = re.search(r'(\d+|bir) (dakika|saat|gün|hafta|ay|yıl) önce', once or '')
    if not m:
        return simdi
    n = 1 if m.group(1) == 'bir' else int(m.group(1))
    gun = {'dakika': 1 / 1440, 'saat': 1 / 24, 'gün': 1, 'hafta': 7, 'ay': 30.4, 'yıl': 365}[m.group(2)]
    return simdi - datetime.timedelta(days=n * gun)

def sade(s):
    """İsim karşılaştırması için: küçük harf, Türkçe karakterler ASCII, sadece harf kelimeleri."""
    s = norm(s).translate(str.maketrans('çğıöşüâî', 'cgiosuai'))
    return [k for k in re.findall(r'[a-z]+', s) if len(k) > 1]

def kapanislari_al():
    try:
        return json.load(urllib.request.urlopen(KAPANIS_URL, timeout=90)).get('records') or []
    except Exception as e:
        print('UYARI: kapanış formu okunamadı, isimsiz yorumlar eşleştirilemedi:', e)
        return []

def kapanistan_danisman(yazar, tarih, kapanislar, desenler):
    """Yorumu yazanı kapanış formundaki müşteri adlarıyla eşleştirir; (danışman id'leri, neden) döndürür.
    Tek danışmanlı işlemde müşteri o danışmanındır. Müşteri birden fazla danışmanın kaydındaysa (co-op)
    yorum, müşterinin tarafını temsil eden, yani kaydında o taraftan hizmet bedeli alan danışmana yazılır;
    bu da tek danışmana inmiyorsa taraf belirsizdir, atama yapılmaz."""
    y = sade(yazar)
    if not y:
        return [], 'eşleşmedi'
    bedel = lambda v: float(re.sub(r'[^0-9.]', '', str(v or '')) or 0)
    tam, soyad = [], []
    for k in kapanislar:
        try:
            kt = datetime.datetime.strptime(str(k.get('date', ''))[:10], '%Y-%m-%d')
        except ValueError:
            continue
        if not (tarih - datetime.timedelta(days=120) <= kt <= tarih + datetime.timedelta(days=3)):
            continue
        hb_sahip, hb_alici = bedel(k.get('hbOwner')), bedel(k.get('hbBuyer'))
        for ad, hb in ((k.get('ownerName'), hb_sahip), (k.get('buyerName'), hb_alici)):
            a = sade(ad)
            if not a:
                continue
            if len(y) > 1 and all(t in a for t in y):
                tam.append((k, hb))
            elif len(y[-1]) >= 4 and y[-1] == a[-1]:
                soyad.append((k, hb))
    eslesen = tam or soyad
    danismanlar = {norm(k.get('advisor', '')) for k, _ in eslesen}
    if len(danismanlar) > 1:   # co-op: müşterinin tarafından bedel alan danışman
        danismanlar = {norm(k.get('advisor', '')) for k, hb in eslesen if hb > 0}
        if len(danismanlar) != 1:
            return [], 'taraf belirsiz (co-op: ' + ', '.join(sorted({k.get('advisor', '') for k, _ in eslesen})) + ')'
    if not danismanlar:
        return [], 'eşleşmedi'
    d = danismanlar.pop()
    ids = [i for i, p in desenler if p.search(d)]
    return ids, ('' if ids else 'danışman aktif değil')

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

    mevcut = {y['id'] for y in veri['yorumlar']}
    kapanislar = None
    eklenen, bekleyen = [], []
    for y in cekilen.get('yeni', []):
        if y['id'] in gorulen or y['id'] in mevcut:   # elle eklenmiş olabilir
            gorulen.add(y['id'])
            continue
        if y.get('puan', 0) < 4:
            gorulen.add(y['id'])
            continue
        tarih = yaklasik_tarih(y.get('once'), simdi)
        danismanlar = [i for i, p in desenler if p.search(norm(y.get('metin')))]
        eslesme = 'metin'
        if not danismanlar:
            if kapanislar is None:
                kapanislar = kapanislari_al()
            danismanlar, y['_neden'] = kapanistan_danisman(y.get('yazar'), tarih, kapanislar, desenler)
            eslesme = 'kapanis'
        if not danismanlar:
            if simdi - tarih < datetime.timedelta(days=30) and y.get('_neden') != 'danışman aktif değil':
                bekleyen.append(y)          # görülen'e yazma: kapanış formu doldurulunca tekrar denenecek
            else:
                gorulen.add(y['id'])
            continue
        gorulen.add(y['id'])
        t = ts(tarih)
        kayit = {
            'id': y['id'], 'yazar': y.get('yazar', ''), 'yazarUrl': y.get('yazarUrl', ''), 'foto': y.get('foto', ''),
            'puan': y['puan'], 'metin': y.get('metin', ''), 'yanit': y.get('yanit', ''),
            'tarih': t, 'tarihYaklasik': True, 'once': (y.get('once') or '').replace(' düzenlendi', ''),
            'danismanlar': danismanlar, 'eslesme': eslesme, 'kaynak': 'tarayici', 'ilkGorulme': ts(simdi),
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
        print(' +', ', '.join(ad[i] for i in k['danismanlar']), '|', k['yazar'], '|', k['metin'][:80].replace('\n', ' '),
              '| (kapanış formundan eşleşti)' if k['eslesme'] == 'kapanis' else '')
    for y in bekleyen:
        print(' ?', y.get('_neden', 'eşleşmedi') + ', sonraki çalışmada tekrar denenecek |', y.get('yazar'), '|', (y.get('metin') or '(metinsiz)')[:80].replace('\n', ' '))

if __name__ == '__main__':
    main()
