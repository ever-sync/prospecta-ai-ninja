

## Plano: Google Maps como fonte principal + campo de email

### Problema atual
A busca usa queries genéricas no Firecrawl que retornam resultados de diretórios e páginas aleatórias. Dados como telefone, rating e endereço são inconsistentes. Emails não são extraídos — o sistema inventa emails `contato@dominio` no envio de campanhas.

### Mudanças

#### 1. Edge Function `search-businesses/index.ts` — Busca via Google Maps

Alterar a query do Firecrawl Search para priorizar Google Maps:
- **Query principal**: `site:google.com/maps "${nicheLabel}" "${location}"` com `scrapeOptions: { formats: ["markdown"] }`
- **Fallback**: query genérica `"${nicheLabel} em ${location}"` se Google Maps retornar poucos resultados
- Google Maps contém ratings, telefones, endereços e websites reais das empresas

#### 2. Edge Function — Etapa de extração de emails

Após a IA estruturar os resultados, para empresas que têm website:
- Fazer scrape do site via Firecrawl (`/v1/scrape` com `formats: ["markdown"]`, `onlyMainContent: false`) para capturar páginas de contato
- Extrair emails com regex do markdown retornado: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`
- Limitar a 5 scrapes paralelos para não exceder créditos
- Se não encontrar email no site, deixar vazio

#### 3. Prompt da IA — Incluir email no schema

Atualizar o prompt de extração para incluir `"email"` no JSON de saída. A IA também pode encontrar emails nos resultados do Google Maps/Firecrawl.

#### 4. Tipo `Business` — Adicionar campo `email`

```typescript
export interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;      // novo
  website: string;
  category: string;
  distance: number;
  rating?: number;
}
```

#### 5. `ResultsTable.tsx` — Exibir email

Adicionar exibição do email na coluna de Contato, com ícone `Mail` e fallback "Sem email".

#### 6. `send-campaign-emails/index.ts` — Usar email real

Substituir a lógica que inventa `contato@dominio` pelo email real da tabela `presentations`. Requer adicionar coluna `business_email` na tabela `presentations`.

### Detalhes técnicos

- Coluna nova: `ALTER TABLE presentations ADD COLUMN business_email text;`
- O scrape de emails consome créditos Firecrawl — será limitado a empresas com website válido
- Regex de email filtra endereços genéricos de plataformas (gmail, hotmail, etc. são aceitos como contato)

