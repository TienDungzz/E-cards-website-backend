Add-Type -AssemblyName System.Drawing
$diagramRoot = Join-Path $PSScriptRoot '../docs/product/diagrams'
$layoutSource = Get-Content -LiteralPath (Join-Path $diagramRoot 'layouts.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$layouts = @{}
foreach ($property in $layoutSource.PSObject.Properties) {
  $layouts[$property.Name] = @($property.Value)
}
$allSources = (Get-ChildItem -LiteralPath $diagramRoot -Filter '*.md' | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8 }) -join "`n"
$fields = @{}
foreach ($match in [regex]::Matches($allSources, '(?m)^    (\w+) \{\r?\n([\s\S]*?)^    \}')) {
  $fields[$match.Groups[1].Value] = @($match.Groups[2].Value.Trim() -split '\r?\n' | ForEach-Object { $_.Trim() })
}
$font = [System.Drawing.Font]::new('Consolas', 12)
$headingFont = [System.Drawing.Font]::new('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$titleFont = [System.Drawing.Font]::new('Segoe UI', 27, [System.Drawing.FontStyle]::Bold)
$noteFont = [System.Drawing.Font]::new('Segoe UI', 13)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(30, 41, 59))
$white = [System.Drawing.Brushes]::White
$sharedFields = $fields.Clone()
foreach ($name in $layouts.Keys) {
  $fields = $sharedFields.Clone()
  $localSource = Get-Content -LiteralPath (Join-Path $diagramRoot "$name.md") -Raw -Encoding UTF8
  foreach ($match in [regex]::Matches($localSource, '(?m)^    (\w+) \{\r?\n([\s\S]*?)^    \}')) {
    $fields[$match.Groups[1].Value] = @($match.Groups[2].Value.Trim() -split '\r?\n' | ForEach-Object { $_.Trim() })
  }
  $names = $layouts[$name]
  $columns = if ($name -eq 'overview') { 4 } elseif ($name -eq 'identity') { 3 } else { 4 }
  $cellWidth = 440
  $cellHeight = 365
  $width = $columns * $cellWidth + 160
  $rows = [int][Math]::Ceiling($names.Count / $columns)
  $height = $rows * $cellHeight + 245
  $bitmap = [System.Drawing.Bitmap]::new($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))
  $graphics.DrawString("E-CARDS / $($name.ToUpper())", $titleFont, $ink, 55, 25)
  $graphics.DrawString('PostgreSQL on Aiven | Proposed schema | FK arrows point to parent tables', $noteFont, $ink, 58, 80)
  $boxes = @{}
  for ($index = 0; $index -lt $names.Count; $index++) {
    $table = $names[$index]
    $x = 60 + ($index % $columns) * $cellWidth
    $y = 150 + [Math]::Floor($index / $columns) * $cellHeight
    $tableFields = $fields[$table]
    $boxHeight = 60 + $tableFields.Count * 25
    $boxes[$table] = [System.Drawing.RectangleF]::new($x, $y, 360, $boxHeight)
  }
  $source = Get-Content -LiteralPath (Join-Path $diagramRoot "$name.md") -Raw -Encoding UTF8
  $edgePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(100, 100, 116, 139), 1.8)
  $edgePen.CustomEndCap = [System.Drawing.Drawing2D.AdjustableArrowCap]::new(4, 5)
  foreach ($edge in [regex]::Matches($source, '(?m)^    (\w+) ([|o{}]+)--([|o{}]+) (\w+) : (\w+)')) {
    $parent = $boxes[$edge.Groups[1].Value]
    $child = $boxes[$edge.Groups[4].Value]
    if ($null -eq $parent -or $null -eq $child) { continue }
    $startX = $child.X + $child.Width / 2
    $startY = $child.Y + $child.Height / 2
    $endX = $parent.X + $parent.Width / 2
    $endY = $parent.Y + $parent.Height / 2
    if ([Math]::Abs($child.X - $parent.X) -gt 5) {
      $startX = if ($child.X -gt $parent.X) { $child.Left } else { $child.Right }
      $endX = if ($child.X -gt $parent.X) { $parent.Right } else { $parent.Left }
    } else {
      $startY = if ($child.Y -gt $parent.Y) { $child.Top } else { $child.Bottom }
      $endY = if ($child.Y -gt $parent.Y) { $parent.Bottom } else { $parent.Top }
    }
    $graphics.DrawLine($edgePen, [single]$startX, [single]$startY, [single]$endX, [single]$endY)
  }
  foreach ($table in $names) {
    $box = $boxes[$table]
    $color = if ($table -match 'plan|subscription|period|payment|order|webhook|feature|usage') { [System.Drawing.Color]::FromArgb(109, 40, 217) } elseif ($table -match 'user|session|auth|audit') { [System.Drawing.Color]::FromArgb(3, 105, 161) } else { [System.Drawing.Color]::FromArgb(15, 118, 110) }
    $headerBrush = [System.Drawing.SolidBrush]::new($color)
    $borderPen = [System.Drawing.Pen]::new($color, 2)
    $graphics.FillRectangle($white, $box)
    $graphics.DrawRectangle($borderPen, $box.X, $box.Y, $box.Width, $box.Height)
    $graphics.FillRectangle($headerBrush, $box.X, $box.Y, $box.Width, 43)
    $graphics.DrawString($table, $headingFont, $white, $box.X + 12, $box.Y + 7)
    $lineY = $box.Y + 53
    foreach ($field in $fields[$table]) {
      $graphics.DrawString($field, $font, $ink, $box.X + 10, $lineY)
      $lineY += 25
    }
    $headerBrush.Dispose()
    $borderPen.Dispose()
  }
  $graphics.DrawString('PK = primary key | FK = foreign key | UK = unique | Key fields only; full constraints in database.md', $noteFont, $ink, 58, $height - 65)
  $bitmap.Save((Join-Path $diagramRoot "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $edgePen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
  Write-Output "Rendered $name.png ($width x $height)"
}

foreach ($resource in @($font, $headingFont, $titleFont, $noteFont, $ink)) { $resource.Dispose() }
