Stop-Process -Id 28968 -Force -ErrorAction SilentlyContinue
Write-Host "Arret du processus 28968"
Start-Sleep -Seconds 2
Get-NetTCPConnection -LocalPort 4205 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host ("Tue PID " + $_.OwningProcess + " sur le port 4205")
}
