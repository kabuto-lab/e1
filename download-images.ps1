# PowerShell Script to Download All Model Images
# Save as: download-images.ps1
# Run: powershell -ExecutionPolicy Bypass -File download-images.ps1

$basePath = ".\images\models"

# Create directory if not exists
if (!(Test-Path $basePath)) {
    New-Item -ItemType Directory -Force -Path $basePath | Out-Null
    Write-Host "Created directory: $basePath" -ForegroundColor Green
}

# Images list (Name | Filename | URL)
$images = @(
    @{ Name = "Юлианна"; File = "yulianna-main.jpg"; Url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80" },
    @{ Name = "Виктория"; File = "viktoria-main.jpg"; Url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80" },
    @{ Name = "Алина"; File = "alina-main.jpg"; Url = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80" },
    @{ Name = "София"; File = "sofia-main.jpg"; Url = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80" },
    @{ Name = "Наталья"; File = "natalia-main.jpg"; Url = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80" },
    @{ Name = "Елена"; File = "elena-main.jpg"; Url = "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80" },
    @{ Name = "Оливия"; File = "olivia-main.jpg"; Url = "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80" },
    @{ Name = "Анастасия"; File = "anastasia-main.jpg"; Url = "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=800&q=80" }
)

# Download each image
foreach ($img in $images) {
    $filePath = Join-Path $basePath $img.File
    Write-Host "Downloading $($img.Name)..." -ForegroundColor Yellow
    
    try {
        Invoke-WebRequest -Uri $img.Url -OutFile $filePath -UseBasicParsing
        Write-Host "  ✓ Saved: $filePath" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ Error downloading $($img.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`nAll downloads completed!" -ForegroundColor Cyan
Write-Host "Images saved to: $basePath" -ForegroundColor Cyan
