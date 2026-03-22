# envPRO

Plataforma de prospeccao comercial assistida com:
- scanner de mercado
- analise profunda com IA
- geracao de propostas
- campanhas por email, WhatsApp oficial e webhook
- CRM e acompanhamento operacional
- billing com Stripe

## Stack

- Frontend: React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- Backend: Supabase Postgres + Auth + Storage + Realtime + Edge Functions
- Integracoes: Stripe, Resend, Meta WhatsApp Cloud API, Firecrawl, n8n

## Setup local

1. Instale dependencias:
```bash
npm install
```

2. Crie seu arquivo local:
```bash
copy .env.example .env
```

3. Preencha no minimo:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

4. Rode o app:
```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm test
npm run lint
npm run deploy:go-live
npm run deploy:functions-only
npm run supabase:check-drift
npm run supabase:backup-history
npm run supabase:repair-history:plan
npm run supabase:repair-history
```

## Banco e functions

Aplicar migrations:
```powershell
.\supabase.exe db push
```

Publicar edge functions:
```powershell
.\supabase.exe functions deploy check-subscription
.\supabase.exe functions deploy stripe-webhook
.\supabase.exe functions deploy create-checkout
.\supabase.exe functions deploy customer-portal
```

Publicar o pacote critico de go-live de uma vez:
```powershell
$env:SUPABASE_DB_PASSWORD="sua_database_password"
npm run deploy:go-live
```

Publicar apenas edge functions quando o schema remoto ja estiver compatível e voce quiser evitar o `db push`:
```powershell
npm run deploy:functions-only
```

Pre-requisitos do script:
- `.\supabase.exe login` concluido no projeto correto
- `SUPABASE_DB_PASSWORD` definido no shell atual
- `supabase/config.toml` apontando para o projeto certo
- `deploy:go-live` agora falha imediatamente se `db push` ou algum `functions deploy` retornar erro
- `deploy:functions-only` e o caminho explicito para publicar so codigo quando existe drift conhecido na migration history

## Secrets de producao

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD`
- `PUBLIC_APP_URL`
- `APP_BASE_URL`
- `RESEND_API_KEY`
- `SYSTEM_EMAIL_FROM`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `META_WHATSAPP_VERIFY_TOKEN`
- `META_WHATSAPP_APP_SECRET`
- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `FIRECRAWL_API_KEY`
- `ELEVENLABS_API_KEY`
- `N8N_CAMPAIGN_WEBHOOK_URL`
- `N8N_CAMPAIGN_WEBHOOK_SECRET`

## Go-live

Antes de vender:
1. Validar billing e bloqueio de inadimplencia
2. Publicar todas as migrations recentes
3. Publicar as edge functions criticas
4. Confirmar secrets no Supabase e na Vercel
5. Testar scanner -> proposta -> campanha -> CRM
6. Testar checkout -> webhook Stripe -> bloqueio/liberacao
7. Testar email, WhatsApp oficial e webhook n8n

Checklist detalhado:
- [go-live-checklist.md](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/docs/architecture/go-live-checklist.md)
- [supabase-migration-history-repair-plan.md](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/docs/architecture/supabase-migration-history-repair-plan.md)
