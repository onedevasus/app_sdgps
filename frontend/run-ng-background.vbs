' Run Angular dev server in background (no window)
Dim shell
Set shell = CreateObject("WScript.Shell")

Dim basePath
basePath = "D:\BOULMANE\PycharmProjects\perso\ancfcc\app-sdgps\frontend"

Dim cmd
cmd = "cmd.exe /c cd /d """ & basePath & """ && node """ & basePath & "\node_modules\@angular\cli\bin\ng.js"" serve --host 0.0.0.0 --port 4205 --disable-host-check"

' 0 = Hide window, False = don't wait for completion
shell.Run cmd, 0, False
