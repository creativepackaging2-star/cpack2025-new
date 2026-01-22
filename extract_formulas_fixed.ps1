
$path = 'C:\Users\Admin\Documents\Quotation.txt'
$content = Get-Content $path -Encoding Unicode
$formulas = $content | Where-Object { $_ -like "*ControlSource =`"=*" }
$formulas | Select-Object -First 100 | Out-File -FilePath "form_formulas.txt" -Encoding utf8
