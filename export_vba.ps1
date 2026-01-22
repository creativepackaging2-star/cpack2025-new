
$access = New-Object -ComObject Access.Application
try {
    $access.OpenCurrentDatabase('C:\Users\Admin\Documents\Creative_temp.accdb')
    $forms = $access.CurrentProject.AllForms
    foreach ($form in $forms) {
        if ($form.Name -like "*Quotation*") {
            Write-Host "Exporting Form: $($form.Name)"
            # Access doesn't easily export VBA to text via COM without SaveAsText which is unofficial but often works
            # SaveAsText acForm, "FormName", "Path"
            # acForm = 2
            try {
                $access.SaveAsText(2, $form.Name, "C:\Users\Admin\Documents\$($form.Name).txt")
            }
            catch {
                Write-Host "Failed to export $($form.Name)"
            }
        }
    }
}
finally {
    $access.Quit()
}
