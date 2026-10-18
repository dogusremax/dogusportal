#!/usr/bin/env bash
# Ofis takvimi anında açılsın diye yalnız nöbet listesi ve resmî tatiller (tarih + isim) statik
# dosyaya yazılır; toplantı, doğum günü ve diğer her şey yine oturumla Apps Script'ten gelir.
set -euo pipefail
API="https://script.google.com/macros/s/AKfycbwqxxXftJ_b1TrF_GFYfus6dtBe6lp4gDWTZVl9QuXAjYxjHfSvl2Ni_X3mJKm6zAss_w/exec"
BAS=$(TZ=Europe/Istanbul date -d '-120 days' +%F); BIT=$(TZ=Europe/Istanbul date -d '+240 days' +%F)
J=$(curl -sfL --retry 3 -H 'Content-Type: text/plain;charset=utf-8' \
  -d "{\"action\":\"takvim\",\"oturum\":\"\",\"islem\":\"liste\",\"bas\":\"$BAS\",\"bit\":\"$BIT\"}" "$API")
echo "$J" | jq -e '.ok==true and (.olaylar|length)>0' >/dev/null
echo "$J" | jq -c --arg b "$BAS" --arg e "$BIT" \
  '{kapsam:[$b,$e], olaylar:[.olaylar[]|select(.tur=="nobet" or .tur=="tatil")|{id,tur,tarih,baslik,nobetci,tumGun}]}' > assets/takvim-genel.json
