
$dbPath = "C:\Users\Admin\Documents\Creative Packaging 10-05-2020 FINAL.accdb"
$connectionString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source='$dbPath';"
$logFile = "access_schema_output_v3.txt"

"--- Access Schema Extraction v3 ---" | Out-File $logFile

try {
    $connection = New-Object System.Data.OleDb.OleDbConnection($connectionString)
    $connection.Open()

    # Get Tables
    $tables = $connection.GetSchema("Tables") | Where-Object { $_.TABLE_TYPE -eq "TABLE" }
    
    foreach ($table in $tables) {
        $tableName = $table.TABLE_NAME
        "Table: $tableName" | Out-File $logFile -Append
        
        try {
            $cmd = $connection.CreateCommand()
            $cmd.CommandText = "SELECT TOP 1 * FROM [$tableName]"
            $adapter = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
            $dt = New-Object System.Data.DataTable
            $adapter.FillSchema($dt, [System.Data.SchemaType]::Source)
            
            foreach ($column in $dt.Columns) {
                "  Column: $($column.ColumnName) ($($column.DataType))" | Out-File $logFile -Append
            }
        } catch {
            "  Error getting columns for $tableName : $($_.Exception.Message)" | Out-File $logFile -Append
        }
        "" | Out-File $logFile -Append
    }

    $connection.Close()
    "Success" | Out-File $logFile -Append
} catch {
    "Error: $($_.Exception.Message)" | Out-File $logFile -Append
}
