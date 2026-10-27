# RE/MAX Doğuş · Fotoğraf Düzenle — Windows işçisi (UMT bilgisayarı, PowerShell 5.1)
# dogusportal.com/foto-duzenle.html'den gönderilen işleri danisman-takip FotoDuzenle.js'ten alır.
# Her fotoğrafı ayrı Chrome profilindeki ChatGPT'ye (yeni sohbet) prompt.txt ile BİREBİR gönderir:
# metin dosyadan okunur, olduğu gibi yapıştırılır, önüne/arkasına hiçbir şey eklenmez.
# Çıkan görseli merkezden 4:3 kırpıp 1600x1200 JPEG yapar ve geri yükler. Mac betiği masaüstüne indirir.
# Oturum açılınca Görev Zamanlayıcı başlatır (kur.ps1), sürekli çalışır, 30 sn'de bir sıraya bakar.
# Dosyalar: %LOCALAPPDATA%\DogusFoto\ (anahtar, prompt.txt, chrome profili, isci.log)
param([switch]$TekSefer, [string]$Foto = '', [string]$Cikti = '')
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Web.Extensions, System.Drawing

$SERVIS = 'https://script.google.com/macros/s/AKfycbylNnt48KJxD-HBqoopEfYZjv4A06hKo3RjUclILLh9g8bDIno73dDti_PUFECC4F0utg/exec'
$KOK = Join-Path $env:LOCALAPPDATA 'DogusFoto'
$CHROME = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$PORT = 9333
$CIKTI_KOK = Join-Path $env:USERPROFILE 'Pictures\ChatGPT_Duzenleme\portal'
$JSON = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$JSON.MaxJsonLength = [int]::MaxValue

