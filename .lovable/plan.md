

## Plan: Badge de Plano no Header + Bloqueio Real de Limites

### 1. Badge do plano no header

**Arquivo: `src/components/AppLayout.tsx`**
- Importar `useSubscription` e `Badge`
- Ao lado do logo "Prospecta IA", exibir um badge colorido com o plano atual:
  - **Gratuito**: badge cinza/outline
  - **Pro**: badge azul/primary
  - **Enterprise**: badge dourado/gradient
- O badge será clicavel e navega para `/settings` (aba faturamento)
- Mostrar skeleton enquanto `loading` for true

### 2. Bloqueio real nas ações

Adicionar verificações usando `canUse()` do hook `useSubscription` nos pontos críticos:

**`src/pages/Index.tsx` (Gerar apresentações)**
- Antes de iniciar `handleAnalyzeSelected`, verificar `canUse('presentations')`
- Se limite atingido, mostrar toast de erro com mensagem indicando upgrade
- Verificar se a quantidade selecionada + uso atual excede o limite

**`src/pages/Campaigns.tsx` (Criar campanhas)**
- Antes de criar campanha em `handleCreate`, verificar `canUse('campaigns')`
- Antes de enviar campanha (emails), verificar `canUse('emails')`
- Se limite atingido, mostrar toast e bloquear ação

**Componente de upgrade (opcional mas recomendado)**
- Nos toasts de bloqueio, incluir texto sugerindo upgrade e direcionando para `/settings`

### Resumo de arquivos alterados
- `src/components/AppLayout.tsx` — badge do plano
- `src/pages/Index.tsx` — bloqueio em análise/apresentações
- `src/pages/Campaigns.tsx` — bloqueio em criação de campanhas e envio de emails

