
$path = 'C:\Users\Admin\Documents\Quotation.txt'
$content = Get-Content $path -Encoding Unicode
$formulas = $content | Select-String -Pattern "ControlSource =\"="
$formulas | Select-Object -First 50 | Out-File -FilePath "form_formulas.txt" -Encoding utf8
