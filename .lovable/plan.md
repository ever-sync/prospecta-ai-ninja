

## Plano: Gestão de Planos no Painel Admin

### Problema Atual
Os planos, limites e preços estão **hardcoded** em 3 lugares diferentes:
- `Settings.tsx` — nomes, preços e features exibidos
- `useSubscription.ts` — price_ids do Stripe
- `check-subscription/index.ts` — limites de uso (presentations, campaigns, emails)

Qualquer alteração exige mexer no código. O admin precisa gerenciar isso pela interface.

### Solução

#### 1. Criar tabela `plans` no banco de dados

```sql
CREATE TABLE public.plans (
  id text PRIMARY KEY,              -- 'free', 'pro', 'enterprise'
  name text NOT NULL,               -- 'Gratuito', 'Pro', 'Enterprise'
  price_cents integer NOT NULL DEFAULT 0,
  stripe_price_id text,             -- null para free
  stripe_product_id text,           -- null para free
  limit_presentations integer NOT NULL DEFAULT 50,  -- -1 = ilimitado
  limit_campaigns integer NOT NULL DEFAULT 2,
  limit_emails integer NOT NULL DEFAULT 50,
  features text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: leitura pública, escrita apenas admin
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

Dados iniciais com os valores atuais:

| id | name | price_cents | limit_presentations | limit_campaigns | limit_emails |
|---|---|---|---|---|---|
| free | Gratuito | 0 | 50 | 2 | 50 |
| pro | Pro | 9700 | 500 | -1 | 500 |
| enterprise | Enterprise | 29700 | -1 | -1 | -1 |

#### 2. UI de Gestão de Planos no Admin

Adicionar uma nova seção/tab no `/admin` com:
- Cards editáveis para cada plano (nome, preço, limites, features)
- Campos numéricos para limites (-1 = ilimitado, com toggle)
- Campo de preço em reais (convertido para centavos)
- Stripe Price ID e Product ID editáveis
- Botão salvar por plano
- Botão para criar novo plano

#### 3. Atualizar `check-subscription` (Edge Function)

Em vez de `PLAN_LIMITS` hardcoded, buscar da tabela `plans`:
```typescript
const { data: planData } = await supabaseClient
  .from('plans')
  .select('*')
  .eq('id', plan)
  .single();
```

#### 4. Atualizar `Settings.tsx`

Buscar planos da tabela `plans` em vez de constante hardcoded. Formatar preço a partir de `price_cents`.

#### 5. Atualizar `useSubscription.ts`

Buscar `stripe_price_id` da tabela `plans` em vez de `PLAN_TIERS` hardcoded.

### Arquivos Modificados
- **Novo**: Migração SQL para tabela `plans` + seed data
- **Novo**: `src/components/admin/PlanManager.tsx` — componente de gestão
- **Editado**: `src/pages/Admin.tsx` — adicionar seção de planos
- **Editado**: `src/pages/Settings.tsx` — ler planos do banco
- **Editado**: `src/hooks/useSubscription.ts` — ler price_ids do banco
- **Editado**: `supabase/functions/check-subscription/index.ts` — ler limites do banco

