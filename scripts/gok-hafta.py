# Bir haftanın (Pzt-Paz, Türkiye saati) gerçek gök olaylarını efemeris ile hesaplar ve JSON yazar.
# Kullanım: python3 scripts/gok-hafta.py 2026-10-19
# Çıktı: {"hafta": "...", "olaylar": ["21 Ekim: ...", ...], "durum": ["Güneş Terazi'de", "Merkür retroda", ...]}
import sys, json, math, datetime as dt
import ephem

BURC = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık']
BULUNMA = ["Koç'ta", "Boğa'da", "İkizler'de", "Yengeç'te", "Aslan'da", "Başak'ta", "Terazi'de", "Akrep'te", "Yay'da", "Oğlak'ta", "Kova'da", "Balık'ta"]
YONELME = ["Koç'a", "Boğa'ya", "İkizler'e", "Yengeç'e", "Aslan'a", "Başak'a", "Terazi'ye", "Akrep'e", "Yay'a", "Oğlak'a", "Kova'ya", "Balık'a"]
AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
GEZEGEN = [('Güneş', ephem.Sun), ('Merkür', ephem.Mercury), ('Venüs', ephem.Venus), ('Mars', ephem.Mars),
           ('Jüpiter', ephem.Jupiter), ('Satürn', ephem.Saturn)]
TR = dt.timedelta(hours=3)   # Türkiye: sabit UTC+3


def boylam(cls, t):
    b = cls(); b.compute(ephem.Date(t), epoch=ephem.Date(t))
    return math.degrees(float(ephem.Ecliptic(b, epoch=ephem.Date(t)).lon)) % 360


def ay_enlem(t):
    m = ephem.Moon(); m.compute(ephem.Date(t), epoch=ephem.Date(t))
    return math.degrees(float(ephem.Ecliptic(m, epoch=ephem.Date(t)).lat))


def tarih(t):
    y = t + TR
    return f'{y.day} {AY[y.month - 1]}'


def hesapla(pzt):
    bas = dt.datetime.combine(pzt, dt.time(0)) - TR          # Pzt 00:00 TR, UTC olarak
    son = bas + dt.timedelta(days=7)
    olay = []                                                 # (zaman, metin)
    durum = []
    adim = dt.timedelta(hours=2)
    for ad, cls in GEZEGEN:
        t = bas - adim
        onceki = boylam(cls, t); onceki_hiz = None
        while t < son:
            t2 = t + adim
            l2 = boylam(cls, t2)
            hiz = ((l2 - onceki + 180) % 360) - 180
            if t2 >= bas:
                if int(onceki // 30) != int(l2 // 30):
                    i = int(l2 // 30)
                    if hiz > 0:
                        olay.append((t2, f"{tarih(t2)}: {ad} {YONELME[i]} geçiyor" + (f" ({BURC[i]} sezonu başlıyor)" if ad == 'Güneş' else '')))
                    else:
                        olay.append((t2, f"{tarih(t2)}: {ad} geri hareketle {YONELME[i]} dönüyor"))
                if onceki_hiz is not None and ad != 'Güneş' and (onceki_hiz > 0) != (hiz > 0):
                    yer = BULUNMA[int(l2 // 30)]
                    if hiz < 0:
                        olay.append((t2, f"{tarih(t2)}: {ad} {yer} geri hareketine (retro) başlıyor"))
                    else:
                        olay.append((t2, f"{tarih(t2)}: {ad} retrosu bitiyor, {yer} düz harekete geçiyor"))
            onceki, onceki_hiz, t = l2, hiz, t2
        # hafta başındaki durum
        l0 = boylam(cls, bas); l1 = boylam(cls, bas + dt.timedelta(hours=12))
        geri = (((l1 - l0 + 180) % 360) - 180) < 0
        durum.append(f"{ad} {BULUNMA[int(l0 // 30)]}" + (' (retroda)' if geri and ad != 'Güneş' else ''))
    # Yeni Ay / Dolunay (+ tutulma)
    for fn, tur in ((ephem.next_new_moon, 'Yeni Ay'), (ephem.next_full_moon, 'Dolunay')):
        t = fn(ephem.Date(bas - dt.timedelta(days=1))).datetime()
        if bas <= t < son:
            m = ephem.Moon(); m.compute(ephem.Date(t), epoch=ephem.Date(t))
            lon = math.degrees(float(ephem.Ecliptic(m, epoch=ephem.Date(t)).lon)) % 360
            enlem = abs(ay_enlem(t))
            tutulma = ''
            if tur == 'Yeni Ay' and enlem < 1.5: tutulma = ' ve Güneş tutulması'
            if tur == 'Dolunay' and enlem < 1.5: tutulma = ' ve Ay tutulması'
            olay.append((t, f"{tarih(t)}: {BULUNMA[int(lon // 30)]} {tur}{tutulma}"))
    olay.sort(key=lambda x: x[0])
    return {'hafta': pzt.isoformat(), 'olaylar': [o[1] for o in olay], 'durum': durum}


if __name__ == '__main__':
    pzt = dt.date.fromisoformat(sys.argv[1])
    if pzt.weekday() != 0:
        pzt = pzt - dt.timedelta(days=pzt.weekday())
    print(json.dumps(hesapla(pzt), ensure_ascii=False, indent=1))
