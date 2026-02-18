
$dbPath = 'C:\Users\Admin\Documents\Creative_temp.accdb'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object -ComObject ADODB.Connection
try {
    $conn.Open($connStr)
    $rsQ = $conn.Execute("SELECT * FROM [Quotation] WHERE ID = 1197")
    $quotationFields = @{}
    if (!$rsQ.EOF) {
        for ($i = 0; $i -lt $rsQ.Fields.Count; $i++) {
            $f = $rsQ.Fields.Item($i)
            $quotationFields[$f.Name] = $f.Value
        }
    }
    $quotationFields | ConvertTo-Json | Out-File -FilePath "quotation_1197.json" -Encoding utf8
}
finally {
    if ($conn.State -eq 1) { $conn.Close() }
}
