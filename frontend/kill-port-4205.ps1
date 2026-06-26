$conn = Get-NetTCPConnection -LocalPort 4205 -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host ("Tue le processus sur le port 4205 (PID: " + $conn.OwningProcess + ")")
} else {
    Write-Host "Aucun processus sur le port 4205"
}
