# RE/MAX Doğuş · Fotoğraf Düzenle — Windows işçisi (UMT bilgisayarı, PowerShell 5.1)
# dogusportal.com/foto-duzenle.html'den gönderilen işleri danisman-takip FotoDuzenle.js'ten alır.
# Her fotoğrafı ayrı Chrome profilindeki ChatGPT'ye (yeni sohbet) prompt.txt ile BİREBİR gönderir:
# metin dosyadan okunur, olduğu gibi yapıştırılır, önüne/arkasına hiçbir şey eklenmez.
# Çıkan görseli merkezden 4:3 kırpıp 1600x1200 JPEG yapar ve geri yükler. Mac betiği masaüstüne indirir.
# Oturum açılınca Görev Zamanlayıcı başlatır (kur.ps1), sürekli çalışır, 30 sn'de bir sıraya bakar.
# Dosyalar: %LOCALAPPDATA%\DogusFoto\ (anahtar, prompt.txt, chrome profili, isci.log)
param([switch]$TekSefer)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Web.Extensions, System.Drawing

$SERVIS = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec'
$KOK = Join-Path $env:LOCALAPPDATA 'DogusFoto'
$CHROME = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$PORT = 9333
$CIKTI_KOK = Join-Path ([Environment]::GetFolderPath('MyPictures')) 'ChatGPT_Duzenleme\portal'
$JSON = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$JSON.MaxJsonLength = [int]::MaxValue

function Log($m) {
  $s = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $m
  Add-Content -Path (Join-Path $KOK 'isci.log') -Value $s -Encoding UTF8
}
$ANAHTAR = (Get-Content (Join-Path $KOK 'anahtar') -Raw).Trim()
$PROMPT_YOL = Join-Path $KOK 'prompt.txt'

function Servis($govde) {
  $govde['k'] = $ANAHTAR
  $wc = New-Object System.Net.WebClient
  $wc.Headers['Content-Type'] = 'text/plain; charset=utf-8'
  $bayt = $wc.UploadData($SERVIS, 'POST', [Text.Encoding]::UTF8.GetBytes($JSON.Serialize($govde)))
  return $JSON.DeserializeObject([Text.Encoding]::UTF8.GetString($bayt))
}
function Durum($is, $alanlar) { $g = @{ action = 'fdIsYaz'; is = $is }; foreach ($k in $alanlar.Keys) { $g[$k] = $alanlar[$k] }; [void](Servis $g) }

