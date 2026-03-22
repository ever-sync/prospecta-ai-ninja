# Checklist de Go-Live

## 1. Billing

- Confirmar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`
- Publicar `create-checkout`, `customer-portal`, `check-subscription`, `stripe-webhook`
- Definir `SUPABASE_DB_PASSWORD` e rodar `npm run deploy:go-live`
- Se existir drift conhecido na migration history, nao insistir no script estrito; publicar apenas code changes com `npm run deploy:functions-only`
- Testar:
  - checkout concluido
  - `customer.subscription.updated`
  - `invoice.payment_failed`
  - bloqueio por inadimplencia
  - reativacao apos pagamento

## 2. Auth e seguranca

- Publicar `supabase/config.toml` endurecido
- Validar JWT nas funcoes:
  - `search-businesses`
  - `deep-analyze`
  - `generate-presentation`
  - `send-campaign-emails`
  - `send-campaign-webhooks`
  - `whatsapp-send-batch`
  - `check-subscription`
  - `create-checkout`
  - `customer-portal`
  - `admin-stats`
  - `admin-api-usage`
- Manter publicas apenas as callbacks realmente publicas:
  - `stripe-webhook`
  - `whatsapp-status-webhook`
  - `respond-presentation`
  - `send-system-email` quando usado em fluxos publicos

## 3. Canais

- Email:
  - `RESEND_API_KEY`
  - dominio validado
  - remetente `ready`
- WhatsApp oficial:
  - token valido
  - phone number id valido
  - webhook validado
  - app secret configurado
- Webhook n8n:
  - URL salva em configuracoes
  - segredo opcional testado

## 4. Frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- Build verde com `npm run build`
- Preview local verde com `npm run preview`
- Hard refresh apos deploy para evitar cache velho
- Conferir drift com `npm run supabase:check-drift` antes de qualquer `db push`

## Comando unico de publicacao

```powershell
.\supabase.exe login
$env:SUPABASE_DB_PASSWORD="sua_database_password"
npm run deploy:go-live
```

Quando o banco remoto ja estiver compatível e o objetivo for publicar somente edge functions:

```powershell
npm run deploy:functions-only
```

Plano de reparo do historico de migrations:
- [supabase-migration-history-repair-plan.md](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/docs/architecture/supabase-migration-history-repair-plan.md)

## 5. Onboarding

- Usuario consegue:
  - preencher DNA
  - configurar Firecrawl
  - configurar IA
  - ativar um canal
  - gerar primeira proposta
  - criar primeira campanha
  - enxergar primeira resposta no CRM

## 6. Monitoração minima

- Admin mostra:
  - alertas operacionais
  - contas em grace
  - contas bloqueadas
  - feedbacks dos usuarios
- Usuario ve:
  - aviso de pagamento pendente
  - bloqueio claro em caso de inadimplencia

## 7. Teste ponta a ponta

- Scanner -> proposta -> campanha -> CRM
- Proposta publica -> abertura -> resposta
- Stripe -> status -> bloqueio/liberacao
- n8n -> recebimento do payload da campanha
