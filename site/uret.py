#!/usr/bin/env python3
# Her danisman icin ozlemvarol.com sablonunda kisisel site uretir: site/<ad>/index.html + teslim-takvimi.html
# index = danisman.html (varsayilan id o danisman), teslim takvimi = yenifikirtepeburada.com/teslim-takvimi.html
# (WhatsApp/telefon danismanin). Gorsel ve veri yollari tam adres oldugundan klasor alan adina oldugu gibi tasinabilir.
# Calistir: python3 site/uret.py   (danisman.html ya da teslim takvimi degisince yeniden calistir)
import json, os, re, urllib.request

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DP, YF = 'https://dogusportal.com/', 'https://yenifikirtepeburada.com/'
# id -> site klasoru (alan adi alininca <klasor>.com olacak)
SITELER = {'gamze': 'gamzeyetkin', 'irem': 'iremtetik', 'aysegul_alpay': 'aysegulalpay', 'aysun': 'aysunyilmaz',
           'evsen': 'evsenozazman', 'orhan': 'orhanozazman', 'gizem': 'gizemgok'}

ekip = {d['id']: d for d in json.load(open(os.path.join(KOK, 'data/danismanlar.json')))}
veri = json.load(open(os.path.join(KOK, 'data/danisman-site.json')))
ana = open(os.path.join(KOK, 'danisman.html'), encoding='utf-8').read()
tes = urllib.request.urlopen(YF + 'teslim-takvimi.html').read().decode('utf-8')
KART = open(os.path.join(KOK, 'site/teslim-kart.html'), encoding='utf-8').read()

def degis(s, eski, yeni):
    if eski not in s:
        raise SystemExit('Kaynakta bulunamadi: ' + eski[:60])
    return s.replace(eski, yeni)

def index(i, ad, adres):
    s = re.sub(r'([("\'`])(assets|data)/', r'\1' + DP + r'\2/', ana)
    s = degis(s, "q.get('id')||''", "q.get('id')||'" + i + "'")
    s = degis(s, '<meta name="robots" content="noindex">', '<link rel="canonical" href="' + adres + '">')
    s = degis(s, '<title>Danışman · RE/MAX Doğuş</title>', '<title>' + ad + ' · RE/MAX Doğuş Gayrimenkul Danışmanı</title>')
    s = degis(s, 'content="RE/MAX Doğuş gayrimenkul danışmanı"', 'content="' + ad + ', RE/MAX Doğuş gayrimenkul danışmanı. Fikirtepe ve Kadıköy’de satılık ve kiralık konut."')
    # Etap teslim takvimi karti Yeni Fikirtepe kartinin altina
    s, n = re.subn(r'(<[^>]*id="yfAc".*?\n)', lambda m: m.group(1) + KART, s, count=1)
    if n != 1:
        raise SystemExit('yfAc bulunamadi')
    return s

def teslim(ad, tel, adres):
    s = degis(tes, '<title>Teslim Takvimi | Yeni Fikirtepe Blok ve Daire Teslim Tarihleri</title>',
              '<title>Teslim Takvimi · Yeni Fikirtepe | ' + ad + ', RE/MAX Doğuş</title>')
    s = s.replace(YF + 'teslim-takvimi.html', adres + 'teslim-takvimi.html')
    s = degis(s, '<meta property="og:site_name" content="Yeni Fikirtepe">', '<meta property="og:site_name" content="' + ad + '">')
    s = re.sub(r'<!-- Google tag \(gtag.js\) -->\s*<script src="cerez.js"[^>]*></script>\s*<script>.*?</script>\s*<script src="dil.js"></script>', '', s, count=1, flags=re.S)
    s = s.replace('<script src="telif.js" defer></script>', '')
    s, n = re.subn(r'<div class="navbar">.*?</nav>\s*</div>', '<header class="ov-ust"><a href="./" class="ov-marka"><img src="' + DP + 'assets/dogus-logo.webp" width="83" height="30" alt="RE/MAX Doğuş" onerror="this.onerror=null;this.src=\'' + DP + 'assets/dogus-logo.png\'"><i></i><span>' + ad + '</span></a><a href="./" class="ov-don">Ana sayfa</a></header>', s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit('Ust menu bulunamadi')
    s = degis(s, '</style>', '''  .ov-ust{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px max(20px,calc((100% - 960px)/2 + 24px));background:#050A30}
  .ov-marka{display:flex;align-items:center;gap:14px;text-decoration:none;color:#fff;font-weight:700;font-size:1.05rem}
  .ov-marka img{height:30px;width:auto;display:block}
  .ov-marka i{width:1px;height:26px;background:rgba(255,255,255,.35)}
  .ov-don{color:#fff;text-decoration:none;font-size:.9rem;font-weight:500;opacity:.85;border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:6px 14px;white-space:nowrap}
  .ov-don:hover{opacity:1}
</style>''')
    s = degis(s, '<a href="index.html" class="back">← Ana sayfa</a>', '<a href="./" class="back">← ' + ad + '</a>')
    s = re.sub(r'<script>\s*// mobilde bir linke .*?</script>', '', s, count=1, flags=re.S)
    for yol in ['favicon.png', 'balloon.png', 'kiralik-deger.html', 'vaziyet-plani.html', 'kat-planlari.html', 'etaplar.html']:
        s = s.replace('"' + yol, '"' + YF + yol)
    s = degis(s, "src='assets/vaziyet/", "src='" + YF + "assets/vaziyet/")
    s = degis(s, "fetch('teslim-takvimi.json", "fetch('" + YF + "teslim-takvimi.json")
    s = re.sub(r'(href="https://yenifikirtepeburada\.com/[^"]+")(?! target)', r'\1 target="_blank" rel="noopener"', s)
    return s.replace('wa.me/902163151515', 'wa.me/' + tel).replace('tel:+902163151515', 'tel:+' + tel)

for i, kl in SITELER.items():
    ad, tel = ekip[i]['ad'], veri[i]['telefon']
    adres = DP + 'site/' + kl + '/'
    os.makedirs(os.path.join(KOK, 'site', kl), exist_ok=True)
    for dosya, icerik in (('index.html', index(i, ad, adres)), ('teslim-takvimi.html', teslim(ad, tel, adres))):
        open(os.path.join(KOK, 'site', kl, dosya), 'w', encoding='utf-8').write(icerik)
    print(kl, 'yazildi')
