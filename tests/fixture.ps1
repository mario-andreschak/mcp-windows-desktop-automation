$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class McpFixtureVisibility {
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int mode);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
}
'@
$request = [Console]::In.ReadLine() | ConvertFrom-Json
$form = New-Object System.Windows.Forms.Form
$form.Text = $request.title
$form.Width = 340; $form.Height = 220
$form.StartPosition = 'Manual'; $form.Location = New-Object System.Drawing.Point(20,20)
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::CornflowerBlue
$text = New-Object System.Windows.Forms.TextBox
$text.Name = 'McpFixtureText'; $text.Text = 'owned fixture'; $text.Location = New-Object System.Drawing.Point(20,20); $text.Width = 220
$form.Controls.Add($text)
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 100
$timer.Add_Tick({ if (Test-Path -LiteralPath $request.stopFile) { $form.Close() } })
$form.Add_Shown({ [void][McpFixtureVisibility]::ShowWindow($form.Handle, 5); $form.BringToFront(); $form.Refresh(); [Console]::Out.WriteLine('READY ' + $text.Handle.ToInt64() + ' VISIBLE=' + [McpFixtureVisibility]::IsWindowVisible($form.Handle)); [Console]::Out.Flush(); $timer.Start() })
try { [System.Windows.Forms.Application]::Run($form) } finally { $timer.Dispose(); $form.Dispose() }
