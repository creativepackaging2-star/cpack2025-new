
$dbPath = 'C:\Users\Admin\Documents\Creative_temp.accdb'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object -ComObject ADODB.Connection
try {
    $conn.Open($connStr)
    
    # 1. Get Column Names and Sample Data from Quotation
    $rs = $conn.Execute("SELECT TOP 1 * FROM [Quotation] ORDER BY Id DESC")
    $quotationInfo = @{
        Columns = @()
        Sample  = @{}
    }
    for ($i = 0; $i -lt $rs.Fields.Count; $i++) {
        $f = $rs.Fields.Item($i)
        $quotationInfo.Columns += $f.Name
        $quotationInfo.Sample[$f.Name] = $f.Value
    }

    # 2. Get Queries (Formulas are often here)
    # Since MSysObjects is tricky via OLEDB, I'll try to find any "Total" or "Rate" related queries
    # by querying common names if possible or using OpenSchema
    $rsQueries = $conn.OpenSchema(4) # adSchemaTables includes views/queries
    $queries = @()
    while (!$rsQueries.EOF) {
        if ($rsQueries.Fields.Item("TABLE_TYPE").Value -eq "VIEW") {
            $queries += $rsQueries.Fields.Item("TABLE_NAME").Value
        }
        $rsQueries.MoveNext()
    }

    $results = @{
        QuotationTable = $quotationInfo
        QueriesList    = $queries
    }
    $results | ConvertTo-Json -Depth 5
}
finally {
    if ($conn.State -eq 1) { $conn.Close() }
}
