Dim shell, fso
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim basePath
basePath = "D:\BOULMANE\PycharmProjects\perso\ancfcc\app-sdgps\frontend"
shell.CurrentDirectory = basePath

Dim cmd
cmd = "node """ & basePath & "\node_modules\@angular\cli\bin\ng.js"" serve --host 0.0.0.0 --port 4205 --disable-host-check"

shell.Run cmd, 0, False
