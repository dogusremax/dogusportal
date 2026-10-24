# Robust Video Matting ile her kare için alfa maskesi üretir (gri video olarak yazar)
import sys, subprocess, time, json
import numpy as np, onnxruntime as ort
src, out, model = sys.argv[1], sys.argv[2], sys.argv[3]
info = json.loads(subprocess.check_output(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=width,height,r_frame_rate","-of","json",src]))["streams"][0]
W, H = info["width"], info["height"]; fr = info["r_frame_rate"]
dec = subprocess.Popen(["ffmpeg","-v","error","-i",src,"-f","rawvideo","-pix_fmt","rgb24","-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","gray","-s",f"{W}x{H}","-r",fr,"-i","-","-c:v","libx264","-preset","medium","-crf","8","-pix_fmt","yuv420p",out], stdin=subprocess.PIPE)
so = ort.SessionOptions(); so.intra_op_num_threads = 0
s = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])
rec = [np.zeros([1,1,1,1], np.float32)] * 4
ds = np.array([min(1.0, 512 / max(W, H) * 1.0) if max(W,H) <= 512 else 0.25 if max(W,H) <= 1920 else 0.125], np.float32)
n = 0; t0 = time.time()
while True:
    b = dec.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    x = np.frombuffer(b, np.uint8).reshape(H, W, 3).transpose(2, 0, 1)[None].astype(np.float32) / 255
    fgr, pha, *rec = s.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": ds})
    enc.stdin.write((np.clip(pha[0, 0], 0, 1) * 255 + .5).astype(np.uint8).tobytes())
    n += 1
    if n % 30 == 0: print(n, "kare", round((time.time() - t0) / n, 3), "sn/kare", flush=True)
enc.stdin.close(); enc.wait(); dec.wait()
print("bitti", n, "kare", round(time.time() - t0, 1), "sn")