function Log($m) {
  $s = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $m
  for ($i = 0; $i -lt 5; $i++) { try { Add-Content -Path (Join-Path $KOK 'isci.log') -Value $s -Encoding UTF8; return } catch { Start-Sleep -Milliseconds 200 } }
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
$JS_EDITOR = "document.querySelector('#prompt-textarea, div.ProseMirror[contenteditable=true]')"
$JS_GONDER = "document.querySelector('[data-testid=`"send-button`"], button[aria-label=`"Gönder`"], button[aria-label=`"Send prompt`"], button[aria-label=`"Send`"]')"
# Yeni görsel: gönderimden önce sayfada olmayan, 512px+ ve promptun (kullanıcı mesajının) ARDINDAN gelen img
$JS_DURUM = @'
(() => {
  const stop = !!document.querySelector('[data-testid="stop-button"], button[aria-label*="durdur" i], button[aria-label*="Stop" i]');
  const once = window.__fdOnce || new Set();
  const w = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT);
  let isaret = null, n;
  while ((n = w.nextNode())) if (n.nodeValue.indexOf('PROFESYONEL OLARAK DÜZENLE') >= 0 && !n.parentElement.closest('[contenteditable]')) isaret = n;
  let imgs = [];
  document.querySelectorAll('main img, img').forEach(i => {
    const src = i.currentSrc || i.src;
    if (!src || once.has(src) || /^blob:/.test(src)) return;
    if (i.closest('[data-message-author-role="user"], article[data-turn="user"], [contenteditable]')) return;
    if (isaret && !(isaret.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
    if (i.complete && i.naturalWidth >= 512 && !/blur/.test(getComputedStyle(i).filter)) imgs.push({ src, w: i.naturalWidth, h: i.naturalHeight });
  });
  imgs.sort((a, b) => b.w * b.h - a.w * a.h);
  const turlar = document.querySelectorAll('[data-message-author-role="assistant"], article[data-turn="assistant"]');
  const son = turlar[turlar.length - 1];
  return JSON.stringify({ stop, img: imgs[0] || null, metin: son ? son.innerText.slice(0, 300) : '', isaret: !!isaret });
})()
'@
function ChatGPTDuzenle($girdiYol, $cikisYol) {
  SekmeAc 'https://chatgpt.com/'
  try {
    [void](Cdp 'Page.enable' $null); [void](Cdp 'Runtime.enable' $null)
    $hazir = Bekle "(() => { if ($JS_EDITOR && !document.querySelector('[data-testid=`"login-button`"]') && ![...document.querySelectorAll('a,button')].some(b => /^(Oturum aç|Giriş yap|Log in)$/i.test(b.innerText.trim()))) return 'ok'; if (document.readyState === 'complete' && (document.querySelector('[data-testid=`"login-button`"]') || [...document.querySelectorAll('a,button')].some(b => /^(Oturum aç|Giriş yap|Log in)$/i.test(b.innerText.trim())))) return 'giris'; return ''; })()" 90 1000
    if ($hazir -eq 'giris') { throw 'GIRIS' }
    if (-not $hazir) { throw 'ChatGPT sayfası açılmadı' }
    Start-Sleep -Seconds 2
    # 1) fotoğrafı ekle
    $r = Cdp 'Runtime.evaluate' @{ expression = "document.querySelector('input[type=file][accept*=`"image`"]') || document.querySelector('input[type=file]')" }
    if (-not $r['result'].ContainsKey('objectId')) { throw 'Dosya yükleme alanı bulunamadı' }
    [void](Cdp 'DOM.setFileInputFiles' @{ files = @($girdiYol); objectId = $r['result']['objectId'] })
    # 2) prompt: dosyadan okunur, olduğu gibi yazılır
    $prompt = [IO.File]::ReadAllText($PROMPT_YOL, [Text.Encoding]::UTF8)
    [void](JS "(() => { const e = $JS_EDITOR; e.focus(); return true; })()")
    [void](Cdp 'Input.insertText' @{ text = $prompt })
    Start-Sleep -Seconds 2
    # Editördeki metin dosyayla aynı mı (boşluk farkları hariç) kontrol et
    $yazilan = JS "$JS_EDITOR.innerText"
    $norm = { param($s) ($s -replace '\s+', '') }
    if ((& $norm $yazilan) -ne (& $norm $prompt)) { throw 'Prompt editöre birebir yazılamadı' }
    # 3) yükleme bitince gönder
    # yükleme sürerken gönder tuşu kapalıdır; açılınca sayfadaki mevcut görseller not edilir ve basılır
    $gonder = Bekle "(() => { const b = $JS_GONDER; if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return false; window.__fdOnce = new Set([...document.images].map(i => i.currentSrc || i.src)); b.click(); return true; })()" 120 1500
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
    $PNG = "then(b => createImageBitmap(b)).then(i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); return new Promise(ok => c.toBlob(ok, 'image/png')); }).then(b => new Promise(ok => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1]); f.readAsDataURL(b); }))"
    $b64 = $null
    try { $b64 = JS "fetch('$src', { credentials: 'include' }).then(r => r.blob()).$PNG" } catch { Log "  fetch olmadı: $($_.Exception.Message)" }
    if (-not $b64) {
      # sayfanın zaten yüklediği dosyayı Chrome'dan al
      $cerceve = (Cdp 'Page.getFrameTree' $null)['frameTree']['frame']['id']
      $ic = Cdp 'Page.getResourceContent' @{ frameId = $cerceve; url = $d['img']['src'] }
      $ham = $ic['content']; if (-not $ic['base64Encoded']) { throw 'Görsel içeriği metin döndü' }
      $b64 = JS "fetch('data:image/*;base64,$ham').then(r => r.blob()).$PNG"
    }
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
# Tek fotoğraf, ayrı süreçte (paralel sekmeler için). Çıkış: 0 tamam, 2 ChatGPT girişi yok, 1 hata (.hata dosyasında)
function TekFoto($girdi, $gpt) {
  $deneme = 0
  while ($true) {
    try { ChatGPTDuzenle $girdi $gpt; return 0 }
    catch {
      if ($_.Exception.Message -eq 'GIRIS') { return 2 }
      $deneme++; Log "  $([IO.Path]::GetFileName($girdi)) deneme $deneme hata: $($_.Exception.Message)"
      if ($deneme -ge 2) { Set-Content -Path "$gpt.hata" -Value $_.Exception.Message -Encoding UTF8; return 1 }
      Start-Sleep -Seconds 20
    }
  }
}
function Paralel { try { $n = [int](Get-Content (Join-Path $KOK 'paralel') -Raw).Trim(); if ($n -ge 1 -and $n -le 6) { return $n } } catch {}; return 3 }
function IsIsle($is) {
  $id = $is['is']; $ad = DosyaAdi $is['ad']; $dosyalar = @($is['dosyalar'])
  $esZamanli = Paralel
  Log "iş $id '$ad' $($dosyalar.Count) fotoğraf, aynı anda $esZamanli"
  $klasor = Join-Path $CIKTI_KOK $ad
  $ham = Join-Path $KOK "is\$id"
  New-Item -ItemType Directory -Force -Path $klasor, $ham | Out-Null
  $tamam = 0; $hatalar = @(); $bekleyen = New-Object System.Collections.ArrayList; $calisan = @{}; $giris = $false
  Durum $id @{ islenen = 0; mesaj = 'Fotoğraflar alınıyor' }
  foreach ($f in $dosyalar) {
    $no = [int]$f['no']; $sira = '{0:D2}' -f $no
    try {
      $j = Servis @{ action = 'fdIndir'; is = $id; no = $no; tur = 'in' }
      if (-not $j['success']) { throw $j['error'] }
      $uz = [IO.Path]::GetExtension($f['ad']); if (-not $uz) { $uz = '.jpg' }
      $girdi = Join-Path $ham ("in_$sira" + $uz)
      [IO.File]::WriteAllBytes($girdi, [Convert]::FromBase64String($j['veri']))
      [void]$bekleyen.Add(@{ no = $no; sira = $sira; girdi = $girdi; gpt = (Join-Path $ham "gpt_$sira.png") })
    } catch { $hatalar += "$sira (indirilemedi: $($_.Exception.Message))" }
  }
  $betik = $MyInvocation.ScriptName; if (-not $betik) { $betik = $PSCommandPath }
  while ($bekleyen.Count -or $calisan.Count) {
    while (-not $giris -and $bekleyen.Count -and $calisan.Count -lt $esZamanli) {
      $x = $bekleyen[0]; $bekleyen.RemoveAt(0)
      Remove-Item -Force -ErrorAction SilentlyContinue $x.gpt, "$($x.gpt).hata"
      $x.surec = Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$betik`"", '-Foto', "`"$($x.girdi)`"", '-Cikti', "`"$($x.gpt)`"")
      $calisan[$x.sira] = $x
      Durum $id @{ islenen = $tamam; mesaj = "ChatGPT'de: $($calisan.Count) fotoğraf işleniyor · $tamam / $($dosyalar.Count) hazır" }
      Start-Sleep -Seconds 8   # sekmeler aynı anda açılmasın
    }
    Start-Sleep -Seconds 3
    foreach ($sira in @($calisan.Keys)) {
      $x = $calisan[$sira]
      if (-not $x.surec.HasExited) { continue }
      $calisan.Remove($sira)
      $kod = $x.surec.ExitCode
      if ($kod -eq 2) { $giris = $true; $bekleyen.Clear(); continue }
      if ($kod -ne 0 -or -not (Test-Path $x.gpt)) {
        $m = 'bilinmeyen hata'; if (Test-Path "$($x.gpt).hata") { $m = (Get-Content "$($x.gpt).hata" -Raw -Encoding UTF8).Trim() }
        $hatalar += "$sira ($m)"; Log "  $sira BAŞARISIZ: $m"; continue
      }
      try {
        $son = Join-Path $klasor "$ad $sira.jpg"
        Kirp43 $x.gpt $son
        $tamam++
        Durum $id @{ no = $x.no; ad = "$ad $sira.jpg"; veri = [Convert]::ToBase64String([IO.File]::ReadAllBytes($son)); islenen = $tamam; mesaj = "$tamam / $($dosyalar.Count) hazır" }
        Log "  $sira tamam"
      } catch { $hatalar += "$sira ($($_.Exception.Message))"; Log "  $sira BAŞARISIZ: $($_.Exception.Message)" }
    }
  }
  if ($giris -and $tamam -eq 0) {
    Durum $id @{ durum = 'hata'; mesaj = 'ChatGPT oturumu kapalı: Windows''taki ayrı ChatGPT Chrome penceresinde giriş yap, sonra işi yeniden gönder.' }
    Log '  ChatGPT girişi yok'; return
  }
  if ($giris) { $hatalar += 'kalanlar (ChatGPT oturumu kapandı)' }
  if ($tamam -eq 0) { Durum $id @{ durum = 'hata'; islenen = 0; mesaj = ('Hiçbir fotoğraf düzenlenemedi: ' + ($hatalar -join '; ')).Substring(0, [Math]::Min(300, ('Hiçbir fotoğraf düzenlenemedi: ' + ($hatalar -join '; ')).Length)) } }
  else {
    $m = "$tamam / $($dosyalar.Count) fotoğraf hazır"; if ($hatalar.Count) { $m += ' · olmayanlar: ' + ($hatalar -join '; ') }
    Durum $id @{ durum = 'bitti'; islenen = $tamam; mesaj = $m.Substring(0, [Math]::Min(300, $m.Length)) }
  }
  Log "iş $id bitti: $tamam / $($dosyalar.Count)"
}

# ---------------- tek fotoğraf modu (IsIsle başlatır) ----------------
if ($Foto) { exit (TekFoto $Foto $Cikti) }

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
