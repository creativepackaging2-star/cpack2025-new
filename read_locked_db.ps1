
$dbPath = 'c:\Users\Admin\Desktop\Packaging App\Creative Packaging 10-05-2020 FINAL.accdb'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Mode=Share Deny None;Persist Security Info=False;"
$conn = New-Object -ComObject ADODB.Connection
try {
    $conn.Open($connStr)
    $rs = $conn.Execute("SELECT TOP 5 * FROM [Quotation] ORDER BY Id DESC")
    $rows = @()
    while (!$rs.EOF) {
        $row = @{}
        for ($i = 0; $i -lt $rs.Fields.Count; $i++) {
            $f = $rs.Fields.Item($i)
            $row[$f.Name] = $f.Value
        }
        $rows += $row
        $rs.MoveNext()
    }
    $rows | ConvertTo-Json
}
finally {
    if ($conn.State -eq 1) { $conn.Close() }
}
