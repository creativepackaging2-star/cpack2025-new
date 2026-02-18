
$dbPath = 'C:\Users\Admin\Documents\Creative_temp.accdb'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object -ComObject ADODB.Connection
try {
    $conn.Open($connStr)
    $rs = $conn.Execute("SELECT TOP 1 * FROM [Quotation] WHERE Vat > 0")
    $fields = @{}
    if (!$rs.EOF) {
        for ($i = 0; $i -lt $rs.Fields.Count; $i++) {
            $f = $rs.Fields.Item($i)
            $fields[$f.Name] = $f.Value
        }
    }
    $fields | ConvertTo-Json | Out-File -FilePath "quotation_vat.json" -Encoding utf8
}
finally {
    if ($conn.State -eq 1) { $conn.Close() }
}
