
$dbPath = 'C:\Users\Admin\Documents\Creative_temp.accdb'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object -ComObject ADODB.Connection
try {
    $conn.Open($connStr)
    
    # Dump all tables first
    $rs = $conn.OpenSchema(20) # adSchemaTables
    $tables = @()
    while (!$rs.EOF) {
        $tables += @{
            Name = $rs.Fields.Item("TABLE_NAME").Value
            Type = $rs.Fields.Item("TABLE_TYPE").Value
        }
        $rs.MoveNext()
    }

    # Dump Quotation columns and values
    $rsQ = $conn.Execute("SELECT TOP 1 * FROM [Quotation] ORDER BY Id DESC")
    $quotationFields = @()
    for ($i = 0; $i -lt $rsQ.Fields.Count; $i++) {
        $f = $rsQ.Fields.Item($i)
        $quotationFields += @{
            Name  = $f.Name
            Value = $f.Value
        }
    }

    $results = @{
        Tables          = $tables
        QuotationSample = $quotationFields
    }
    $results | ConvertTo-Json -Depth 5
}
finally {
    if ($conn.State -eq 1) { $conn.Close() }
}
