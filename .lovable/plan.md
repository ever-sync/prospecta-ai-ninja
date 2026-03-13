

## Problema

A busca de empresas usa IA para **inventar** empresas fictícias. Os telefones, sites e endereços não existem de verdade (como mostra o screenshot do site `livrariadoleitorsjc.com.br` que não existe).

## Solução

Substituir a geração fictícia por busca real usando **Firecrawl Search** (já configurado no projeto) para encontrar empresas reais na web, e depois usar IA apenas para estruturar/enriquecer os resultados.

## Mudanças

### 1. Edge Function `search-businesses/index.ts` — Reescrever

Novo fluxo:
1. Para cada nicho selecionado, fazer uma chamada `Firecrawl Search` com query tipo `"restaurantes em São José dos Campos"` com `scrapeOptions` para obter dados das páginas
2. Usar IA (Gemini Flash) para extrair e estruturar os dados dos resultados do Firecrawl (nome, telefone, endereço, site, categoria) em formato JSON
3. Se Firecrawl não encontrar resultados suficientes, complementar com busca Google Maps via Firecrawl (`site:google.com/maps "restaurante" "São José dos Campos"`)
4. Retornar empresas reais com dados reais

### 2. ResultsTable — Ajuste no link do website

- Quando `business.website` estiver vazio ou for inválido, não exibir o link
- Adicionar indicador visual "Sem site" para empresas sem website

### 3. Prompt da IA estruturadora

A IA receberá os resultados crus do Firecrawl e extrairá:
- Nome da empresa
- Endereço
- Telefone (formato brasileiro)
- Website (se encontrado)
- Categoria
- Rating (se disponível)

Empresas sem site serão aceitas normalmente (conforme sua preferência).

## Detalhes Técnicos

- Firecrawl Search endpoint: `POST https://api.firecrawl.dev/v1/search`
- Parâmetros: `query`, `limit` (max 10 por nicho), `lang: "pt-BR"`, `country: "BR"`, `scrapeOptions: { formats: ["markdown"] }`
- A IA recebe o markdown dos resultados e extrai dados estruturados
- Fallback: se Firecrawl falhar, manter geração por IA com aviso ao usuário

