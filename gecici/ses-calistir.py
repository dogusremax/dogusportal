# GEÇİCİ: PyAV sürüm sorununu atlamak için sesi ffmpeg ile çözüp ses-zaman.py'yi çalıştırır
import subprocess, sys, runpy, numpy as np
import faster_whisper.transcribe as ft
def coz(f, sampling_rate=16000, **k):
    if not isinstance(f, str): return f
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-f", "f32le", "-ac", "1", "-ar", str(sampling_rate), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
ft.decode_audio = coz
sys.argv = ["ses-zaman.py"] + sys.argv[1:]
runpy.run_path("scripts/ses-zaman.py", run_name="__main__")
