
$dbPath = "C:\Users\Admin\Documents\Creative Packaging 10-05-2020 FINAL.accdb"
$connectionString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source='$dbPath';"
$logFile = "access_data_sample.txt"

"--- Access Quotation Data Sample ---" | Out-File $logFile

try {
    $connection = New-Object System.Data.OleDb.OleDbConnection($connectionString)
    $connection.Open()

    $cmd = $connection.CreateCommand()
    $cmd.CommandText = "SELECT TOP 5 * FROM [Quotation] ORDER BY ID DESC"
    $adapter = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    $adapter.Fill($dt)
    
    foreach ($row in $dt.Rows) {
        "--- Row ---" | Out-File $logFile -Append
        foreach ($col in $dt.Columns) {
            "$($col.ColumnName): $($row[$col.ColumnName])" | Out-File $logFile -Append
        }
        "" | Out-File $logFile -Append
    }

    $connection.Close()
    "Success" | Out-File $logFile -Append
} catch {
    "Error: $($_.Exception.Message)" | Out-File $logFile -Append
}
