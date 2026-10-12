"""Eşdikdörtgen panoramayı 3DVista düzeninde küp karolarına böler (kup2eq.py'nin tersi), karo 512 px.
  python3 eq2kup.py <panorama.jpg> <çıkış/panorama_ID_0> [seviyeler=4,2,1] [kalite=84]"""
import sys, os, numpy as np, cv2
def main(src, dst, lv='4,2,1', q=84):
    E = cv2.imread(src); H, W = E.shape[:2]; ns = [int(x) for x in lv.split(',')]; N = ns[0] * 512
    t = (np.arange(N) + .5) / N * 2 - 1; u, v = np.meshgrid(t, t)
    one = np.ones_like(u)
    D = {'f': (u, -v, one), 'b': (-u, -v, -one), 'r': (one, -v, -u), 'l': (-one, -v, u), 'u': (u, one, v), 'd': (u, -one, -v)}
    for f, (x, y, z) in D.items():
        lon = np.arctan2(x, z); lat = np.arctan2(y, np.hypot(x, z))
        px = ((lon + np.pi) / (2 * np.pi) * W - .5).astype(np.float32); py = ((np.pi / 2 - lat) / np.pi * H - .5).astype(np.float32)
        face = cv2.remap(E, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        for L, n in enumerate(ns):
            im = face if n == ns[0] else cv2.resize(face, (n * 512, n * 512), interpolation=cv2.INTER_AREA)
            os.makedirs(f'{dst}/{f}/{L}', exist_ok=True)
            for r in range(n):
                for c in range(n):
                    cv2.imwrite(f'{dst}/{f}/{L}/{r}_{c}.jpg', im[r*512:(r+1)*512, c*512:(c+1)*512], [cv2.IMWRITE_JPEG_QUALITY, int(q), cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
    print(dst, ns)
if __name__ == '__main__': main(*sys.argv[1:])
