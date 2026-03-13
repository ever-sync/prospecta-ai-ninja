

## Análise

O código atual em `search-businesses/index.ts` **já implementa** tudo que foi solicitado:

1. **Google Maps como fonte principal** (linha 108): `site:google.com/maps "${nicheLabel}" "${location}"`
2. **Fallback genérico** (linha 115): quando Google Maps retorna poucos resultados
3. **Extração de ratings, telefones e endereços** via prompt da IA (linhas 160-189)
4. **Extração de emails** via scrape de websites (linhas 257-274)
5. **Campo email** no tipo `Business` já existe

### O que pode ser melhorado

A query `site:google.com/maps` no Firecrawl Search nem sempre retorna resultados ricos do Google Maps (o Firecrawl faz busca web, não acessa a API do Google Maps diretamente). Para melhorar a qualidade:

#### 1. Melhorar as queries de busca

- Usar múltiplas estratégias de query em paralelo para maximizar resultados:
  - `"${nicheLabel}" "${location}" avaliações telefone` (busca geral com sinais de contato)
  - `"${nicheLabel}" perto de "${location}"` (busca local)
- Aumentar o conteúdo capturado do markdown (de 2000 para 3000 chars) para ter mais dados para a IA extrair

#### 2. Melhorar o prompt da IA

- Instruir a IA a priorizar dados do Google Maps quando disponíveis
- Adicionar regras para normalização de telefones brasileiros (DDD + número)
- Pedir que a IA extraia o máximo de informações de contato possível

#### 3. Scrape adicional para telefones

- Quando uma empresa tem website mas não tem telefone, fazer scrape do site para extrair telefone (mesma lógica dos emails)
- Extrair telefones com regex para formatos brasileiros: `(XX) XXXXX-XXXX`, `(XX) XXXX-XXXX`

### Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/search-businesses/index.ts` | Melhorar queries, aumentar contexto, adicionar extração de telefones via scrape, melhorar prompt |

### Detalhes técnicos

- Regex para telefones BR: `/\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/g`
- Scrape de telefones reutiliza a mesma função `firecrawlScrape` já existente
- Limite de scrapes mantido em 5 para controle de créditos (compartilhado entre email e telefone)

