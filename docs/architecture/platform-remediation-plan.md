# Plano de Execucao: Ajuste End-to-End da Plataforma

**Data:** 2026-03-21  
**Base:** [project-end-to-end-analysis.md](./project-end-to-end-analysis.md)  
**Objetivo:** corrigir os pontos estruturais levantados na analise de ponta a ponta sem interromper a operacao do produto.

## Meta

Levar o projeto de um estado "funcional, mas dependente de cuidado manual" para um estado "seguro, modular, auditavel e pronto para evolucao continua".

## Resultado Esperado

Ao final deste plano, a plataforma deve estar com:

- fronteira de autenticacao mais segura nas edge functions
- modulos criticos quebrados em partes menores e testaveis
- baseline de lint, tipagem e testes confiavel
- analytics e CRM menos dependentes de agregacao pesada no browser
- onboarding tecnico, deploy e segredos documentados

## Ordem de Execucao

1. Estabilizar o baseline tecnico
2. Fechar a fronteira de seguranca
3. Modularizar os dominios mais arriscados
4. Fortalecer testes e tipagem
5. Otimizar analytics, queries e bundle
6. Fechar documentacao operacional e CI

Essa ordem evita um erro comum: refatorar muito codigo sem antes limpar qualidade minima, seguranca e visibilidade.

## Fase 0: Baseline Tecnico

**Objetivo:** parar de operar "no escuro".

**Escopo**

- corrigir o escopo do lint para nao analisar `_bmad`, templates internos e artefatos que nao fazem parte da aplicacao
- capturar baseline atual de `lint`, `test`, `build` e tamanho do bundle
- criar um README real do produto
- adicionar `.env.example` com todas as variaveis necessarias

**Arquivos alvo**

- `eslint.config.js`
- `README.md`
- `.env.example`
- `package.json`

**Entregaveis**

- `npm run lint` executando apenas no codigo do produto
- README descrevendo stack, setup local, deploy e secrets
- `.env.example` cobrindo Supabase, Firecrawl, LLMs, Resend, Meta, Stripe e n8n

**Criterio de aceite**

- o lint deixa de falhar por arquivos fora do produto
- qualquer dev consegue subir o projeto apenas com README + `.env.example`

**Estimativa:** 0.5 a 1 dia

## Fase 1: Hardening de Seguranca

**Objetivo:** reduzir risco de autenticacao inconsistente nas edge functions.

**Escopo**

- classificar todas as edge functions em 3 grupos:
  - publicas
  - autenticadas por usuario
  - internas/service-role
- ativar `verify_jwt = true` para tudo que nao precisa ser publico
- manter publicos apenas:
  - `stripe-webhook`
  - `whatsapp-status-webhook`
  - callbacks publicos estritamente necessarios
- revisar chamadas do frontend para garantir headers e tokens corretos
- padronizar uso de `getAuthenticatedUserContext`

**Funcoes alvo prioritarias**

- `search-businesses`
- `deep-analyze`
- `generate-presentation`
- `send-campaign-emails`
- `send-campaign-webhooks`
- `whatsapp-send-batch`
- `check-subscription`
- `create-checkout`
- `customer-portal`

**Entregaveis**

- matriz de exposicao das funcoes
- `supabase/config.toml` endurecido
- smoke tests por funcao critica

**Criterio de aceite**

- nenhuma funcao de usuario sensivel fica publica sem justificativa
- chamadas do app autenticado continuam funcionando apos o endurecimento
- webhooks externos continuam operacionais

**Estimativa:** 1 a 2 dias

## Fase 2: Refactor dos Dominios Criticos

**Objetivo:** desmontar os maiores pontos de acoplamento.

**Prioridade**

1. `src/pages/Campaigns.tsx`
2. `src/pages/Settings.tsx`
3. `src/pages/Dashboard.tsx`
4. `supabase/functions/whatsapp-send-batch/index.ts`

**Escopo**

- extrair regras de negocio para modulos por dominio
- reduzir paginas para composicao de UI + estado da tela
- separar transformacoes, payload builders, metricas e selecao de variantes
- mover integracoes externas para helpers dedicados

**Estrutura sugerida**

- `src/features/campaigns/`
- `src/features/settings/`
- `src/features/dashboard/`
- `supabase/functions/_shared/whatsapp/`
- `supabase/functions/_shared/campaigns/`

**Entregaveis**

- paginas principais com menos responsabilidade
- funcoes reutilizaveis cobertas por testes
- menor uso de `any`

**Criterio de aceite**

- `Campaigns`, `Settings` e `Dashboard` perdem orquestracao pesada inline
- `whatsapp-send-batch` fica dividido por responsabilidades claras:
  - auth/contexto
  - selecao de destinatarios
  - construcao de mensagem
  - envio Meta
  - reconciliacao no banco

**Estimativa:** 4 a 6 dias

## Fase 3: Qualidade, Tipagem e Testes

