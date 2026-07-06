Start-Process "chrome.exe" "--app=https://grabtracker.netlify.app"
Start-Sleep -Seconds 2
$shell = New-Object -ComObject Shell.Application
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string cls, string title);
  }
"@
Get-Process chrome | Sort-Object StartTime -Descending | Select-Object -First 1 | ForEach-Object {
  [Win32]::ShowWindow($_.MainWindowHandle, 3)
}
