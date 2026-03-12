

# Fase 2 -- Análise Profunda + Apresentações

## Pré-requisito: Conectar Firecrawl

Antes de implementar, precisamos conectar o Firecrawl para scraping real de sites. Vou usar o conector disponível.

## Banco de Dados -- 2 novas tabelas

**`presentations`** -- Uma por empresa analisada
- `id` uuid PK
- `user_id` uuid NOT NULL
- `public_id` uuid UNIQUE (link público)
- `business_name`, `business_address`, `business_phone`, `business_website`, `business_category` text
- `business_rating` numeric
- `analysis_data` jsonb (toda a análise: Google, site, concorrentes)
- `presentation_html` text (conteúdo gerado pela IA)
- `status` text DEFAULT 'pending' (pending, analyzing, ready, error)
- `created_at` timestamptz

RLS: SELECT/INSERT/UPDATE para `auth.uid() = user_id`. SELECT público via `public_id` (sem auth, para link compartilhável).

**`presentation_items`** -- Scores detalhados por apresentação
- Removido em favor de `analysis_data` jsonb na tabela `presentations` para simplificar.

## Edge Functions

### 1. `deep-analyze` -- Análise profunda de uma empresa
Recebe: `{ business, dna }` (dados da empresa + DNA do usuário)

Pipeline:
1. **Firecrawl scrape** do site (se existir): formatos `markdown`, `html`, pegar conteúdo real
2. **IA analisa o site** scraped: SEO (meta tags, headings, keywords), velocidade estimada, layout/UX, segurança (HTTPS, headers), acessibilidade
3. **IA analisa presença Google**: rating, reviews, posicionamento estimado, concorrentes à frente
4. **IA gera recomendações**: como o usuário (com base no DNA) pode ajudar essa empresa
5. Retorna JSON com todos os scores e análise

### 2. `generate-presentation` -- Gera HTML da apresentação
Recebe: `{ analysis, dna, profile }` (análise + DNA + logo/nome da empresa do usuário)

A IA gera uma apresentação HTML completa com:
- Logo e nome da empresa do usuário
- Análise completa da empresa-alvo
- Scores visuais (SEO, velocidade, layout, segurança)
- Concorrentes identificados
- Recomendações personalizadas baseadas no DNA
- Call-to-action

### 3. `firecrawl-scrape` -- Proxy para Firecrawl API
Edge function padrão para chamar Firecrawl scrape endpoint.

## Fluxo no Frontend

### Index.tsx -- Botão "Analisar Selecionadas"
1. Clicar no botão dispara análise em lote
2. Modal de progresso mostra status de cada empresa (pendente/analisando/concluído/erro)
3. Para cada empresa selecionada:
   - Busca DNA e profile do usuário
   - Chama `deep-analyze`
   - Chama `generate-presentation`
   - Salva na tabela `presentations`
4. Ao finalizar, redireciona para `/presentations`

### Presentations.tsx -- Lista completa
- Tabela com todas as apresentações: nome, endereço, telefone, site, segmento, status, data
- Botão "Ver" abre o link público
- Botão "Enviar Apresentação" abre dialog com 3 opções:
  - Email (placeholder para Resend -- fase futura)
  - WhatsApp (abre link `wa.me` com mensagem + link)
  - Webhook (POST para URL configurável)
- Botão "Excluir"

### `/presentation/:publicId` -- Página pública
- Rota pública (sem auth) que renderiza a apresentação HTML
- Acessível por qualquer pessoa com o link

## Componentes Novos

- `AnalysisProgressModal` -- Modal com progresso da análise em lote
- `SendPresentationDialog` -- Dialog com 3 opções de envio
- `PresentationView` -- Página pública da apresentação

## Arquivos a Criar/Editar

```text
-- Criar --
supabase/functions/deep-analyze/index.ts
supabase/functions/generate-presentation/index.ts
supabase/functions/firecrawl-scrape/index.ts
src/components/AnalysisProgressModal.tsx
src/components/SendPresentationDialog.tsx
src/pages/PresentationView.tsx
src/lib/api/firecrawl.ts

-- Editar --
src/pages/Index.tsx (lógica do botão "Analisar Selecionadas")
src/pages/Presentations.tsx (lista real com dados do banco)
src/App.tsx (rota pública /presentation/:publicId)
Migration SQL (tabela presentations + RLS)
```

## Ordem de Implementação

1. Conectar Firecrawl
2. Migration SQL (tabela presentations)
3. Edge function `firecrawl-scrape`
4. Edge function `deep-analyze`
5. Edge function `generate-presentation`
6. `AnalysisProgressModal` + lógica no Index.tsx
7. `Presentations.tsx` com lista real + `SendPresentationDialog`
8. Rota pública `PresentationView`

