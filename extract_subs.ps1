
$path = 'C:\Users\Admin\Documents\Quotation.txt'
$content = Get-Content $path -Encoding Unicode
$code = $content | Select-String -Pattern "Sub |Function "
$code | Select-Object -First 100 | Out-File -FilePath "form_subs.txt" -Encoding utf8
