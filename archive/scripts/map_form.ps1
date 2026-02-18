
$path = 'c:\Users\Admin\scratch\cpack2025\Quotation_utf8.txt'
$content = Get-Content $path
$results = @()
$currentLabel = $null
foreach ($line in $content) {
    if ($line -like "*Begin Label*") {
        $currentLabel = @{ Type = "Label" }
    }
    elseif ($line -like "*Caption =\" * " -and $currentLabel -ne $null) {
        $currentLabel.Caption = $line.Split('"')[1]
    } elseif ($line -like "*End*" -and $currentLabel -ne $null) {
        $results += $currentLabel
        $currentLabel = $null
    } elseif ($line -like "*Begin TextBox*") {
        $currentLabel = @{ Type = "TextBox" }
    } elseif ($line -like "*ControlSource =\"*" -and $currentLabel -ne $null) {
        $currentLabel.ControlSource = $line.Split('"')[1]
    }
}
$results | ConvertTo-Json | Out-File -FilePath "form_map.json" -Encoding utf8
