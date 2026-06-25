@echo off
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=https://guntthanadol.github.io/grab_tracker
timeout /t 2 /nobreak >nul
powershell -command "(New-Object -ComObject Shell.Application).Windows() | ForEach-Object { $_.Document.Application.Navigate($_.LocationURL); $_.Maximize() }"