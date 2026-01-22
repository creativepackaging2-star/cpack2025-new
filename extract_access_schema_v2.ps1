
$dbPath = "C:\Users\Admin\Documents\Creative Packaging 10-05-2020 FINAL.accdb"
$connectionString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source='$dbPath';"
$logFile = "access_schema_output.txt"

"--- Access Schema Extraction ---" | Out-File $logFile

try {
    $connection = New-Object System.Data.OleDb.OleDbConnection($connectionString)
    $connection.Open()

    $tables = $connection.GetSchema("Tables") | Where-Object { $_.TABLE_TYPE -eq "TABLE" }
    
    foreach ($table in $tables) {
        $tableName = $table.TABLE_NAME
        "Table: $tableName" | Out-File $logFile -Append
        
        $columns = $connection.GetSchema("Columns", @($null, $null, $tableName))
        foreach ($column in $columns) {
            "  Column: $($column.COLUMN_NAME) ($($column.DATA_TYPE))" | Out-File $logFile -Append
        }
        "" | Out-File $logFile -Append
    }

    $connection.Close()
    "Success" | Out-File $logFile -Append
} catch {
    "Error: $($_.Exception.Message)" | Out-File $logFile -Append
}
