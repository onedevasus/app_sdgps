# Auto-save watcher: commits uncommitted changes every 30 seconds
# Run in background: Start-Job -FilePath ".githooks\auto-save-watcher.ps1" -ArgumentList "D:\BOULMANE\PycharmProjects\perso\ancfcc\app-sdgps"
# Stop: Get-Job | Stop-Job

param(
  [string]$RepoPath = (Get-Location).Path
)

while ($true) {
  try {
    Push-Location $RepoPath
    $status = git status --porcelain 2>$null
    if ($status) {
      git add -A 2>$null
      git commit -m "wip: auto-save [$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')]" 2>$null
    }
  } catch {
    # ignore errors
  } finally {
    Pop-Location
  }
  Start-Sleep -Seconds 30
}
