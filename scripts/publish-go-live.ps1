param(
  [string]$SupabaseBin = ".\supabase.exe",
  [switch]$SkipMigrations
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SupabaseBin)) {
  throw "Supabase CLI nao encontrada em '$SupabaseBin'."
}

if (-not $env:SUPABASE_DB_PASSWORD) {
  throw "Defina SUPABASE_DB_PASSWORD antes de rodar este script."
}

$functions = @(
  "firecrawl-scrape",
  "deep-analyze",
  "generate-presentation",
  "analyze-business",
  "generate-approach",
  "generate-approach-shock",
  "search-businesses",
  "send-campaign-emails",
  "validate-campaign-email-sender",
  "send-campaign-webhooks",
  "elevenlabs-tts",
  "whatsapp-send-batch",
  "whatsapp-optimize-variants",
  "check-subscription",
  "customer-portal",
  "create-checkout",
  "admin-stats",
  "admin-api-usage",
  "validate-firecrawl-key",
  "validate-meta-whatsapp",
  "manage-meta-templates",
  "send-marketing-email",
  "stripe-webhook"
)

function Invoke-SupabaseCommand {
  param(
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  & $SupabaseBin @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}

if ($SkipMigrations) {
  Write-Host "==> Pulando migrations por solicitacao explicita"
} else {
  Write-Host "==> Aplicando migrations"
  Invoke-SupabaseCommand -Arguments @("db", "push") -FailureMessage "Falha ao aplicar migrations. Corrija o drift do schema ou rode o script com -SkipMigrations apenas se o banco remoto ja estiver compatível."
}

Write-Host "==> Publicando edge functions"
foreach ($fn in $functions) {
  Write-Host "-> Deploy $fn"
  Invoke-SupabaseCommand -Arguments @("functions", "deploy", $fn) -FailureMessage "Falha ao publicar a function '$fn'."
}

Write-Host "==> Publicacao concluida"
