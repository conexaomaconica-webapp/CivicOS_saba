Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\public\logoconexao_red_vert.png"
$destinationDirectory = Join-Path $PSScriptRoot "..\android-overrides\app\src\main\res\drawable-xxxhdpi"
$destinationPath = Join-Path $destinationDirectory "launch_symbol.png"

New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null

$source = [System.Drawing.Image]::FromFile($sourcePath)
$canvas = New-Object System.Drawing.Bitmap 512, 512, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)

try {
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $sourceRect = New-Object System.Drawing.Rectangle 0, 0, 210, 208
  $destinationRect = New-Object System.Drawing.Rectangle 101, 102, 310, 307
  $graphics.DrawImage($source, $destinationRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  $canvas.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $graphics.Dispose()
  $canvas.Dispose()
  $source.Dispose()
}

Write-Output "Símbolo nativo gerado em $destinationPath"

function Export-SquareIcon {
  param(
    [System.Drawing.Image]$Image,
    [string]$Path,
    [int]$Size,
    [double]$ContentScale
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $iconGraphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $iconGraphics.Clear([System.Drawing.Color]::Transparent)
    $iconGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $iconGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $iconGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $contentSize = [int][Math]::Round($Size * $ContentScale)
    $offset = [int][Math]::Round(($Size - $contentSize) / 2)
    $rect = New-Object System.Drawing.Rectangle $offset, $offset, $contentSize, $contentSize
    $iconGraphics.DrawImage($Image, $rect)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $iconGraphics.Dispose()
    $bitmap.Dispose()
  }
}

$iconSourcePath = Join-Path $PSScriptRoot "..\public\android-chrome-512x512.png"
$iconSource = [System.Drawing.Image]::FromFile($iconSourcePath)
$densitySizes = @{
  "mdpi" = @(48, 108)
  "hdpi" = @(72, 162)
  "xhdpi" = @(96, 216)
  "xxhdpi" = @(144, 324)
  "xxxhdpi" = @(192, 432)
}

try {
  foreach ($density in $densitySizes.Keys) {
    $directory = Join-Path $PSScriptRoot "..\android-overrides\app\src\main\res\mipmap-$density"
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    $legacySize = $densitySizes[$density][0]
    $foregroundSize = $densitySizes[$density][1]
    Export-SquareIcon -Image $iconSource -Path (Join-Path $directory "ic_launcher.png") -Size $legacySize -ContentScale 0.88
    Export-SquareIcon -Image $iconSource -Path (Join-Path $directory "ic_launcher_round.png") -Size $legacySize -ContentScale 0.88
    Export-SquareIcon -Image $iconSource -Path (Join-Path $directory "ic_launcher_foreground.png") -Size $foregroundSize -ContentScale 0.61
  }
}
finally {
  $iconSource.Dispose()
}

Write-Output "Ícones Android gerados a partir do arquivo oficial de 512 px."
