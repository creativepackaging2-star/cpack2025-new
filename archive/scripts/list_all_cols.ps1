
$dbPath = 'C:\Users\Admin\Documents\Creative_temp.accdb'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object -ComObject ADODB.Connection
try {
    $conn.Open($connStr)
    $rs = $conn.Execute("SELECT TOP 1 * FROM [Quotation]")
    $cols = @()
    for ($i = 0; $i -lt $rs.Fields.Count; $i++) {
        $cols += $rs.Fields.Item($i).Name
    }
    $cols | ConvertTo-Json
}
finally {
    if ($conn.State -eq 1) { $conn.Close() }
}
