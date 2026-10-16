# GEÇİCİ: Güneş görünümünden kupasız yeni pozlar (Gemini görsel, referans fotoğraf ile)
import base64, json, os, sys, time, requests
anahtar = os.environ.get("GEMINI_API_KEY") or json.loads(os.environ.get("GOOGLE_PLACES_KEY") or "{}").get("gemini")
ref = base64.b64encode(open("avatar-test/heygen-sesler/gorunum-3136c6b3b42c468285849e2b950dc5d1.webp", "rb").read()).decode()
ORTAK = ("Use the woman in the reference photo. Keep her face, facial features, skin tone, eye color, smile, "
         "long wavy brown hair, earrings and makeup exactly identical, 1:1 the same person. Keep the same red RE/MAX "
         "lanyard and name badge on her chest and the same office background (zodiac wheel wall, RE/MAX DOĞUŞ sign, "
         "warm night lighting). Photorealistic, vertical 9:16 portrait, she looks straight into the camera, mouth "
         "closed in a soft natural smile, face fully visible and well lit, no text added. She must NOT hold a mug or cup; "
         "remove the mug completely. ")
POZ = {
  "poz-1-masada": "She sits at the same desk, both hands resting relaxed on the desk, same navy blazer and white top.",
  "poz-2-ayakta": "She stands in front of the desk, upper body to mid-thigh visible, arms relaxed, one hand lightly touching the desk, same navy blazer.",
  "poz-3-kiyafet": "She sits at the desk with hands loosely clasped on the desk, wearing an elegant burgundy blazer over a cream top instead of navy.",
}
os.makedirs("avatar-test/poz", exist_ok=True)
for ad, p in POZ.items():
  for model in ["gemini-2.5-flash-image", "gemini-2.5-flash-image-preview", "gemini-3-pro-image-preview"]:
    r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"x-goog-api-key": anahtar, "Content-Type": "application/json"}, timeout=180,
        json={"contents": [{"parts": [{"inline_data": {"mime_type": "image/webp", "data": ref}}, {"text": ORTAK + p}]}],
              "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "9:16"}}})
    print(ad, model, r.status_code, r.text[:300] if r.status_code != 200 else "")
    if r.status_code != 200: continue
    parca = [x for x in r.json()["candidates"][0]["content"]["parts"] if "inlineData" in x or "inline_data" in x]
    if not parca: print(r.text[:500]); continue
    d = parca[0].get("inlineData") or parca[0].get("inline_data")
    open(f"avatar-test/poz/{ad}.png", "wb").write(base64.b64decode(d["data"])); break
  time.sleep(3)
