

# Dashboard de Estatísticas

Adicionar uma nova aba "Dashboard" como página inicial do app, com cards de estatísticas e gráficos baseados nos dados da tabela `presentations`.

## O que será construído

1. **Nova página `src/pages/Dashboard.tsx`** com:
   - Card "Total de Apresentações" (count)
   - Card "Prontas" (status = ready)
   - Card "Score Médio" (média de `analysis_data.scores.overall`)
   - Card "Taxa de Abertura" (placeholder -- requer tracking de views, será implementado)
   - Gráfico de barras: scores médios por categoria (SEO, velocidade, layout, segurança)
   - Gráfico de linha: apresentações criadas por semana/mês

2. **Tabela `presentation_views`** para rastrear aberturas de links públicos:
   - `id` uuid PK
   - `presentation_id` uuid FK presentations
   - `viewed_at` timestamptz DEFAULT now()
   - `viewer_ip` text (opcional)
   - RLS: anon pode INSERT (registrar view), authenticated pode SELECT (ler own views via join)

3. **Registrar views** no `PresentationView.tsx`: ao carregar a apresentação pública, inserir um registro na tabela `presentation_views`

4. **Navegação**: Trocar a rota `/` de "Busca" para "Dashboard", mover busca para `/search`

## Mudanças por arquivo

| Arquivo | Ação |
|---|---|
| `src/pages/Dashboard.tsx` | Criar -- página com cards + gráficos usando recharts |
| `src/pages/PresentationView.tsx` | Editar -- registrar view na tabela |
| `src/components/AppLayout.tsx` | Editar -- adicionar aba Dashboard, ajustar rotas |
| `src/App.tsx` | Editar -- rota `/` = Dashboard, `/search` = Index |
| Migration SQL | Criar tabela `presentation_views` + RLS |

## Cálculos do Dashboard

- **Total**: `COUNT(*)` de presentations do user
- **Taxa de abertura**: `COUNT(DISTINCT presentation_id em presentation_views) / COUNT(*) presentations` x 100
- **Score médio**: média de `analysis_data->'scores'->'overall'` das presentations com status 'ready'
- **Scores por categoria**: médias de `seo`, `speed`, `layout`, `security` do `analysis_data.scores`

Todos os dados são calculados client-side a partir das queries existentes, sem necessidade de database functions.

