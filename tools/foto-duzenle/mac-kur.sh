#!/bin/bash
# RE/MAX Doğuş · Fotoğraf Düzenle — Mac kurulumu (bir kez). Windows (UMT) kalktı, 2026-11-03'ten beri iş Mac'te.
# Kullanım (Terminal): curl -fsSL https://dogusportal.com/tools/foto-duzenle/mac-kur.sh | bash -s <ANAHTAR> [prompt.txt yolu]
# İki ajan kurar: işçi (dakikada bir sıraya bakar, fotoğrafları Chrome'daki ChatGPT'de düzenler) ve
# teslim (biten işleri Masaüstü'ne indirir, bildirim gösterir). Kaldırmak için: bash mac-kur.sh kaldir
set -e
DIZIN="$HOME/Library/Application Support/DogusFoto"
LA="$HOME/Library/LaunchAgents"
TESLIM="$LA/com.remaxdogus.foto.plist"
ISCI="$LA/com.remaxdogus.foto.isci.plist"
PROMPT_SHA="d6b8ce31fa3c4463268e8bf15374847c472d31703daa9b7715bb1110f097a8f8"
URL="https://dogusportal.com/tools/foto-duzenle"
if [ "$1" = "kaldir" ]; then
  for p in "$TESLIM" "$ISCI"; do launchctl unload "$p" 2>/dev/null || true; rm -f "$p"; done
  rm -rf "$DIZIN"; echo "Kaldırıldı."; exit 0
fi
[ -n "$1" ] || { echo "Anahtar eksik: ... | bash -s <ANAHTAR>"; exit 1; }
mkdir -p "$DIZIN" "$LA"
printf '%s' "$1" > "$DIZIN/anahtar"; chmod 600 "$DIZIN/anahtar"

# Umut'un promptu birebir (SHA-256 kontrolü). Verilmezse İndirilenler'deki dogus-foto-prompt.txt
P="${2:-$HOME/Downloads/dogus-foto-prompt.txt}"
if [ ! -f "$DIZIN/prompt.txt" ] || [ "$(shasum -a 256 "$DIZIN/prompt.txt" | awk '{print $1}')" != "$PROMPT_SHA" ]; then
  [ -f "$P" ] || { echo "prompt.txt bulunamadı: $P"; exit 1; }
  [ "$(shasum -a 256 "$P" | awk '{print $1}')" = "$PROMPT_SHA" ] || { echo "prompt.txt Umut'un promptuyla birebir aynı değil"; exit 1; }
  cp "$P" "$DIZIN/prompt.txt"
fi

curl -fsSL "$URL/mac-teslim.js?cb=$(date +%s)" -o "$DIZIN/teslim.js"
curl -fsSL "$URL/mac-isci.js?cb=$(date +%s)" -o "$DIZIN/isci.js"
# İşçi başlatıcı: 30 dakikada bir dogusportal'daki yeni sürümü alır (derlenebiliyorsa), sonra işçiyi çalıştırır
cat > "$DIZIN/isci.sh" <<'SH'
#!/bin/bash
D="$HOME/Library/Application Support/DogusFoto"
if [ ! -f "$D/isci.guncel" ] || [ -n "$(find "$D/isci.guncel" -mmin +30 2>/dev/null)" ]; then
  touch "$D/isci.guncel"
  if curl -fsSL --max-time 30 "https://dogusportal.com/tools/foto-duzenle/mac-isci.js?cb=$(date +%s)" -o "$D/isci.yeni.js" \
     && osacompile -l JavaScript -o "$D/isci.derle.scpt" "$D/isci.yeni.js" 2>/dev/null; then
    cmp -s "$D/isci.yeni.js" "$D/isci.js" || { mv -f "$D/isci.yeni.js" "$D/isci.js"; echo "$(date -u +%FT%TZ) işçi güncellendi" >> "$D/isci.log"; }
  fi
  rm -f "$D/isci.yeni.js" "$D/isci.derle.scpt"
fi
exec /usr/bin/osascript -l JavaScript "$D/isci.js"
SH
chmod +x "$DIZIN/isci.sh"

ajan() { # $1 plist, $2 etiket, $3.. komut
  local plist="$1" etiket="$2"; shift 2
  local args=""; for a in "$@"; do args="$args<string>$a</string>"; done
  cat > "$plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$etiket</string>
  <key>ProgramArguments</key><array>$args</array>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><true/>
</dict></plist>
PL
  launchctl unload "$plist" 2>/dev/null || true
  launchctl load "$plist"
}
ajan "$TESLIM" com.remaxdogus.foto /usr/bin/osascript -l JavaScript "$DIZIN/teslim.js"
ajan "$ISCI" com.remaxdogus.foto.isci /bin/bash "$DIZIN/isci.sh"
osascript -e 'display notification "Portaldan gönderilen fotoğraflar bu Mac’te ChatGPT ile düzenlenip Masaüstü’ne gelecek." with title "Fotoğraf Düzenle kuruldu ✅" sound name "Glass"'
echo "Kuruldu. Mac 'Chrome'u denetlemek' veya 'Masaüstü' için izin sorarsa 'İzin Ver'e bas."
