Set objShell = CreateObject("WScript.Shell")
objShell.Run """C:\Program Files\Google\Chrome\Application\chrome.exe"" --app=https://grabtracker.netlify.app", 1, False
WScript.Sleep 10
objShell.AppActivate "Grab"
WScript.Sleep 100
objShell.SendKeys "{F11}"
