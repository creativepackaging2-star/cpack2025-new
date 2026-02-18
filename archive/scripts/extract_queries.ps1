
$dbPath = 'c:\Users\Admin\Desktop\Packaging App\Creative Packaging 10-05-2020 FINAL.accdb'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object -ComObject ADODB.Connection
$conn.Open($connStr)

$queries = @()
# MS Access system table MSysObjects contains query definitions
$rs = $conn.Execute("SELECT Name, Expression FROM MSysObjects WHERE Type=5") # Type 5 is Query
while (!$rs.EOF) {
    if ($rs.Fields.Item("Name").Value -notlike "~*") {
        $queries += [PSCustomObject]@{
            Name = $rs.Fields.Item("Name").Value
            SQL  = $rs.Fields.Item("Expression").Value
        }
    }
    $rs.MoveNext()
}
$conn.Close()
$queries | ConvertTo-Json
