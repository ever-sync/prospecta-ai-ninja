param(
  [string]$SupabaseBin = ".\supabase.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SupabaseBin)) {
  throw "Supabase CLI nao encontrada em '$SupabaseBin'."
}

if (-not $env:SUPABASE_DB_PASSWORD) {
  throw "Defina SUPABASE_DB_PASSWORD antes de rodar este script."
}

$resolvedSupabaseBin = (Resolve-Path $SupabaseBin).Path
$rawOutput = & cmd.exe /c "`"$resolvedSupabaseBin`" migration list 2>&1"
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao consultar o historico de migrations remoto."
}

$localVersions = New-Object System.Collections.Generic.HashSet[string]
$remoteVersions = New-Object System.Collections.Generic.HashSet[string]

foreach ($line in $rawOutput) {
  $text = [string]$line
  if ($text -match '^\s*([0-9]{3}|[0-9]{14})?\s*\|\s*([0-9]{3}|[0-9]{14})?\s*\|') {
    $local = $matches[1]
    $remote = $matches[2]

    if ($local) {
      [void]$localVersions.Add($local.Trim())
    }

    if ($remote) {
      [void]$remoteVersions.Add($remote.Trim())
    }
  }
}

$localOnly = @($localVersions.Where({ -not $remoteVersions.Contains($_) }) | Sort-Object)
$remoteOnly = @($remoteVersions.Where({ -not $localVersions.Contains($_) }) | Sort-Object)

Write-Host "==> Local only:" ($localOnly -join " ")
Write-Host "==> Remote only:" ($remoteOnly -join " ")

if ($localOnly.Count -gt 0 -or $remoteOnly.Count -gt 0) {
  Write-Error "Drift detectado entre migration history local e remota."
  exit 1
}

Write-Host "==> Migration history alinhada"