# ---------------- Chrome (ayrı profil, uzaktan hata ayıklama portu) ----------------
function ChromeHazir {
  try { $null = Invoke-RestMethod -Uri "http://127.0.0.1:$PORT/json/version" -TimeoutSec 3; return $true } catch { return $false }
}
function ChromeAc {
  if (ChromeHazir) { return }
  $profil = Join-Path $KOK 'chrome'
  Start-Process -FilePath $CHROME -ArgumentList @("--remote-debugging-port=$PORT", "--user-data-dir=`"$profil`"", '--no-first-run', '--no-default-browser-check', '--restore-last-session=false', 'about:blank')
  for ($i = 0; $i -lt 30; $i++) { Start-Sleep -Seconds 1; if (ChromeHazir) { return } }
  throw 'Chrome açılamadı'
}

$script:WS = $null; $script:CdpNo = 0; $script:Sekme = $null
function CdpBaglan($wsUrl) {
  $script:WS = New-Object System.Net.WebSockets.ClientWebSocket
  $script:WS.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(20)
  $script:WS.ConnectAsync([Uri]$wsUrl, [Threading.CancellationToken]::None).Wait()
}
function CdpAl {
  $tampon = New-Object byte[] 1048576
  $ms = New-Object System.IO.MemoryStream
  do {
    $seg = New-Object System.ArraySegment[byte] -ArgumentList @(, $tampon)
    $t = $script:WS.ReceiveAsync($seg, [Threading.CancellationToken]::None)
    if (-not $t.Wait(600000)) { throw 'Chrome yanıt vermiyor' }
    $ms.Write($tampon, 0, $t.Result.Count)
  } while (-not $t.Result.EndOfMessage)
  return $JSON.DeserializeObject([Text.Encoding]::UTF8.GetString($ms.ToArray()))
}
function Cdp($yontem, $param) {
  $script:CdpNo++
  $no = $script:CdpNo
  if ($null -eq $param) { $param = @{} }
  $b = [Text.Encoding]::UTF8.GetBytes($JSON.Serialize(@{ id = $no; method = $yontem; params = $param }))
  $seg = New-Object System.ArraySegment[byte] -ArgumentList @(, $b)
  $script:WS.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
  while ($true) {
    $m = CdpAl
    if ($m.ContainsKey('id') -and $m['id'] -eq $no) {
      if ($m.ContainsKey('error')) { throw ("CDP $yontem : " + $m['error']['message']) }
      return $m['result']
    }
  }
}
# Sayfada JS çalıştırır (async olabilir), değeri döner
function JS($kod) {
  $r = Cdp 'Runtime.evaluate' @{ expression = $kod; awaitPromise = $true; returnByValue = $true; timeout = 300000 }
  if ($r.ContainsKey('exceptionDetails')) { throw ('JS: ' + $r['exceptionDetails']['text'] + ' ' + $r['exceptionDetails']['exception']['description']) }
  return $r['result']['value']
}
function SekmeAc($url) {
  $s = Invoke-RestMethod -Method Put -Uri ("http://127.0.0.1:$PORT/json/new?" + $url)
  $script:Sekme = $s.id
  CdpBaglan $s.webSocketDebuggerUrl
}
function SekmeKapat {
  try { if ($script:WS) { $script:WS.Dispose() } } catch {}
  try { if ($script:Sekme) { Invoke-RestMethod -Uri "http://127.0.0.1:$PORT/json/close/$($script:Sekme)" | Out-Null } } catch {}
  $script:WS = $null; $script:Sekme = $null
}
function Bekle($kosulJs, $saniye, $aralik) {
  $son = (Get-Date).AddSeconds($saniye)
  while ((Get-Date) -lt $son) {
    try { $v = JS $kosulJs; if ($v) { return $v } } catch {}
    Start-Sleep -Milliseconds $aralik
  }
  return $null
}

# ---------------- ChatGPT: tek fotoğraf ----------------
$JS_DURUM = @'
(() => {
  const stop = !!document.querySelector('[data-testid="stop-button"]');
  const turlar = document.querySelectorAll('[data-message-author-role="assistant"], article[data-turn="assistant"]');
  const son = turlar[turlar.length - 1];
  let imgs = [];
  document.querySelectorAll('article[data-turn="assistant"] img, [data-message-author-role="assistant"] img, img[alt*="Generated"], img[alt*="Oluşturul"]').forEach(i => {
    if (i.closest('[data-message-author-role="user"], article[data-turn="user"]')) return;
    if (i.complete && i.naturalWidth >= 512 && !/blur/.test(getComputedStyle(i).filter)) imgs.push({ src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight });
  });
  imgs.sort((a, b) => b.w * b.h - a.w * a.h);
  return JSON.stringify({ stop, img: imgs[0] || null, metin: son ? son.innerText.slice(0, 300) : '' });
})()
'@
function ChatGPTDuzenle($girdiYol, $cikisYol) {
  SekmeAc 'https://chatgpt.com/'
  try {
    [void](Cdp 'Page.enable' $null); [void](Cdp 'Runtime.enable' $null)
    $hazir = Bekle "(() => { if (document.querySelector('[data-testid=`"login-button`"]')) return 'giris'; return document.querySelector('#prompt-textarea') ? 'ok' : ''; })()" 90 1000
    if ($hazir -eq 'giris') { throw 'GIRIS' }
    if (-not $hazir) { throw 'ChatGPT sayfası açılmadı' }
    Start-Sleep -Seconds 2
    # 1) fotoğrafı ekle
    $r = Cdp 'Runtime.evaluate' @{ expression = "document.querySelector('input[type=file][accept*=`"image`"]') || document.querySelector('input[type=file]')" }
    if (-not $r['result'].ContainsKey('objectId')) { throw 'Dosya yükleme alanı bulunamadı' }
    [void](Cdp 'DOM.setFileInputFiles' @{ files = @($girdiYol); objectId = $r['result']['objectId'] })
    # 2) prompt: dosyadan okunur, olduğu gibi yazılır
    $prompt = [IO.File]::ReadAllText($PROMPT_YOL, [Text.Encoding]::UTF8)
    [void](JS "(() => { const e = document.querySelector('#prompt-textarea'); e.focus(); return true; })()")
    [void](Cdp 'Input.insertText' @{ text = $prompt })
    Start-Sleep -Seconds 2
    # Editördeki metin dosyayla aynı mı (boşluk farkları hariç) kontrol et
    $yazilan = JS "document.querySelector('#prompt-textarea').innerText"
    $norm = { param($s) ($s -replace '\s+', '') }
    if ((& $norm $yazilan) -ne (& $norm $prompt)) { throw 'Prompt editöre birebir yazılamadı' }
    # 3) yükleme bitince gönder
    $gonder = Bekle "(() => { const b = document.querySelector('[data-testid=`"send-button`"]'); if (!b || b.disabled) return false; b.click(); return true; })()" 120 1500
    if (-not $gonder) { throw 'Gönder tuşu açılmadı (fotoğraf yüklenemedi)' }
    # 4) görseli bekle (en fazla 8 dk)
    Start-Sleep -Seconds 10
    $son = (Get-Date).AddMinutes(8); $sakin = 0; $yaziSakin = 0; $d = $null
    while ((Get-Date) -lt $son) {
      Start-Sleep -Seconds 5
      try { $d = $JSON.DeserializeObject((JS $JS_DURUM)) } catch { continue }
      if (-not $d['stop'] -and $d['img']) { $sakin++; if ($sakin -ge 2) { break } } else { $sakin = 0 }
      # ChatGPT görsel yerine yalnız yazı ile cevap verdiyse (soru sorduysa) 1 dk bekleyip bırak
      if (-not $d['stop'] -and -not $d['img'] -and $d['metin'].Length -gt 0) { $yaziSakin++; if ($yaziSakin -ge 12) { break } } else { $yaziSakin = 0 }
    }
    if (-not $d -or -not $d['img']) { throw ('Görsel gelmedi. ChatGPT: ' + ($(if ($d) { $d['metin'] } else { '' }))) }
    # 5) tam çözünürlükte indir (sayfanın kendi oturumuyla)
    $src = $d['img']['src'].Replace('\', '\\').Replace("'", "\'")
    # PNG'ye çevrilerek alınır (webp gelirse Windows okuyamaz)
    $b64 = JS "fetch('$src', { credentials: 'include' }).then(r => r.blob()).then(createImageBitmap).then(i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); return new Promise(ok => c.toBlob(ok, 'image/png')); }).then(b => new Promise(ok => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1]); f.readAsDataURL(b); }))"
    if (-not $b64) { throw 'Görsel indirilemedi' }
    [IO.File]::WriteAllBytes($cikisYol, [Convert]::FromBase64String($b64))
  } finally { SekmeKapat }
}

