"""sahibinden fotoğraflarındaki filigranı (ortadaki çapraz sahibinden.com yazısı), sol üstteki ilan numarasını
ve sol alttaki ilan veren ofis logosunu siler (LaMa yapay zeka doldurma, ONNX, CPU).
Kullanım: python3 scripts/foto-temizle.py giris.jpg cikis.jpg [giris2.jpg cikis2.jpg ...]
Model: LAMA_MODEL (varsayılan lama_fp32.onnx; yoksa indirilir). Filigran kalıbı: scripts/sahibinden-filigran.npz
(215 sahibinden fotoğrafının ortanca kenar haritasından Poisson ile geri çatıldı)."""
import os, sys, time, urllib.request
import cv2, numpy as np

KOK = os.path.dirname(os.path.abspath(__file__))
MODEL = os.environ.get("LAMA_MODEL", "lama_fp32.onnx")
_oturum = None

def oturum():
    global _oturum
    if _oturum is None:
        import onnxruntime as ort
        if not os.path.exists(MODEL):
            urllib.request.urlretrieve("https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx", MODEL)
        so = ort.SessionOptions()
        if os.environ.get("LAMA_IS"): so.intra_op_num_threads = int(os.environ["LAMA_IS"])
        _oturum = ort.InferenceSession(MODEL, so, providers=["CPUExecutionProvider"])
    return _oturum

_K = np.load(os.path.join(KOK, "sahibinden-filigran.npz"))
TMASKE = _K["maske"].astype(np.uint8)
TX, TY = int(_K["xy"][0]), int(_K["xy"][1])          # 800 genişlik, 440 yükseklik orta şeritte konum

def filigran_maske(img):
    """Filigran her boyutta tam ortada ve aynı boyda (215 fotoğrafla ölçüldü); 450 pikselden dar fotoğrafta küçülür."""
    h, w = img.shape[:2]
    s = min(1.0, w / 400.0)
    tm = TMASKE * 255
    if s < 1: tm = cv2.resize(tm, (int(tm.shape[1] * s), int(tm.shape[0] * s)), interpolation=cv2.INTER_NEAREST)
    x = int(round(w / 2 + (TX + TMASKE.shape[1] / 2 - 400) * s - tm.shape[1] / 2))
    y = int(round(h / 2 + (TY + TMASKE.shape[0] / 2 - 220) * s - tm.shape[0] / 2))
    m = np.zeros((h, w), np.uint8)
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(w, x + tm.shape[1]), min(h, y + tm.shape[0])
    m[y0:y1, x0:x1] = tm[y0 - y:y1 - y, x0 - x:x1 - x]
    return cv2.dilate(m, np.ones((9, 9), np.uint8)), s

def maske(img):
    h, w = img.shape[:2]
    m, skor = filigran_maske(img)
    s = w / 800.0
    # sol alt: ilan veren ofisin logo kutusu
    m[int(h - 16 - 92 * s):h - 8, 6:int(18 + 122 * s)] = 255
    return m, skor

def lama(img, mk):
    S = oturum()
    h, w = img.shape[:2]
    a = cv2.resize(img, (512, 512), interpolation=cv2.INTER_AREA)[:, :, ::-1].astype(np.float32) / 255
    b = (cv2.resize(mk, (512, 512), interpolation=cv2.INTER_NEAREST) > 0).astype(np.float32)
    o = S.run(None, {S.get_inputs()[0].name: a.transpose(2, 0, 1)[None], S.get_inputs()[1].name: b[None, None]})[0][0].transpose(1, 2, 0)
    if o.max() <= 1.5: o = o * 255
    return cv2.resize(np.clip(o, 0, 255).astype(np.uint8)[:, :, ::-1], (w, h), interpolation=cv2.INTER_CUBIC)

def temizle(img):
    mk, skor = maske(img)
    h, w = img.shape[:2]
    # sol üst: #ilan numarası (küçük yazı, klasik doldurma yeter)
    nm = np.zeros((h, w), np.uint8); nm[6:26, 4:92] = 255
    out = cv2.inpaint(img, nm, 5, cv2.INPAINT_TELEA)
    k = cv2.dilate(mk, np.ones((31, 31), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(k, 8)
    for i in range(1, n):
        x, y, bw, bh = st[i, :4]
        c = min(max(bw, bh) + 48, w, h); cx, cy = x + bw // 2, y + bh // 2
        x0 = int(np.clip(cx - c // 2, 0, w - c)); y0 = int(np.clip(cy - c // 2, 0, h - c))
        if bw + 8 > c or bh + 8 > c:   # şerit kareye sığmıyorsa bütün görüntü
            x0, y0, cw, ch = 0, 0, w, h
        else: cw = ch = c
        alan = (lab[y0:y0 + ch, x0:x0 + cw] == i) & (mk[y0:y0 + ch, x0:x0 + cw] > 0)
        bm = alan.astype(np.uint8) * 255
        sub = lama(out[y0:y0 + ch, x0:x0 + cw], bm)
        a = cv2.GaussianBlur(alan.astype(np.float32), (7, 7), 0); a = np.maximum(a, alan)[:, :, None]
        out[y0:y0 + ch, x0:x0 + cw] = (sub * a + out[y0:y0 + ch, x0:x0 + cw] * (1 - a)).astype(np.uint8)
    return out, skor

def isle(cift):
    gir, cik = cift
    t = time.time(); img = cv2.imread(gir)
    if img is None: print("okunamadı", gir); return
    o, _ = temizle(img)
    cv2.imwrite(cik, o, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(os.path.basename(gir), "%.1f sn" % (time.time() - t), flush=True)

def bekle(dz):
    """Model önceden yüklenir, iş gelince hemen temizler (workflow sahibinden okunurken başlatır).
    İş: dz/istek.json = [[giris, cikis], ...]; bitince dz/bitti, hata olursa dz/hata yazılır."""
    os.makedirs(dz, exist_ok=True)
    try:
        oturum()
        open(os.path.join(dz, "hazir"), "w").close()
        ist = os.path.join(dz, "istek.json")
        for _ in range(3000):   # en çok ~10 dk bekler
            if os.path.exists(ist): break
            time.sleep(0.2)
        else: return
        import json
        for c in json.load(open(ist)): isle(c)
        open(os.path.join(dz, "bitti"), "w").close()
    except Exception as e:
        open(os.path.join(dz, "hata"), "w").write(str(e))
        raise

if __name__ == "__main__":
    if sys.argv[1:2] == ["--bekle"]:
        bekle(sys.argv[2]); sys.exit(0)
    a = sys.argv[1:]
    ciftler = list(zip(a[0::2], a[1::2]))
    is_ = int(os.environ.get("LAMA_SUREC", "1"))
    if is_ > 1 and len(ciftler) > 1:
        oturum() if not os.path.exists(MODEL) else None   # model bir kez insin
        from multiprocessing import Pool
        with Pool(is_) as p: p.map(isle, ciftler)
    else:
        for c in ciftler: isle(c)
