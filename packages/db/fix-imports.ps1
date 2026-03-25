# Add .js extensions to all relative imports in compiled JS files
$files = Get-ChildItem -Path ".\dist\schema\*.js" -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Add .js to relative imports that don't have it
    $content = $content -replace "from '(\.[^']+?)(?!\.js)'", "from '`$1.js'"
    Set-Content $file.FullName $content -NoNewline
}
Write-Host "Done!"
