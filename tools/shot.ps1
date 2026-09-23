param(
  [string]$Url = 'http://localhost:4173/',
  [string]$Out = 'E:\AI-workspace\media\qa_shot.png',
  [int]$W = 1440,
  [int]$H = 2600
)
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' }
& $chrome --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
  --virtual-time-budget=8000 --window-size=$W,$H --screenshot=$Out $Url | Out-Null
if (Test-Path $Out) { Write-Output "ok $Out" } else { Write-Output 'FAILED' }
