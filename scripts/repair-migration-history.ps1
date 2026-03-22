param(
  [string]$SupabaseBin = ".\supabase.exe",
  [switch]$RunDbPush
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SupabaseBin)) {
  throw "Supabase CLI nao encontrada em '$SupabaseBin'."
}

if (-not $env:SUPABASE_DB_PASSWORD) {
  throw "Defina SUPABASE_DB_PASSWORD antes de rodar este script."
}

function Invoke-SupabaseCommand {
  param(
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  & $SupabaseBin @Arguments "-p" $env:SUPABASE_DB_PASSWORD
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}

function Get-MigrationHistorySets {
  $resolvedSupabaseBin = (Resolve-Path $SupabaseBin).Path
  $rawOutput = & cmd.exe /c "`"$resolvedSupabaseBin`" migration list -p $env:SUPABASE_DB_PASSWORD 2>&1"
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

  return @{
    LocalOnly = $localOnly
    RemoteOnly = $remoteOnly
  }
}

$history = Get-MigrationHistorySets
$localOnly = $history.LocalOnly
$remoteOnly = $history.RemoteOnly

Write-Host "==> Local only:" ($localOnly -join " ")
Write-Host "==> Remote only:" ($remoteOnly -join " ")

if ($localOnly.Count -eq 0 -and $remoteOnly.Count -eq 0) {
  Write-Host "==> Migration history ja esta alinhada"
  if ($RunDbPush) {
    Write-Host "==> Testando db push"
    Invoke-SupabaseCommand -Arguments @("db", "push") -FailureMessage "Falha no db push apos verificar historico alinhado."
  }
  exit 0
}

$unexpectedRemote = @($remoteOnly | Where-Object { $_ -notmatch '^\d{3}$' })
if ($unexpectedRemote.Count -gt 0) {
  throw "Foram encontrados versions remotos fora do padrao legado 001..030: $($unexpectedRemote -join ' ')"
}

$unexpectedLocal = @($localOnly | Where-Object { $_ -notmatch '^\d{14}$' })
if ($unexpectedLocal.Count -gt 0) {
  throw "Foram encontrados versions locais fora do padrao timestamp esperado: $($unexpectedLocal -join ' ')"
}

if ($remoteOnly.Count -gt 0) {
  Write-Host "==> Marcando versions remotos legados como reverted"
  Invoke-SupabaseCommand -Arguments @("migration", "repair", "--status", "reverted", "--yes") + $remoteOnly -FailureMessage "Falha ao reverter o historico legado remoto."
}

if ($localOnly.Count -gt 0) {
  Write-Host "==> Marcando migrations locais como applied"
  Invoke-SupabaseCommand -Arguments @("migration", "repair", "--status", "applied", "--yes") + $localOnly -FailureMessage "Falha ao marcar migrations locais como applied."
}

$recheckedHistory = Get-MigrationHistorySets
$recheckedLocalOnly = $recheckedHistory.LocalOnly
$recheckedRemoteOnly = $recheckedHistory.RemoteOnly

Write-Host "==> Recheck local only:" ($recheckedLocalOnly -join " ")
Write-Host "==> Recheck remote only:" ($recheckedRemoteOnly -join " ")

if ($recheckedLocalOnly.Count -gt 0 -or $recheckedRemoteOnly.Count -gt 0) {
  throw "O historico continuou em drift apos o repair."
}

if ($RunDbPush) {
  Write-Host "==> Rodando db push apos repair"
  Invoke-SupabaseCommand -Arguments @("db", "push") -FailureMessage "Falha no db push apos repair do historico."
}

Write-Host "==> Repair concluido com historico alinhado"
