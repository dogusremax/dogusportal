#!/bin/bash
# RE/MAX Doğuş · Fotoğraf Düzenle — Mac kurulumu (bir kez).
# Kullanım (Terminal): curl -fsSL https://dogusportal.com/tools/foto-duzenle/mac-kur.sh | bash -s <ANAHTAR>
# Dakikada bir biten işleri Masaüstü'ne indirir ve bildirim gösterir. Kaldırmak için: bash mac-kur.sh kaldir
set -e
DIZIN="$HOME/Library/Application Support/DogusFoto"
PLIST="$HOME/Library/LaunchAgents/com.remaxdogus.foto.plist"
if [ "$1" = "kaldir" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true; rm -f "$PLIST"; rm -rf "$DIZIN"; echo "Kaldırıldı."; exit 0
fi
[ -n "$1" ] || { echo "Anahtar eksik: ... | bash -s <ANAHTAR>"; exit 1; }
mkdir -p "$DIZIN" "$HOME/Library/LaunchAgents"
printf '%s' "$1" > "$DIZIN/anahtar"; chmod 600 "$DIZIN/anahtar"
curl -fsSL "https://dogusportal.com/tools/foto-duzenle/mac-teslim.js?cb=$(date +%s)" -o "$DIZIN/teslim.js"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.remaxdogus.foto</string>
  <key>ProgramArguments</key><array><string>/usr/bin/osascript</string><string>-l</string><string>JavaScript</string><string>$DIZIN/teslim.js</string></array>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><true/>
</dict></plist>
PL
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
osascript -e 'display notification "Biten fotoğraflar Masaüstü'"'"'ne klasör olarak gelecek." with title "Fotoğraf Düzenle kuruldu ✅" sound name "Glass"'
echo "Kuruldu. Masaüstü izni sorulursa 'İzin Ver'e bas."
