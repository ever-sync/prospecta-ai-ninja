

## Kanban Board para o CRM

Transformar a visualização atual de tabela em um board Kanban com drag-and-drop, mantendo os stat cards e adicionando um toggle para alternar entre visão Kanban e Tabela.

### Abordagem

Usar a **HTML Drag and Drop API nativa** com React state management (sem biblioteca externa), combinada com `framer-motion` para animações suaves. Isso evita adicionar dependências extras.

### Estrutura

- **Toggle de visualização**: Botões "Kanban" e "Lista" no header do pipeline
- **Colunas do Kanban**: Uma coluna por status (Pendente, Analisando, Pronto, Enviado, Respondido, Perdido), cada uma com header colorido conforme `statusConfig`
- **Cards arrastáveis**: Cada lead vira um card compacto mostrando nome, categoria e telefone
- **Drop zones**: Ao soltar um card em outra coluna, atualiza o status no banco via `supabase.from('presentations').update({ status }).eq('id', leadId)` e atualiza o state local

### Mudanças

1. **`src/pages/CRM.tsx`** - Refatorar para incluir:
   - State `viewMode: 'kanban' | 'table'` com toggle buttons
   - Componente Kanban inline com colunas horizontais scrolláveis
   - Handlers `onDragStart`, `onDragOver`, `onDrop` para mover leads
   - Atualização otimista do state + persist no banco
   - Layout responsivo: scroll horizontal no mobile, colunas `min-w-[260px]`
   - Manter a tabela existente como visão alternativa

### Detalhes Técnicos

- Drag via `draggable` attribute + `dataTransfer.setData('leadId', id)`
- Visual feedback: coluna destaque com `border-primary` durante `onDragOver`
- Contagem de leads por coluna no header
- Busca funciona em ambas as visões
- `framer-motion` `layoutId` nos cards para animação suave ao trocar de coluna

