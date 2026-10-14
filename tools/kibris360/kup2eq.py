"""3DVista küp karolarını (f r b l u d / {row}_{col}.jpg) eşdikdörtgen panoramaya çevirir.
  python3 kup2eq.py <karo_klasörü/sahne_id> <çıkış.jpg> [genişlik=12288]"""
import sys, os, numpy as np, cv2
def yuz(d, f):
    fs = sorted(os.listdir(f'{d}/{f}')); n = int(max(int(x.split('_')[0]) for x in fs)) + 1
    rows = [np.hstack([cv2.imread(f'{d}/{f}/{r}_{c}.jpg') for c in range(n)]) for r in range(n)]
    return np.vstack(rows)
def main(d, dst, W=12288):
    F = {f: yuz(d, f) for f in 'frbldu'}; N = F['f'].shape[0]; H = W // 2
    lon = (np.arange(W) + .5) / W * 2 * np.pi - np.pi; out = np.zeros((H, W, 3), np.uint8)
    for r0 in range(0, H, 512):
        la = (np.pi / 2 - (np.arange(r0, min(H, r0 + 512)) + .5) / H * np.pi)[:, None]
        x = np.cos(la) * np.sin(lon); y = np.sin(la) * np.ones_like(lon); z = np.cos(la) * np.cos(lon)
        ax, ay, az = abs(x), abs(y), abs(z); blk = out[r0:r0 + 512]
        for f, m, u, v in (('f', (az >= ax) & (az >= ay) & (z > 0), x / az, -y / az),
                           ('b', (az >= ax) & (az >= ay) & (z <= 0), -x / az, -y / az),
                           ('r', (ax > az) & (ax >= ay) & (x > 0), -z / ax, -y / ax),
                           ('l', (ax > az) & (ax >= ay) & (x <= 0), z / ax, -y / ax),
                           ('u', (ay > ax) & (ay > az) & (y > 0), x / ay, z / ay),
                           ('d', (ay > ax) & (ay > az) & (y <= 0), x / ay, -z / ay)):
            px = ((u + 1) / 2 * N - .5).astype(np.float32); py = ((v + 1) / 2 * N - .5).astype(np.float32)
            im = cv2.remap(F[f], px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            blk[m] = im[m]
    cv2.imwrite(dst, out, [cv2.IMWRITE_JPEG_QUALITY, 93]); print(dst, out.shape)
if __name__ == '__main__': main(sys.argv[1], sys.argv[2], *(int(a) for a in sys.argv[3:4]))
