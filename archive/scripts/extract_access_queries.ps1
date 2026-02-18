
$dbPath = "C:\Users\Admin\Documents\Creative Packaging 10-05-2020 FINAL.accdb"
$connectionString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source='$dbPath';"
$logFile = "access_queries_output.txt"

"--- Access Queries Extraction ---" | Out-File $logFile

try {
    $connection = New-Object System.Data.OleDb.OleDbConnection($connectionString)
    $connection.Open()

    # Get Views (Queries)
    $views = $connection.GetSchema("Views")
    
    foreach ($view in $views) {
        $viewName = $view.TABLE_NAME
        "Query: $viewName" | Out-File $logFile -Append
        # Note: Access doesn't easily expose the SQL of a query through OleDb GetSchema
        # We might need to try querying it or use a different method if possible
    }

    # Additional try to get Query definitions via ADOX if available
    try {
        $cat = New-Object -ComObject ADOX.Catalog
        $cat.ActiveConnection = $connectionString
        foreach ($q in $cat.Procedures) {
            "Procedure (Query): $($q.Name)" | Out-File $logFile -Append
            try {
                "  SQL: $($q.Command.CommandText)" | Out-File $logFile -Append
            } catch {
                "  SQL: (Could not extract)" | Out-File $logFile -Append
            }
        }
        foreach ($v in $cat.Views) {
            "View (Query): $($v.Name)" | Out-File $logFile -Append
            try {
                "  SQL: $($v.Command.CommandText)" | Out-File $logFile -Append
            } catch {
                "  SQL: (Could not extract)" | Out-File $logFile -Append
            }
        }
    } catch {
        "ADOX Error: $($_.Exception.Message)" | Out-File $logFile -Append
    }

    $connection.Close()
    "Success" | Out-File $logFile -Append
} catch {
    "Error: $($_.Exception.Message)" | Out-File $logFile -Append
}
