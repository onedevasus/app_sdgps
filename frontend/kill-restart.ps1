# Kill any process on port 4205
$conn = Get-NetTCPConnection -LocalPort 4205 -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host ("Tue PID " + $conn.OwningProcess + " sur le port 4205")
    Start-Sleep -Seconds 2
}
Write-Host "Port 4205 libere"
