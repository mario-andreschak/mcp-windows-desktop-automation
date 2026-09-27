$ErrorActionPreference = 'Stop'
try {
  [Console]::Error.WriteLine('MCP_CAPTURE_STAGE=assemblies')
  Microsoft.PowerShell.Utility\Add-Type -AssemblyName System.Drawing
  Microsoft.PowerShell.Utility\Add-Type -AssemblyName System.Windows.Forms
  [Console]::Error.WriteLine('MCP_CAPTURE_STAGE=compiler')
  Microsoft.PowerShell.Utility\Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class McpCapture {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);
 [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
}
'@
  [Console]::Error.WriteLine('MCP_CAPTURE_STAGE=input')
  $request = [Console]::In.ReadLine() | Microsoft.PowerShell.Utility\ConvertFrom-Json
  [Console]::Error.WriteLine('MCP_CAPTURE_STAGE=bounds')
  $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $x = $bounds.X; $y = $bounds.Y; $width = $bounds.Width; $height = $bounds.Height
  if ($request.target -eq 'region') {
    $x = [int]$request.x; $y = [int]$request.y; $width = [int]$request.width; $height = [int]$request.height
    if ($x -lt $bounds.Left -or $y -lt $bounds.Top -or ($x + $width) -gt $bounds.Right -or ($y + $height) -gt $bounds.Bottom) { throw 'Out of screen bounds' }
  }
  if ($request.target -eq 'window') {
    $rect = New-Object McpCapture+Rect
    if (-not [McpCapture]::GetWindowRect([IntPtr][long]$request.handle, [ref]$rect)) { throw 'No window' }
    $width = $rect.Right - $rect.Left; $height = $rect.Bottom - $rect.Top
  }
  if ($width -le 0 -or $height -le 0 -or ([long]$width * $height) -gt 32000000) { throw 'Image dimensions exceed limit' }
  [Console]::Error.WriteLine('MCP_CAPTURE_STAGE=bitmap')
  $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppRgb)
  try {
    [Console]::Error.WriteLine('MCP_CAPTURE_STAGE=capture')
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      if ($request.target -eq 'window') {
        $hdc = $graphics.GetHdc()
        try { if (-not [McpCapture]::PrintWindow([IntPtr][long]$request.handle, $hdc, 0)) { throw 'Window capture unavailable' } }
        finally { $graphics.ReleaseHdc($hdc) }
      } else { $graphics.CopyFromScreen($x, $y, 0, 0, $bitmap.Size) }
    } finally { $graphics.Dispose() }
    [Console]::Error.WriteLine('MCP_CAPTURE_STAGE=encoding')
    $stream = New-Object System.IO.MemoryStream
    try {
      $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
      if ($stream.Length -gt 8388608) { throw 'Image bytes exceed limit' }
      [Console]::Out.Write([Convert]::ToBase64String($stream.ToArray()))
    } finally { $stream.Dispose() }
  } finally { $bitmap.Dispose() }
  [Console]::Error.WriteLine('MCP_CAPTURE_STAGE=complete')
  exit 0
} catch {
  [Console]::Error.WriteLine('Desktop screenshot failed.')
  exit 1
}
