Set objShell = CreateObject("WScript.Shell")
objShell.Run """C:\Program Files\Google\Chrome\Application\chrome.exe"" --app=https://guntthanadol.github.io/grab_tracker", 1, False
WScript.Sleep 10
objShell.AppActivate "grab_tracker"
WScript.Sleep 100
objShell.SendKeys "{F11}"