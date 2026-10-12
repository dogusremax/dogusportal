# Gemini'nin boş araziye uydurduğu yerleşimleri siler: verilen elipslerde geceyi, gündüzün gece tonuna çekilmiş haliyle değiştirir.
# Kullanım: temizle.py eq.jpg gece.jpg cikti.jpg cx,cy,rx,ry [cx,cy,rx,ry ...]   (0-1 kesir, panorama koordinatı)
import sys, cv2, numpy as np
eq, ge, out = sys.argv[1:4]
D = cv2.imread(eq).astype(np.float32); N = cv2.imread(ge).astype(np.float32)
H, W = N.shape[:2]
if D.shape[:2] != (H, W): D = cv2.resize(D, (W, H), interpolation=cv2.INTER_AREA)
w, h = 3072, int(H * 3072 / W)
d = cv2.resize(D, (w, h), interpolation=cv2.INTER_AREA); n = cv2.resize(N, (w, h), interpolation=cv2.INTER_AREA)
m = np.zeros((h, w), np.float32)
for e in sys.argv[4:]:
    cx, cy, rx, ry = map(float, e.split(','))
    cv2.ellipse(m, (int(cx * w), int(cy * h)), (int(rx * w), int(ry * h)), 0, 0, 360, 1, -1)
m = cv2.GaussianBlur(m, (0, 0), 12)
# gece tonu: maskenin hemen çevresindeki zeminde gece/gündüz oranı
ring = (cv2.GaussianBlur(m, (0, 0), 40) > .05) & (m < .02)
k = np.array([np.median(n[..., c][ring] / (d[..., c][ring] + 1)) for c in range(3)], np.float32)
print('k', k.round(3), 'maske %.4f' % m.mean())
M = cv2.resize(m, (W, H))[..., None]
cv2.imwrite(out, np.clip(N * (1 - M) + D * k * M, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
