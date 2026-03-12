

## Pipeline Customizável + Seleção ao Gerar Apresentações

### Resumo

1. Criar tabela `pipeline_stages` para armazenar etapas customizáveis por usuário
2. Adicionar coluna `pipeline_stage_id` na tabela `presentations`
3. Ao gerar apresentações (página Index), exibir dialog perguntando se quer anexar a uma pipeline e qual etapa
4. Refatorar CRM para usar stages dinâmicas com 4 padrão + botão adicionar + edição de cores

### Database (2 migrações)

**Migração 1 - Criar `pipeline_stages`:**
```sql
CREATE TABLE pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#22c55e',
  position integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
-- RLS: CRUD own stages
```

**Migração 2 - Adicionar coluna em `presentations`:**
```sql
ALTER TABLE presentations ADD COLUMN pipeline_stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL;
```

### Frontend

**1. `src/pages/Index.tsx`** - Antes de iniciar a análise em `handleAnalyzeSelected`:
- Abrir um dialog perguntando "Deseja anexar a uma etapa do pipeline?" com opções Sim/Não
- Se Sim, carregar as `pipeline_stages` do usuário e exibir um Select para escolher a etapa
- A etapa selecionada será salva no `pipeline_stage_id` ao inserir cada presentation

**2. Novo componente `src/components/PipelineSelectDialog.tsx`:**
- Dialog com switch Sim/Não + Select de etapas
- Retorna `{ attach: boolean, stageId?: string }`

**3. `src/pages/CRM.tsx`** - Refatoração completa:
- Carregar `pipeline_stages` do banco; se vazio, criar 4 padrão (Propostas Criadas, Enviadas, Pendente, Aceitas) mapeando para status `ready`, `sent`, `pending`, `responded`
- Botão "Adicionar Etapa" abre dialog com input nome + paleta de ~12 cores
- Click no indicador de cor no header da coluna abre popover para trocar cor
- Botão X em etapas não-default para remover (move leads para Pendente)
- Colunas renderizadas por `position`, usando `color` dinâmica
- Drag-and-drop atualiza `pipeline_stage_id` para etapas custom ou `status` para as 4 padrão

### Fluxo do Usuário

```text
Busca → Seleciona empresas → Clica "Analisar"
  → Dialog: "Anexar ao pipeline?" [Sim] [Não]
  → Se Sim: Select com etapas disponíveis
  → Gera apresentações com stage_id preenchido
  → Leads aparecem na coluna correta do CRM
```

### Arquivos Alterados

| Arquivo | Ação |
|---------|------|
| Migration SQL x2 | Criar tabela + adicionar coluna |
| `src/components/PipelineSelectDialog.tsx` | Novo - dialog de seleção de pipeline |
| `src/pages/Index.tsx` | Adicionar dialog antes de gerar |
| `src/pages/CRM.tsx` | Refatorar para stages dinâmicas com CRUD |

