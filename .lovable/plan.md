

## Plano: Redesign Visual — Estilo "Donezo"

### Análise da Imagem de Referência

A imagem apresenta um design com estas características visuais:
- **Tema claro** com fundo cinza-claro (#F5F5F0) e cards brancos
- **Paleta verde escuro** como cor primária (tons de #1B5E20 a #4CAF50)
- **Sidebar lateral fixa** à esquerda com navegação vertical, logo no topo, seções "MENU" e "GENERAL"
- **Header superior** com barra de busca centralizada, ícones de notificação/email, avatar + nome do usuário
- **Cards com bordas arredondadas (16px)**, sombra suave, sem bordas visíveis
- **Tipografia limpa** com hierarquia clara (títulos bold, subtítulos em cinza)
- **Ícones arredondados** em containers coloridos

### O que muda

```text
┌──────────────────────────────────────────────┐
│  ANTES (atual)                               │
│  ┌──────────────────────────────────────────┐ │
│  │ HEADER com nav horizontal               │ │
│  ├──────────────────────────────────────────┤ │
│  │                                          │ │
│  │          CONTEÚDO CENTRALIZADO           │ │
│  │          (tema escuro/azul)              │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  DEPOIS (novo)                               │
│  ┌────────┬─────────────────────────────────┐ │
│  │SIDEBAR │  HEADER (busca + perfil)        │ │
│  │        ├─────────────────────────────────┤ │
│  │ Logo   │                                 │ │
│  │ Menu   │    CONTEÚDO (fundo cinza)       │ │
│  │ Items  │    Cards brancos arredondados   │ │
│  │        │    (tema claro/verde)           │ │
│  │General │                                 │ │
│  │Settings│                                 │ │
│  │Logout  │                                 │ │
│  └────────┴─────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Arquivos Modificados

#### 1. `src/index.css` — Nova paleta de cores
- Substituir tema escuro/azul por tema claro/verde
- Background geral: cinza claro (#F5F5F0)
- Cards: branco puro
- Primary: verde escuro (#2E7D32)
- Bordas sutis, sombras suaves
- Manter variáveis CSS existentes, só trocar valores

#### 2. `src/components/AppLayout.tsx` — Sidebar + Header
- Trocar nav horizontal por **sidebar lateral fixa** (~250px)
- Sidebar: fundo branco, logo + nome no topo, seção MENU com itens de nav, seção GERAL com Settings/Admin/Logout
- Item ativo: fundo verde claro + texto verde escuro
- Header superior: barra de busca (decorativa), badge do plano, avatar com email do usuário
- Layout flex com sidebar fixa e content area scrollável
- Sidebar colapsável em mobile (hamburger menu)

#### 3. `src/pages/Dashboard.tsx` — Ajuste visual dos cards
- Stat cards: bordas arredondadas maiores, sem borda visível, sombra suave
- Primeiro card (destaque): fundo verde com texto branco
- Ícones dentro de containers arredondados coloridos
- Subtexto "Increased from last month" estilo da referência

#### 4. `tailwind.config.ts` — Border radius maior
- Aumentar `--radius` para 0.75rem
- Adicionar variantes de sombra suave

#### 5. Componentes UI menores
- `Card`: shadow mais suave, sem border visível no tema claro
- `Button` primary: verde escuro, hover verde mais escuro
- `Badge`: estilo arredondado com cores verdes

### O que NÃO muda
- Rotas e páginas existentes
- Lógica de negócio (hooks, API calls, edge functions)
- Estrutura de dados e banco de dados
- Funcionalidades de cada página
- Sistema de autenticação e roles

### Estimativa
- 5 arquivos editados
- Mudança puramente visual/layout

