

## Problema Identificado

Dois problemas distintos:

1. **Emojis corrompidos na URL**: Os emojis (👋, ✅, 📊) estão sendo codificados como `%EF%BF%BD` (caractere de substituição Unicode) em vez do encoding correto. Isso acontece porque o `encodeURIComponent` está recebendo strings com emojis que não são processados corretamente em alguns ambientes.

2. **Link bloqueado**: O `wa.me` redireciona para `api.whatsapp.com/send/` que está sendo bloqueado pelo navegador (ERR_BLOCKED_BY_RESPONSE). A solução é usar `web.whatsapp.com/send` como destino direto (funciona no browser) e adicionar fallback de copiar.

## Solução

### 1. Corrigir encoding de emojis
Remover emojis problemáticos do texto da URL e usar apenas emojis simples que codificam bem, ou usar alternativas textuais para os que falham.

### 2. Mudar estratégia de abertura do WhatsApp
- Tentar abrir `https://web.whatsapp.com/send?phone=X&text=Y` (funciona no desktop)
- Simultaneamente copiar a mensagem para clipboard como fallback
- Mostrar toast informando que a mensagem foi copiada caso o link não funcione

### 3. Arquivos a alterar

| Arquivo | Mudança |
|---------|---------|
| `src/components/SendPresentationDialog.tsx` | Trocar `wa.me` por `web.whatsapp.com/send`, adicionar fallback de copiar mensagem, corrigir emojis |
| `src/pages/Campaigns.tsx` | Mesma correção de URL e emojis no envio de campanhas WhatsApp (linha 396) |
| `src/components/KanbanCard.tsx` | Corrigir link do WhatsApp no CRM (linha 129) |

### Detalhes técnicos

- URL nova: `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`
- Ao clicar "Enviar via WhatsApp": abre a URL + copia mensagem para clipboard + mostra toast "Mensagem copiada! Se o WhatsApp não abrir, cole manualmente."
- Emojis mantidos no texto mas testados para encoding correto com `encodeURIComponent`