**Objetivo:** criar guardrails para evolucao futura.

**Escopo**

- corrigir erros reais de lint do produto
- impedir novos `any` nos modulos refatorados
- subir a barra de TypeScript gradualmente
- ampliar testes para fluxos de negocio

**Trilhas de teste**

- unitario:
  - roteamento de campanha
  - payload builders
  - derivacao de estado do CRM
  - readiness e validacoes
- integracao:
  - scanner -> analise -> geracao
  - campanha -> dispatcher -> eventos
  - apresentacao publica -> abertura -> resposta
  - billing -> sincronizacao de plano

**Stack sugerida**

- manter `node:test` para helpers simples
- adicionar `Vitest` para unitario/integracao local
- avaliar `Playwright` depois da estabilizacao do dominio

**Entregaveis**

- lint verde no escopo do produto
- testes cobrindo os fluxos centrais
- regra explicita: sem novos `any` nos modulos saneados

**Criterio de aceite**

- `npm run lint` passa
- `npm test` cobre mais do que helpers isolados
- regressao de scanner, campanha e resposta publica deixa de depender so de teste manual

**Estimativa:** 3 a 5 dias

## Fase 4: Performance de Dados e Analytics

**Objetivo:** tirar do browser o que deve morar no banco.

**Escopo**

- eliminar N+1 nas telas de `Campaigns` e `Dashboard`
- promover agregacoes pesadas para SQL views ou RPCs
- revisar `crm_lead_snapshot` e separar o que e operacional do que e analitico
- reduzir loops de enriquecimento client-side

**Alvos principais**

- `src/pages/Campaigns.tsx`
- `src/pages/Dashboard.tsx`
- `supabase/migrations/*` novas views ou RPCs

**Entregaveis**

- view ou RPC para analytics comercial
- view ou consulta consolidada para metricas de campanha
- menos queries em cascata no carregamento das telas

**Criterio de aceite**

- `Campaigns` e `Dashboard` carregam com menos round-trips
- metricas saem do banco prontas ou quase prontas
- estrutura suporta crescimento de volume sem degradar linearmente no browser

**Estimativa:** 2 a 4 dias

## Fase 5: Bundle, Assets e Responsividade Operacional

**Objetivo:** reduzir peso de entrega e melhorar experiencia real.

**Escopo**

- code splitting por rotas pesadas
- revisar assets grandes, especialmente imagens de login/marketing
- lazy loading de modulos nao criticos
- revisar dependencias pouco usadas em caminhos principais

**Entregaveis**

- bundle principal menor
- carga inicial mais leve
- warning de chunk grande reduzido ou justificado

**Criterio de aceite**

- queda perceptivel do chunk principal
- rotas administrativas e de configuracao deixam de pesar no first load

**Estimativa:** 1 a 2 dias

## Fase 6: CI, Operacao e Documentacao Final

**Objetivo:** fechar o ciclo de manutencao.

**Escopo**

- criar pipeline CI com:
  - lint
  - test
  - build
- documentar deploy web e deploy de edge functions
- documentar checklist de segredos por ambiente
- consolidar docs de arquitetura, runbook e troubleshooting

**Entregaveis**

- workflow de CI
- runbook operacional
- documentacao de deploy e rollback

**Criterio de aceite**

- qualquer mudanca relevante passa pelo mesmo baseline automatizado
- onboarding e resposta a incidente nao dependem de memoria oral

**Estimativa:** 1 a 2 dias

## Cronograma Recomendado

### Semana 1

- Fase 0 completa
- Fase 1 completa
- iniciar Fase 2 em `Campaigns` e `Settings`

### Semana 2

- concluir Fase 2
- executar Fase 3

### Semana 3

- executar Fase 4
- executar Fase 5
- iniciar Fase 6

### Semana 4

- concluir Fase 6
- rodar regressao completa
- fechar backlog residual

## Regra de Execucao

- nenhuma fase deve abrir uma frente maior antes de fechar seu criterio de aceite
- sempre trabalhar com entregas pequenas e validaveis
- cada fase deve terminar com:
  - codigo verde
  - documento atualizado
  - risco reduzido de forma mensuravel

## Backlog de Execucao Imediata

1. Ajustar `eslint.config.js` para escopo real do produto.
2. Criar `README.md` correto e `.env.example`.
3. Classificar e endurecer as edge functions em `supabase/config.toml`.
4. Extrair o dominio de `Campaigns`.
5. Extrair o dominio de `Settings`.
6. Cobrir `Campaigns`, `CRM` e `PresentationView/respond-presentation` com testes.

## Definicao de Conclusao

O plano so termina quando:

- seguranca nao depende de convencao fragil
- mudancas nos fluxos principais sao testadas
- telas centrais deixam de ser arquivos monoliticos
- analytics e CRM estao mais proximos do banco do que do browser
- qualquer pessoa do time consegue subir, entender e validar o projeto sem depender de contexto oral
