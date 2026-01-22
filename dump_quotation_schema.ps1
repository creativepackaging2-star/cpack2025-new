
$dbPath = 'c:\Users\Admin\Desktop\Packaging App\Creative Packaging 10-05-2020 FINAL.accdb'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
try {
    $conn.Open()
    $dt = $conn.GetOleDbSchemaTable([System.Data.OleDb.OleDbSchemaGuid]::Tables, @($null, $null, $null, "TABLE"))
    $tables = @()
    foreach ($row in $dt.Rows) {
        $tables += $row["TABLE_NAME"]
    }
    
    $results = @{}
    foreach ($tableName in $tables) {
        if ($tableName -like "*Quotation*") {
            $cmd = New-Object System.Data.OleDb.OleDbCommand("SELECT TOP 1 * FROM [$tableName]", $conn)
            $adapter = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
            $dataTable = New-Object System.Data.DataTable
            $adapter.Fill($dataTable) | Out-Null
            
            $columns = @()
            foreach ($col in $dataTable.Columns) {
                $columns += $col.ColumnName
            }
            $results[$tableName] = @{
                Columns = $columns
                Sample  = $dataTable.Rows[0] | Select-Object *
            }
        }
    }
    $results | ConvertTo-Json -Depth 5
}
finally {
    $conn.Close()
}