# ---------------- 4:3, 1600x1200 JPEG ----------------
function Kirp43($girdi, $cikis) {
  $img = [Drawing.Image]::FromFile($girdi)
  try {
    $w = $img.Width; $h = $img.Height
    if ($w / $h -gt 4 / 3) { $cw = [int][Math]::Round($h * 4 / 3); $ch = $h } else { $cw = $w; $ch = [int][Math]::Round($w * 3 / 4) }
    $x = [int](($w - $cw) / 2); $y = [int](($h - $ch) / 2)
    $bmp = New-Object Drawing.Bitmap 1600, 1200
    $g = [Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $ia = New-Object Drawing.Imaging.ImageAttributes; $ia.SetWrapMode([Drawing.Drawing2D.WrapMode]::TileFlipXY)
    $g.DrawImage($img, (New-Object Drawing.Rectangle 0, 0, 1600, 1200), $x, $y, $cw, $ch, [Drawing.GraphicsUnit]::Pixel, $ia)
    $kod = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object Drawing.Imaging.EncoderParameters 1
    $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), ([long]92)
    $bmp.Save($cikis, $kod, $ep)
    $g.Dispose(); $bmp.Dispose()
  } finally { $img.Dispose() }
}

# ---------------- iş ----------------
function DosyaAdi($s) { return (($s -replace '[\\/:*?"<>|]', ' ') -replace '\s+', ' ').Trim() }
function IsIsle($is) {
  $id = $is['is']; $ad = DosyaAdi $is['ad']; $dosyalar = @($is['dosyalar'])
  Log "iş $id '$ad' $($dosyalar.Count) fotoğraf"
  $klasor = Join-Path $CIKTI_KOK $ad
  $ham = Join-Path $KOK "is\$id"
  New-Item -ItemType Directory -Force -Path $klasor, $ham | Out-Null
  $tamam = 0; $hatalar = @()
  for ($i = 0; $i -lt $dosyalar.Count; $i++) {
    $f = $dosyalar[$i]; $no = [int]$f['no']; $sira = '{0:D2}' -f $no
    Durum $id @{ islenen = $tamam; mesaj = "ChatGPT'de: $($i + 1). fotoğraf / $($dosyalar.Count)" }
    try {
      $j = Servis @{ action = 'fdIndir'; is = $id; no = $no; tur = 'in' }
      if (-not $j['success']) { throw $j['error'] }
      $uz = [IO.Path]::GetExtension($f['ad']); if (-not $uz) { $uz = '.jpg' }
      $girdi = Join-Path $ham ("in_$sira" + $uz)
      [IO.File]::WriteAllBytes($girdi, [Convert]::FromBase64String($j['veri']))
      $gpt = Join-Path $ham "gpt_$sira.png"
      $deneme = 0
      while ($true) {
        try { ChatGPTDuzenle $girdi $gpt; break }
        catch {
          if ($_.Exception.Message -eq 'GIRIS') { throw }
          $deneme++; Log "  $sira deneme $deneme hata: $($_.Exception.Message)"
          if ($deneme -ge 2) { throw }
          Start-Sleep -Seconds 20
        }
      }
      $son = Join-Path $klasor "$ad $sira.jpg"
      Kirp43 $gpt $son
      $veri = [Convert]::ToBase64String([IO.File]::ReadAllBytes($son))
      $tamam++
      Durum $id @{ no = $no; ad = "$ad $sira.jpg"; veri = $veri; islenen = $tamam; mesaj = "$tamam / $($dosyalar.Count) hazır" }
      Log "  $sira tamam"
    } catch {
      if ($_.Exception.Message -eq 'GIRIS') {
        Durum $id @{ durum = 'hata'; mesaj = 'ChatGPT oturumu kapalı: UMT''deki "ChatGPT İşçi" Chrome penceresinde giriş yap, sonra işi yeniden gönder.' }
        Log '  ChatGPT girişi yok'; return
      }
      $hatalar += "$sira ($($_.Exception.Message))"; Log "  $sira BAŞARISIZ: $($_.Exception.Message)"
    }
  }
  if ($tamam -eq 0) { Durum $id @{ durum = 'hata'; islenen = 0; mesaj = 'Hiçbir fotoğraf düzenlenemedi: ' + ($hatalar -join '; ') } }
  else {
    $m = "$tamam / $($dosyalar.Count) fotoğraf hazır"; if ($hatalar.Count) { $m += ' · olmayanlar: ' + ($hatalar -join '; ') }
    Durum $id @{ durum = 'bitti'; islenen = $tamam; mesaj = $m.Substring(0, [Math]::Min(300, $m.Length)) }
  }
  Log "iş $id bitti: $tamam / $($dosyalar.Count)"
}

# ---------------- ana döngü ----------------
$kilit = New-Object Threading.Mutex($false, 'Local\DogusFotoIsci')
if (-not $kilit.WaitOne(0)) { exit 0 }
Log 'işçi başladı'
while ($true) {
  try {
    $is = Servis @{ action = 'fdSiradaki' }
    if ($is['success'] -and $is['is']) { ChromeAc; IsIsle $is }
  } catch { Log ('hata: ' + $_.Exception.Message) }
  if ($TekSefer) { break }
  Start-Sleep -Seconds 30
}
