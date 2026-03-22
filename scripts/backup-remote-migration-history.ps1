param(
  [string]$SupabaseBin = ".\supabase.exe",
  [string]$OutputDir = "backups/supabase"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SupabaseBin)) {
  throw "Supabase CLI nao encontrada em '$SupabaseBin'."
}

if (-not $env:SUPABASE_DB_PASSWORD) {
  throw "Defina SUPABASE_DB_PASSWORD antes de rodar este script."
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $OutputDir "schema_migrations_$timestamp.sql"

$resolvedSupabaseBin = (Resolve-Path $SupabaseBin).Path
$dumpOutput = & cmd.exe /c "`"$resolvedSupabaseBin`" db dump --schema supabase_migrations --file `"$outputFile`" 2>&1"
if ($LASTEXITCODE -ne 0) {
  $dumpText = ($dumpOutput | Out-String)
  if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
  }

  if ($dumpText -match "Docker") {
    $manualFile = Join-Path $OutputDir "schema_migrations_manual_backup_$timestamp.sql"
    @"
create table if not exists public.schema_migrations_backup_$timestamp as
select *
from supabase_migrations.schema_migrations;

select *
from supabase_migrations.schema_migrations
order by version;
"@ | Set-Content -Path $manualFile -Encoding utf8

    Write-Host "==> Docker indisponivel para db dump remoto."
    Write-Host "==> Arquivo SQL manual gerado em $manualFile"
    Write-Host "==> Execute esse SQL no editor do Supabase antes de rodar migration repair."
    exit 0
  }

  throw "Falha ao gerar o dump do schema supabase_migrations."
}

Write-Host "==> Backup salvo em $outputFile"
