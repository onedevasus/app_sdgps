$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'node'
$psi.Arguments = '.\node_modules\@angular\cli\bin\ng.js serve --host 0.0.0.0 --port 4205 --disable-host-check'
$psi.WorkingDirectory = 'D:\BOULMANE\PycharmProjects\perso\ancfcc\app-sdgps\frontend'
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = 'Hidden'
$p = [System.Diagnostics.Process]::Start($psi)
Write-Host ('Frontend Angular lance (PID: ' + $p.Id + ')')
