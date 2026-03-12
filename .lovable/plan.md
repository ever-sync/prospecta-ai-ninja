

## Áudio com voz clonada via ElevenLabs nos templates WhatsApp

### Visão geral

Adicionar opção nos templates de WhatsApp para gerar áudio com a voz clonada do usuário usando ElevenLabs TTS. O texto do template (com variáveis substituídas) é convertido em áudio, salvo no Storage, e o link é enviado junto com a mensagem no WhatsApp.

### Pré-requisitos

1. **Conectar ElevenLabs** ao projeto (connector disponível)
2. O usuário precisa clonar a voz dele no painel do ElevenLabs e fornecer o Voice ID

### Database

- Adicionar coluna `elevenlabs_voice_id` (text, nullable) na tabela `profiles` para armazenar o Voice ID do usuário
- Adicionar coluna `send_as_audio` (boolean, default false) na tabela `message_templates`
- Criar bucket `audio-messages` (público) no Storage

### Edge Function `elevenlabs-tts`

- Recebe: `text` (string), `voice_id` (string)
- Usa ElevenLabs TTS API com modelo `eleven_multilingual_v2` para gerar o áudio
- Retorna o áudio MP3 em base64
- O caller salva no bucket `audio-messages`

### Frontend

**Settings (src/pages/Settings.tsx)**
- Adicionar campo "Voice ID do ElevenLabs" na seção de perfil para o usuário colar o ID da voz clonada

**TemplatesManager (src/components/TemplatesManager.tsx)**
- Adicionar toggle "Enviar como Áudio" no editor de templates WhatsApp
- Quando ativado, mostrar badge "Áudio" no card do template
- Salvar campo `send_as_audio` no banco

**Campanhas (send-campaign ou fluxo de envio WhatsApp)**
- Quando o template tem `send_as_audio = true`:
  1. Substituir variáveis no texto
  2. Chamar edge function `elevenlabs-tts` com o texto personalizado e voice_id do perfil
  3. Salvar áudio no bucket `audio-messages`
  4. Incluir link do áudio na mensagem do WhatsApp

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar `elevenlabs_voice_id` em profiles, `send_as_audio` em message_templates, criar bucket |
| `supabase/functions/elevenlabs-tts/index.ts` | Nova edge function TTS |
| `src/components/TemplatesManager.tsx` | Toggle "Enviar como Áudio" |
| `src/pages/Settings.tsx` | Campo Voice ID |

