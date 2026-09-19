Add-Type -AssemblyName System.Drawing

# Colores de la app
$fondo = [System.Drawing.Color]::FromArgb(255, 11, 14, 20)     # #0b0e14
$borde = [System.Drawing.Color]::FromArgb(255, 38, 45, 63)      # #262d3f
$hielo = [System.Drawing.Color]::FromArgb(255, 124, 196, 255)   # #7cc4ff

# Helper: rectangulo redondeado como GraphicsPath
function New-RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc($x, $y, $r, $r, 180, 90)
    $p.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
    $p.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
    $p.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
    $p.CloseFigure()
    return $p
}

# Dibuja el copo de nieve sobre un bitmap de $tam x $tam.
# $completo = $true -> fondo cuadrado sin transparencia (maskable / apple)
function New-Icono([int]$tam, [bool]$completo) {
    $escala = $tam / 512.0
    $bmp = New-Object System.Drawing.Bitmap($tam, $tam)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    if ($completo) {
        $g.Clear($fondo)
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
        # fondo redondeado con borde sutil
        $r = 115 * $escala
        $fondoPath = New-RoundRect ($r/2) ($r/2) ($tam - $r) ($tam - $r) $r
        $bgBrush = New-Object System.Drawing.SolidBrush($fondo)
        $g.FillPath($bgBrush, $fondoPath)
        $pen = New-Object System.Drawing.Pen($borde, (3 * $escala))
        $g.DrawPath($pen, $fondoPath)
        $fondoPath.Dispose(); $bgBrush.Dispose(); $pen.Dispose()
    }

    # El copo de nieve centrado (U+2744)
    $fontSize = [int](0.58 * $tam)
    $font = New-Object System.Drawing.Font('Segoe UI Symbol', $fontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, (-0.02 * $tam), $tam, $tam)
    $hieloBrush = New-Object System.Drawing.SolidBrush($hielo)
    $g.DrawString([char]0x2744, $font, $hieloBrush, $rect, $sf)
    $font.Dispose(); $hieloBrush.Dispose(); $sf.Dispose()

    $g.Dispose()
    return $bmp
}

$out = "C:\Users\Usuario\WINTER-ARC"
New-Icono 512 $false | ForEach-Object { $_.Save("$out\icono-512.png", [System.Drawing.Imaging.ImageFormat]::Png); $_.Dispose() }
New-Icono 512 $true  | ForEach-Object { $_.Save("$out\icono-512-maskable.png", [System.Drawing.Imaging.ImageFormat]::Png); $_.Dispose() }
New-Icono 192 $false | ForEach-Object { $_.Save("$out\icono-192.png", [System.Drawing.Imaging.ImageFormat]::Png); $_.Dispose() }
New-Icono 180 $true  | ForEach-Object { $_.Save("$out\icono-180.png", [System.Drawing.Imaging.ImageFormat]::Png); $_.Dispose() }

Get-ChildItem "$out\icono-*.png" | Select-Object Name, Length
