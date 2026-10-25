$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Drawing
$collection = New-Object System.Drawing.Text.InstalledFontCollection
try {
    $names = @($collection.Families | ForEach-Object { $_.Name })
    try {
        Add-Type -AssemblyName PresentationCore
        foreach ($family in [System.Windows.Media.Fonts]::SystemFontFamilies) {
            foreach ($face in $family.GetTypefaces()) {
                $glyph = $null
                if ($face.TryGetGlyphTypeface([ref]$glyph)) { $names += $family.Source; break }
            }
        }
    } catch { }
    @($names | Where-Object { $_ } | Sort-Object -Unique) | ConvertTo-Json -Compress
} finally { $collection.Dispose() }
