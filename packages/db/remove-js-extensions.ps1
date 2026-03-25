# Remove .js extensions from all relative imports in schema files
$files = Get-ChildItem -Path ".\src\schema\*.ts"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Remove .js from relative imports
    $content = $content -replace "from '(\.[^']+?)\.js'", "from '`$1'"
    Set-Content $file.FullName $content -NoNewline
}
Write-Host "Done! Removed .js extensions from all imports."
