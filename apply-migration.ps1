# Apply migration 0011 to Postgres и сразу показать состояние таблицы users.
# Запуск: .\apply-migration.ps1

Write-Host "→ Applying 0011_thankful_kree.sql ..." -ForegroundColor Cyan
Get-Content packages\db\drizzle\0011_thankful_kree.sql | docker exec -i escort-postgres psql -U postgres -d companion_db

Write-Host "`n→ Users table after migration:" -ForegroundColor Cyan
docker exec escort-postgres psql -U postgres -d companion_db -c "\d users"
