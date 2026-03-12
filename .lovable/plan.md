

## Modelo Customizado de Proposta

### O que muda

Adicionar um 5o modelo "Customizado" na lista de templates. Ao selecionar, expande um painel com 3 color pickers: cor dos textos, cor dos botões e cor de fundo da página. O preview do card mostra as cores escolhidas em tempo real.

### Database

Adicionar 3 colunas na tabela `company_dna`:
- `custom_text_color` (text, default `'#ffffff'`)
- `custom_button_color` (text, default `'#6366f1'`)
- `custom_bg_color` (text, default `'#0c0c1d'`)

### Frontend (`src/components/ProposalTemplateTab.tsx`)

1. Adicionar modelo `custom` ao array `PROPOSAL_MODELS` com label "Customizado" e descrição "Defina suas próprias cores"
2. Adicionar 3 estados: `customTextColor`, `customButtonColor`, `customBgColor`
3. No `ProposalPreview`, renderizar preview dinâmico usando as 3 cores custom
4. Quando `selectedTemplate === 'custom'`, exibir abaixo do grid de modelos um painel com 3 inputs `type="color"` lado a lado (Cor do Texto, Cor dos Botões, Cor de Fundo)
5. Carregar/salvar as 3 cores no `company_dna` junto com os outros campos

### Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Adicionar 3 colunas em `company_dna` |
| `src/components/ProposalTemplateTab.tsx` | Adicionar modelo custom + color pickers + preview dinâmico |

