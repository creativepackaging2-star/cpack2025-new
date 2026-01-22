
$access = New-Object -ComObject Access.Application
try {
    $access.OpenCurrentDatabase('c:\Users\Admin\Desktop\Packaging App\Creative Packaging 10-05-2020 FINAL.accdb')
    $queries = @()
    foreach ($q in $access.CurrentData.AllQueries) {
        $queries += $q.Name
    }
    $queries | ConvertTo-Json
}
finally {
    $access.Quit()
}
