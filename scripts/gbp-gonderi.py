# Google İşletme gönderisi (Umut, 26.10.2026): @remaxdogus "GÜNCEL PROJELER" kapaklı Fikirtepe reels'lerinden.
# Sıra gbp-gonderi/sira.json, paylaşılanlar gbp-gonderi/yayinlanan.json. Görsel 1200x900 (bulanık zemin + kapak).
# Kullanım: python3 scripts/gbp-gonderi.py onizleme   → sıradakinin görseli + metni (paylaşmaz)
#           python3 scripts/gbp-gonderi.py paylas      → sıradakini paylaşır (GOOGLE_PLACES_KEY gerekir)
# Zamanlama: Danışman Takip ZAMANLI_ISLER_ 11:00 gbpGonderiTetikle (Salı ve Cuma); gbp-gonderi/.canli yoksa paylaşmaz.
import json, os, re, sys, urllib.request, urllib.parse
from PIL import Image, ImageFilter

D = 'gbp-gonderi'
aday = {x['id']: x for x in json.load(open(f'{D}/aday.json'))}
sira = json.load(open(f'{D}/sira.json'))
try: yayin = json.load(open(f'{D}/yayinlanan.json'))
except Exception: yayin = []
bitti = {y['id'] for y in yayin}
siradaki = next((i for i in sira if i not in bitti), None)
if not siradaki: print('Sırada gönderi kalmadı'); sys.exit(0)
m = aday[siradaki]

def gorsel(id_):
    k = Image.open(f'{D}/aday/{id_}.jpg').convert('RGB')
    W, H = 1200, 900
    zemin = k.resize((W, int(k.height * W / k.width))).crop((0, 300, W, 300 + H)).filter(ImageFilter.GaussianBlur(28))
    zemin = Image.blend(zemin, Image.new('RGB', (W, H), (5, 10, 48)), 0.35)
    on = k.resize((int(k.width * H / k.height), H))
    zemin.paste(on, ((W - on.width) // 2, 0))
    os.makedirs(f'{D}/gorsel', exist_ok=True)
    yol = f'{D}/gorsel/{id_}.jpg'
    zemin.save(yol, quality=88)
    return yol

EMOJI = re.compile('[\U0001F000-\U0001FFFF☀-➿️‍⬀-⯿]')
def metin(aciklama):
    satirlar = []
    for s in (aciklama or '').split('\n'):
        if re.search(r'\d{3}\s?\d{2,3}\s?\d{2}|detaylı bilgi|randevu|güvencesiyle', s, re.I): continue   # telefonlu satırlar Google'da reddedilir
        madde = s.lstrip().startswith(('✔', '✅', '-', '•'))
        s = re.sub(r'#\S+', '', EMOJI.sub('', s)).strip().lstrip('-• ').strip()
        if madde and s: s = '• ' + s
        satirlar.append(s)
    t = re.sub(r'\n{3,}', '\n\n', '\n'.join(satirlar)).strip()
    son = "Fikirtepe ve Dumlupınar'da satılık ve kiralık daireler, güncel proje bilgileri için Fikirtepe'deki RE/MAX Doğuş ofisimize uğrayabilir ya da bizi arayabilirsiniz."
    return (t[:1500 - len(son) - 2].rsplit('\n', 1)[0] if len(t) > 1500 - len(son) - 2 else t) + '\n\n' + son

yol = gorsel(siradaki)
govde = metin(m['aciklama'])
print('ID', siradaki, m['link']); print(govde)
json.dump({'id': siradaki, 'gorsel': yol, 'metin': govde, 'link': m['link']}, open(f'{D}/siradaki.json', 'w'), ensure_ascii=False, indent=1)

if (sys.argv[1:] or ['onizleme'])[0] != 'paylas': sys.exit(0)
k = json.loads(os.environ['GOOGLE_PLACES_KEY'])
def istek(url, veri=None, tok=None, form=False):
    h = {'Authorization': 'Bearer ' + tok} if tok else {}
    if veri is not None:
        if form: veri = urllib.parse.urlencode(veri).encode()
        else: veri = json.dumps(veri).encode(); h['Content-Type'] = 'application/json'
    return json.load(urllib.request.urlopen(urllib.request.Request(url, data=veri, headers=h)))
tok = istek('https://oauth2.googleapis.com/token', {'client_id': k['client_id'], 'client_secret': k['client_secret'], 'refresh_token': k['refresh_token'], 'grant_type': 'refresh_token'}, form=True)['access_token']
hesap = konum = None
for h in istek('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', tok=tok).get('accounts', []):
    for l in istek(f"https://mybusinessbusinessinformation.googleapis.com/v1/{h['name']}/locations?readMask=name,title&pageSize=100", tok=tok).get('locations', []):
        if re.search('fikirtepe', l['title'], re.I): hesap, konum = h['name'], l['name']
sha = os.environ.get('GORSEL_SHA', 'main')
url = f'https://raw.githubusercontent.com/dogusremax/dogusportal/{sha}/{yol}'
r = istek(f'https://mybusiness.googleapis.com/v4/{hesap}/{konum}/localPosts', {
    'languageCode': 'tr', 'topicType': 'STANDARD', 'summary': govde,
    'media': [{'mediaFormat': 'PHOTO', 'sourceUrl': url}], 'callToAction': {'actionType': 'CALL'}}, tok=tok)
print('Paylaşıldı:', r.get('name'), r.get('state'), r.get('searchUrl'))
yayin.append({'id': siradaki, 'zaman': r.get('createTime'), 'google': r.get('name'), 'link': r.get('searchUrl')})
json.dump(yayin, open(f'{D}/yayinlanan.json', 'w'), ensure_ascii=False, indent=1)
