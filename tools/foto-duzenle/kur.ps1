# RE/MAX Doğuş · Fotoğraf Düzenle — Windows (UMT) kurulumu, bir kez.
# powershell -NoProfile -ExecutionPolicy Bypass -File kur.ps1 -Anahtar <ANAHTAR>
# isci.ps1'i %LOCALAPPDATA%\DogusFoto'ya indirir, prompt.txt'yi birebir kopyalar (SHA-256 kontrolü),
# oturum açılınca gizli başlayan "DogusFoto İşçi" görevini kurar ve ChatGPT girişi için işçi Chrome'unu açar.
param([Parameter(Mandatory = $true)][string]$Anahtar, [string]$Prompt = '')
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$KOK = Join-Path $env:LOCALAPPDATA 'DogusFoto'
$PROMPT_SHA = 'D6B8CE31FA3C4463268E8BF15374847C472D31703DAA9B7715BB1110F097A8F8'
New-Item -ItemType Directory -Force -Path $KOK | Out-Null
Set-Content -Path (Join-Path $KOK 'anahtar') -Value $Anahtar -NoNewline -Encoding ASCII
(New-Object Net.WebClient).DownloadFile("https://dogusportal.com/tools/foto-duzenle/isci.ps1?cb=$([DateTime]::UtcNow.Ticks)", (Join-Path $KOK 'isci.ps1'))
if (-not $Prompt) { $Prompt = Join-Path ([Environment]::GetFolderPath('MyPictures')) 'ChatGPT_Duzenleme\prompt.txt' }
$sha = (Get-FileHash -Algorithm SHA256 -Path $Prompt).Hash
if ($sha -ne $PROMPT_SHA) { throw "prompt.txt Umut'un promptuyla birebir aynı değil (SHA-256 $sha)" }
Copy-Item -Force $Prompt (Join-Path $KOK 'prompt.txt')

$eylem = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$KOK\isci.ps1`""
$tetik = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$ayar = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'DogusFoto Isci' -Action $eylem -Trigger $tetik -Settings $ayar -Description 'RE/MAX Doğuş Fotoğraf Düzenle işçisi (dogusportal.com/foto-duzenle.html)' -Force | Out-Null

# ChatGPT girişi için işçi Chrome'u (ayrı profil)
$profil = Join-Path $KOK 'chrome'
Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--remote-debugging-port=9333', "--user-data-dir=`"$profil`"", '--no-first-run', '--no-default-browser-check', 'https://chatgpt.com/')
Start-Sleep -Seconds 3
Start-ScheduledTask -TaskName 'DogusFoto Isci'
Write-Host 'Kuruldu. Açılan Chrome penceresinde ChatGPT hesabına bir kez giriş yap.'
