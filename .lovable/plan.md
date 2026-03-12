

# Fase 1 -- Estrutura Base do Prospecta IA

Implementar autenticação, navegação entre abas, configurações da empresa e DNA. Isso cria a fundação para as fases seguintes (análise profunda + apresentações).

## 1. Autenticação (Email + Senha)

- Criar página `/auth` com formulários de login e cadastro
- Verificação de email habilitada (padrão)
- Tabela `profiles` com: id, user_id, company_name, company_logo_url, email, phone, created_at
- Trigger para auto-criar perfil no signup
- Rota protegida: redirecionar para `/auth` se não logado

## 2. Banco de Dados

**Tabela `profiles`:**
- `id` uuid PK
- `user_id` uuid FK auth.users NOT NULL UNIQUE
- `company_name` text
- `company_logo_url` text
- `email` text
- `phone` text
- `created_at` timestamptz

**Tabela `company_dna`:**
- `id` uuid PK
- `user_id` uuid FK auth.users NOT NULL UNIQUE
- `services` text[] (serviços oferecidos)
- `differentials` text[] (diferenciais)
- `target_audience` text
- `value_proposition` text
- `tone` text (tom de comunicação)
- `additional_info` text
- `created_at` / `updated_at` timestamptz

**Storage bucket** `company-logos` para upload de logos.

RLS: todas as tabelas restringidas ao próprio user_id.

## 3. Navegação / Layout

- `AppLayout` com header e navegação horizontal por abas: **Busca**, **DNA**, **Apresentações**, **Configurações**
- Rotas: `/` (busca), `/dna`, `/presentations`, `/settings`
- Manter o visual dark atual

## 4. Página de Configurações (`/settings`)

- Upload de logo (para storage bucket)
- Nome da empresa, email, telefone
- Salvar no `profiles`

## 5. Página DNA (`/dna`)

- Formulário para preencher: serviços, diferenciais, público-alvo, proposta de valor, tom de comunicação, informações adicionais
- Tags input para serviços e diferenciais (adicionar/remover)
- Salvar/atualizar na tabela `company_dna`
- Indicador visual de "DNA completo" vs "incompleto"

## 6. Ajuste na Busca

- Adicionar checkboxes na `ResultsTable` para multi-select
- Botão "Analisar Selecionadas" (desabilitado, placeholder para fase 2)
- Manter funcionalidade atual de análise individual

## Arquivos Novos

```text
src/pages/Auth.tsx
src/pages/DNA.tsx
src/pages/Settings.tsx
src/pages/Presentations.tsx (placeholder)
src/components/AppLayout.tsx
src/components/DNAForm.tsx
src/components/SettingsForm.tsx
src/components/ProtectedRoute.tsx
src/hooks/useAuth.ts
```

## Detalhes Técnicos

- Auth state via `onAuthStateChange` + `getSession`
- Firecrawl será conectado na fase 2 para análise de sites
- 4 migrações SQL: profiles + trigger, company_dna, storage bucket, RLS policies
- Config.toml sem mudanças (edge functions existentes já funcionam sem JWT)

