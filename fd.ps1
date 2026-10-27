# RE/MAX Doğuş · Fotoğraf Düzenle — Windows işçisini güncel sürüme geçirir (Umut elle yazar: irm dogusportal.com/fd.ps1 | iex)
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*DogusFoto*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
irm "https://dogusportal.com/tools/foto-duzenle/isci.ps1?cb=$([DateTime]::UtcNow.Ticks)" -OutFile "$env:LOCALAPPDATA\DogusFoto\isci.ps1"
Enable-ScheduledTask 'DogusFoto Isci' | Out-Null
Start-ScheduledTask 'DogusFoto Isci'
Write-Host 'Tamam: fotograf iscisi guncellendi ve basladi.'
