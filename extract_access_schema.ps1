
$dbPath = "C:\Users\Admin\Documents\Creative Packaging 10-05-2020 FINAL.accdb"
$connectionString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source='$dbPath';"

try {
    $connection = New-Object System.Data.OleDb.OleDbConnection($connectionString)
    $connection.Open()

    $tables = $connection.GetSchema("Tables") | Where-Object { $_.TABLE_TYPE -eq "TABLE" }
    
    foreach ($table in $tables) {
        $tableName = $table.TABLE_NAME
        Write-Host "Table: $tableName"
        
        $columns = $connection.GetSchema("Columns", @($null, $null, $tableName))
        foreach ($column in $columns) {
            Write-Host "  Column: $($column.COLUMN_NAME) ($($column.DATA_TYPE))"
        }
        Write-Host ""
    }

    $connection.Close()
} catch {
    Write-Error "Failed to connect to Access Database: $($_.Exception.Message)"
    if ($_.Exception.Message -like "*Microsoft.ACE.OLEDB.12.0' provider is not registered*") {
        Write-Host "TIP: The Microsoft Access Database Engine might not be installed or there is a bitness mismatch (32-bit vs 64-bit)."
    }
}
