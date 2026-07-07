# Auto-save watcher: commits uncommitted changes every 30 seconds
# Usage:
#   Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -File `"$pwd\docs\scripts\auto-save-watcher.ps1`""

$RepoPath = "D:\BOULMANE\PycharmProjects\perso\ancfcc\app-sdgps"

while ($true) {
  try {
    Push-Location $RepoPath
    $status = git status --porcelain 2>$null
    if ($status) {
      git add -A --ignore-errors 2>$null
      git diff --cached --quiet 2>$null
      if ($LASTEXITCODE -ne 0) {
        git commit -m "wip: auto-save [$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')]" 2>$null
        $timeStr = Get-Date -Format 'HH:mm:ss'
        Write-Output "[$timeStr] Auto-save committed"
      }
    }
  } catch {
    $timeStr = Get-Date -Format 'HH:mm:ss'
    Write-Output "[$timeStr] Error: $_"
  } finally {
    Pop-Location
  }
  Start-Sleep -Seconds 30
}
