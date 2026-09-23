param([string]$In, [string]$Out, [int]$MaxW = 640)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$ratio = [Math]::Min(1.0, $MaxW / $img.Width)
$w = [int]($img.Width * $ratio); $h = [int]($img.Height * $ratio)
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($img, 0, 0, $w, $h)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 62
$bmp.Save($Out, $codec, $params)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
Write-Output "ok $Out ($w x $h)"
