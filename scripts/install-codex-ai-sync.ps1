param(
  [string]$Secret,
  [string]$Endpoint = "https://viper3.top/api/ai-sync",
  [string]$CodexHome = $env:CODEX_HOME
)

$ErrorActionPreference = "Stop"
if (-not $Secret) {
  $envFile = Join-Path $PSScriptRoot "..\.env.local"
  foreach ($name in @("AI_SYNC_SECRET", "CRON_SECRET")) {
    $line = Get-Content -LiteralPath $envFile -ErrorAction SilentlyContinue |
      Where-Object { $_ -match "^$name=" } |
      Select-Object -First 1
    if ($line) {
      $Secret = $line.Substring($line.IndexOf("=") + 1).Trim().Trim('"', "'")
      if ($Secret) { break }
    }
  }
}
if (-not $Secret) { throw "请通过 -Secret 传入密钥，或在 .env.local 配置 AI_SYNC_SECRET/CRON_SECRET。" }
if (-not $CodexHome) { $CodexHome = Join-Path $env:USERPROFILE ".codex" }
$node = (Get-Command node.exe).Source
$script = (Resolve-Path (Join-Path $PSScriptRoot "sync-codex-ai.mjs")).Path
$dataDir = Join-Path $env:LOCALAPPDATA "HuoYu"
$config = Join-Path $dataDir "ai-sync.json"
$launcher = Join-Path $dataDir "ai-sync.vbs"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

@{ endpoint = $Endpoint; secret = $Secret; codexHome = $CodexHome } |
  ConvertTo-Json |
  Set-Content -LiteralPath $config -Encoding UTF8

$nodeVbs = $node.Replace('"', '""')
$scriptVbs = $script.Replace('"', '""')
@"
Set shell = CreateObject("WScript.Shell")
shell.Run """$nodeVbs"" ""$scriptVbs""", 0, True
"@ | Set-Content -LiteralPath $launcher -Encoding ASCII

$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$launcher`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Hours 1)
$settings = New-ScheduledTaskSettingsSet -Hidden -StartWhenAvailable -RunOnlyIfIdle -IdleDuration (New-TimeSpan -Minutes 5) -IdleWaitTimeout (New-TimeSpan -Hours 4) -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName "HuoYu Codex AI Sync" -Action $action -Trigger $trigger -Settings $settings -Description "空闲时增量同步 Codex 数值摘要到 HuoYu" -Force | Out-Null
Start-ScheduledTask -TaskName "HuoYu Codex AI Sync"
Write-Host "HuoYu Codex AI Sync 已安装并在后台运行。"
