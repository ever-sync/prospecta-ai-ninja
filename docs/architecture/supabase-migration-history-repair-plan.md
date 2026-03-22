# Supabase Migration History Repair Plan

## Estado atual

Em `2026-03-21`, o projeto remoto `cccakxnoptrtdzdlwyju` esta neste estado:

- Historico remoto registrado: `001` ate `030`
- Historico local do repositorio: migrations timestamp `202603...`
- Resultado pratico: `supabase db push` falha por drift de migration history
- Resultado operacional: edge functions novas ja podem ser publicadas com `npm run deploy:functions-only`

O drift atual pode ser conferido com:

```powershell
$env:SUPABASE_DB_PASSWORD="sua_database_password"
npm run supabase:check-drift
```

## O que NAO fazer

- Nao rodar `migration repair` no impulso
- Nao marcar o remoto como alinhado sem antes validar que o schema real ja contem os objetos das migrations locais
- Nao usar `db push` como se o problema fosse apenas de autenticacao

`migration repair` altera apenas a tabela de historico. Ele nao executa SQL de schema. Se o historico for “consertado” sobre um schema divergente, o proximo `db push` pode reexecutar SQL errado ou deixar drift silencioso.

## Politica operacional ate o reparo

Enquanto o historico nao for corrigido:

1. publicar apenas edge functions com:

```powershell
npm run deploy:functions-only
```

2. usar `npm run supabase:check-drift` antes de qualquer tentativa de `db push`
3. tratar qualquer mudanca de schema como frente separada

## Comandos do repositorio

Planejar o repair sem aplicar:

```powershell
$env:SUPABASE_DB_PASSWORD="sua_database_password"
npm run supabase:repair-history:plan
```

Executar o repair e validar com `db push`:

```powershell
$env:SUPABASE_DB_PASSWORD="sua_database_password"
npm run supabase:repair-history
```

## Caminho recomendado

### Fase 1 - Congelar mudancas de schema

- Nao criar novas migrations ate o reparo ser concluido
- Permitir apenas mudancas de frontend ou edge functions sem alteracao estrutural

### Fase 2 - Tirar snapshot do historico remoto

Forma recomendada no repositorio:

```powershell
$env:SUPABASE_DB_PASSWORD="sua_database_password"
npm run supabase:backup-history
```

Se Docker estiver disponivel, o dump fica em `backups/supabase/` e esta ignorado pelo git.
Se Docker nao estiver disponivel, o script gera automaticamente um arquivo `.sql` com o backup manual para rodar no SQL Editor do Supabase.

Alternativa manual no SQL Editor do Supabase remoto:

```sql
create table if not exists public.schema_migrations_backup_20260321 as
select *
from supabase_migrations.schema_migrations;
```

E conferir:

```sql
select *
from supabase_migrations.schema_migrations
order by version;
```

### Fase 3 - Verificar se o schema remoto ja contem os marcos locais

Validar no minimo:

- `public.feedbacks`
- `public.profiles.billing_access_status`
- `public.profiles.billing_block_reason`
- `public.profiles.billing_grace_until`
- `public.profiles.billing_last_event_type`
- `public.campaign_operation_events`
- `public.campaigns.blocking_reason`
- `public.campaigns.last_blocked_at`

Se qualquer um desses objetos faltar, o caminho nao e `migration repair`; primeiro precisa alinhar schema.

### Fase 4 - Reparar o historico somente se o schema estiver compativel

Se a verificacao acima estiver verde, o reparo mais direto para este repositorio e:

1. remover do historico remoto as versions legadas `001..030`
2. marcar como aplicadas as migrations timestamp atuais

Comandos exatos para este repo:

```powershell
.\supabase.exe migration repair --status reverted 001 002 003 004 005 006 007 008 009 010 011 012 013 014 015 016 017 018 019 020 021 022 023 024 025 026 027 028 029 030
```

```powershell
.\supabase.exe migration repair --status applied 20260312004044 20260312005345 20260312014853 20260312022705 20260312023145 20260312023309 20260312023510 20260312023848 20260312025943 20260312030913 20260312031225 20260312034151 20260312120928 20260312123948 20260312161736 20260312162656 20260312162711 20260312210158 20260312210532 20260312211510 20260312215206 20260313141846 20260313195000 20260313222000 20260313234500 20260314003000 20260314013000 20260314021000 20260314090000 20260314100000 20260314110000 20260314113000 20260314113100 20260314123000 20260314170000 20260314173000 20260314180000 20260314190000 20260314201500 20260314212000 20260314213500 20260315100000 20260316185713 20260316200000 20260320000000 20260320000001 20260320000002 20260320000003 20260321000001 20260321000002 20260321000003 20260321000004 20260321180000 20260321183000 20260321190000
```

### Fase 5 - Verificar o reparo

Rodar:

```powershell
$env:SUPABASE_DB_PASSWORD="sua_database_password"
npm run supabase:check-drift
```

O esperado e:

- `Local only:` vazio
- `Remote only:` vazio
- mensagem `Migration history alinhada`

Depois:

```powershell
.\supabase.exe db push
```

O esperado aqui e:

- ou nao haver nenhuma migration pendente
- ou aplicar apenas migrations realmente novas, criadas apos o reparo

## Plano de rollback

Se o reparo de historico ficar inconsistente:

1. restaurar a tabela `supabase_migrations.schema_migrations` a partir do backup salvo em `public.schema_migrations_backup_20260321`
2. voltar a operar com `npm run deploy:functions-only`
3. reavaliar se o caminho correto e um baseline novo em vez de `repair`

## Critério de encerramento

Essa frente so termina quando:

1. `npm run supabase:check-drift` passa
2. `.\supabase.exe db push` deixa de falhar por historico
3. novas migrations conseguem ser publicadas normalmente

## Status atualizado

Em `2026-03-21`, o repair foi executado com sucesso neste repositorio:

- `migration repair --status reverted` aplicado para `001..030`
- `migration repair --status applied` aplicado para as migrations locais `202603...`
- `db push` voltou a responder `Remote database is up to date`

O plano acima permanece como referencia para repeticao ou auditoria do processo.
