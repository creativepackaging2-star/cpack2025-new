
$access = New-Object -ComObject Access.Application
try {
    $access.OpenCurrentDatabase('C:\Users\Admin\Documents\Creative_temp.accdb')
    $modules = $access.CurrentProject.AllModules
    $moduleNames = @()
    foreach ($m in $modules) {
        $moduleNames += $m.Name
        Write-Host "Exporting Module: $($m.Name)"
        try {
            $access.SaveAsText(5, $m.Name, "C:\Users\Admin\Documents\$($m.Name).txt") # acModule = 5
        }
        catch {
            Write-Host "Failed to export $($m.Name)"
        }
    }
    $moduleNames | ConvertTo-Json
}
finally {
    $access.Quit()
}
