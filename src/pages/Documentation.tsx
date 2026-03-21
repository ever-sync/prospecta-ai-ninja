import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronRight, FileText, KeyRound, Link2, MessageCircle, Settings, ShieldCheck, Workflow } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const docs = [
  {
    title: 'Integração oficial do WhatsApp',
    description: 'Checklist de credenciais, webhook da Meta, validação e status de entrega.',
    href: '/settings',
    cta: 'Abrir integração',
    icon: MessageCircle,
  },
  {
    title: 'Campanhas e envio',
    description: 'Fluxo de criação, agendamento, disparo e follow-up das campanhas.',
    href: '/campaigns',
    cta: 'Ir para campanhas',
    icon: Workflow,
  },
  {
    title: 'Ajustes da conta',
    description: 'Configurações de empresa, faturamento e preferências operacionais.',
    href: '/settings',
    cta: 'Ver ajustes',
    icon: Settings,
  },
];

const referenceFiles = [
  'supabase/functions/whatsapp-status-webhook/index.ts',
  'supabase/functions/validate-meta-whatsapp/index.ts',
  'supabase/config.toml',
  'src/pages/Settings.tsx',
];

type WebhookFlowStep = {
  step: string;
  title: string;
  description: string;
};

type WebhookEndpoint = {
  method: 'GET' | 'POST';
  path: string;
  description: string;
};

type WebhookSecret = {
  key: string;
  description: string;
};

type WebhookStatus = {
  status: string;
  description: string;
  tone: 'ready' | 'warning' | 'danger';
};

type WebhookIssue = {
  title: string;
  description: string;
  fix: string;
};

const webhookFlow: WebhookFlowStep[] = [
  {
    step: '1',
    title: 'Validar a integração',
    description:
      'Em Configurações > Integrações, o botão "Testar conexão" chama validate-meta-whatsapp e devolve a URL do webhook, o verify token e o diagnóstico de prontidão.',
  },
  {
    step: '2',
    title: 'Publicar na Meta',
    description:
      'Na Meta for Developers, cole a URL do webhook e o verify token, depois ative o campo messages para receber callbacks do WhatsApp.',
  },
  {
    step: '3',
    title: 'Confirmar o desafio GET',
    description:
      'A Meta faz uma requisição GET com hub.mode, hub.verify_token e hub.challenge. Se o token bater, o endpoint devolve o challenge e o webhook fica validado.',
  },
  {
    step: '4',
    title: 'Processar o POST',
    description:
      'Cada callback POST passa por validação de assinatura com x-hub-signature-256 e META_WHATSAPP_APP_SECRET antes de tocar no banco.',
  },
  {
    step: '5',
    title: 'Reconciliação de eventos',
    description:
      'Status e replies atualizam campaign_presentations, campaign_message_attempts e message_conversion_events para manter o funil consistente.',
  },
];

const webhookEndpoints: WebhookEndpoint[] = [
  {
    method: 'GET',
    path: '/functions/v1/whatsapp-status-webhook',
    description: 'Valida o challenge da Meta durante o setup do webhook.',
  },
  {
    method: 'POST',
    path: '/functions/v1/whatsapp-status-webhook',
    description: 'Recebe statuses, mensagens e confirmações de leitura/entrega.',
  },
];

const webhookSecrets: WebhookSecret[] = [
  {
    key: 'META_WHATSAPP_VERIFY_TOKEN',
    description: 'Precisa bater com o token informado no painel da Meta durante a verificação inicial.',
  },
  {
    key: 'META_WHATSAPP_APP_SECRET',
    description: 'Usado para validar a assinatura x-hub-signature-256 e bloquear payload adulterado.',
  },
  {
    key: 'SUPABASE_URL',
    description: 'Base usada para montar a URL do webhook exibida no Settings.',
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Permite gravar eventos reconciliados no banco via edge function.',
  },
];

const webhookStatuses: WebhookStatus[] = [
  { status: 'sent', description: 'Mensagem aceita pelo provedor.', tone: 'ready' },
  { status: 'delivered', description: 'Chegou ao aparelho do destinatário.', tone: 'ready' },
  { status: 'read', description: 'O destinatário abriu a mensagem.', tone: 'ready' },
  { status: 'failed', description: 'Falha final ou rejeição do provedor.', tone: 'danger' },
  { status: 'undelivered', description: 'Mensagem não saiu do pipeline da Meta.', tone: 'warning' },
  { status: 'deleted', description: 'Callback tratado como falha operacional.', tone: 'warning' },
];

const webhookIssues: WebhookIssue[] = [
  {
    title: '401 Invalid signature',
    description: 'A Meta enviou o POST, mas a assinatura não bateu com o app secret.',
    fix: 'Confira META_WHATSAPP_APP_SECRET no Supabase e se a assinatura x-hub-signature-256 está sendo enviada pela Meta.',
  },
  {
    title: '403 no GET de verificação',
    description: 'O verify token não bateu com o valor configurado no painel da Meta.',
    fix: 'Reabra o setup em Configurações, copie o verify token correto e atualize o webhook na Meta.',
  },
  {
    title: 'Webhook sem resposta',
    description: 'A URL está errada ou o evento messages não foi ativado.',
    fix: 'Use a URL exibida em Settings, salve a configuração na Meta e reative o campo messages.',
  },
  {
    title: 'Status não reconcilia',
    description: 'A campanha foi disparada, mas os eventos não aparecem no CRM.',
    fix: 'Verifique se provider_message_id foi salvo e se a mensagem veio do provider meta_cloud.',
  },
];

const Documentation = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-[28px] border border-[#ececf0] bg-[linear-gradient(135deg,#ffffff_0%,#f7f7fb_100%)] p-6 shadow-[0_14px_30px_rgba(18,18,22,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dfe8ff] bg-[#f4f7ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#365fc2]">
              <BookOpen className="h-3.5 w-3.5" />
              Base de conhecimento
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A] sm:text-3xl">Documentação</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d6d75]">
              Central de referências operacionais para configurar a plataforma, entender os fluxos e localizar as decisões de produto.
            </p>
          </div>
          <Badge className="h-7 rounded-full border-[#d9e4ff] bg-white px-3 text-[11px] font-semibold text-[#365fc2]">
            Atualizado
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {docs.map((doc) => (
          <Card key={doc.title} className="rounded-[24px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
            <doc.icon className="h-5 w-5 text-[#EF3333]" />
            <h2 className="mt-4 text-base font-semibold text-[#1A1A1A]">{doc.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6d6d75]">{doc.description}</p>
            <Button
              type="button"
              className="mt-4 h-10 rounded-xl bg-[#EF3333] px-4 text-sm font-medium text-white hover:bg-[#d42d2d]"
              onClick={() => navigate(doc.href)}
            >
              {doc.cta}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      <Card className="mt-6 rounded-[28px] border border-[#ececf0] bg-white p-6 shadow-[0_14px_30px_rgba(18,18,22,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-[#d9e4ff] bg-[#f4f7ff] text-[#365fc2]">
                <Link2 className="mr-1 h-3.5 w-3.5" />
                Webhook inbound
              </Badge>
              <Badge className="rounded-full border-[#d9f0dd] bg-[#f3fbf6] text-[#1f6e38]">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Meta Cloud API
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#1A1A1A] sm:text-2xl">
              Como o webhook funciona
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6d6d75]">
              Este webhook é o callback inbound da Meta/WhatsApp: ele recebe o desafio de verificação, confirma a assinatura dos callbacks e atualiza status, leituras e respostas no banco.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#f2d4d8] bg-[#fff7f8] p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b2374b]" />
            <div>
              <p className="text-sm font-semibold text-[#8c2535]">Importante</p>
              <p className="mt-1 text-sm leading-6 text-[#8c2535]">
                Aqui estamos documentando o webhook de status e respostas da Meta. O canal de campanha chamado <strong>webhook</strong> não está ativo como disparo outbound.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {webhookFlow.map((item) => (
            <div key={item.step} className="rounded-2xl border border-[#ececf0] bg-[#fafafd] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EF3333] text-xs font-bold text-white">
                  {item.step}
                </div>
                <p className="text-sm font-semibold text-[#1A1A1A]">{item.title}</p>
              </div>
              <p className="mt-2 text-xs leading-6 text-[#6d6d75]">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#ececf0] bg-[#fafafd] p-5">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[#EF3333]" />
              <h3 className="text-base font-semibold text-[#1A1A1A]">Endpoints</h3>
            </div>
            <div className="mt-4 space-y-3">
              {webhookEndpoints.map((endpoint) => (
                <div key={`${endpoint.method}-${endpoint.path}`} className="rounded-2xl border border-[#e7e7ee] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={endpoint.method === 'GET' ? 'rounded-full border-[#d9e4ff] bg-[#f4f7ff] text-[#365fc2]' : 'rounded-full border-[#d9f0dd] bg-[#f3fbf6] text-[#1f6e38]'}>
                      {endpoint.method}
                    </Badge>
                    <span className="font-mono text-[11px] text-[#4a4a52]">{endpoint.path}</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[#6d6d75]">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ececf0] bg-[#fafafd] p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#EF3333]" />
              <h3 className="text-base font-semibold text-[#1A1A1A]">Segredos e variáveis</h3>
            </div>
            <div className="mt-4 space-y-3">
              {webhookSecrets.map((secret) => (
                <div key={secret.key} className="rounded-2xl border border-[#e7e7ee] bg-white p-4">
                  <p className="font-mono text-xs font-semibold text-[#1A1A1A]">{secret.key}</p>
                  <p className="mt-1 text-xs leading-6 text-[#6d6d75]">{secret.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#ececf0] bg-[#fafafd] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#EF3333]" />
              <h3 className="text-base font-semibold text-[#1A1A1A]">Status processados</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {webhookStatuses.map((item) => (
                <div key={item.status} className="rounded-2xl border border-[#e7e7ee] bg-white p-4">
                  <Badge
                    className={
                      item.tone === 'ready'
                        ? 'rounded-full border-[#d9f0dd] bg-[#f3fbf6] text-[#1f6e38]'
                        : item.tone === 'warning'
                          ? 'rounded-full border-[#f5c842]/40 bg-[#fffbeb] text-[#8b5e00]'
                          : 'rounded-full border-[#f2d4d8] bg-[#fff7f8] text-[#8c2535]'
                    }
                  >
                    {item.status}
                  </Badge>
                  <p className="mt-2 text-xs leading-6 text-[#6d6d75]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ececf0] bg-[#fafafd] p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#EF3333]" />
              <h3 className="text-base font-semibold text-[#1A1A1A]">Problemas comuns</h3>
            </div>
            <div className="mt-4 space-y-3">
              {webhookIssues.map((issue) => (
                <div key={issue.title} className="rounded-2xl border border-[#e7e7ee] bg-white p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{issue.title}</p>
                  <p className="mt-1 text-xs leading-6 text-[#6d6d75]">{issue.description}</p>
                  <p className="mt-2 text-xs leading-6 text-[#8b5e00]">
                    Correção: {issue.fix}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-6 rounded-[24px] border border-[#ececf0] bg-[#fafafd] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#EF3333]" />
              <h2 className="text-base font-semibold text-[#1A1A1A]">Referências do projeto</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6d6d75]">
              Estes arquivos concentram análises internas e decisões de arquitetura que ajudam a entender o produto.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {referenceFiles.map((file) => (
            <div key={file} className="rounded-2xl border border-[#e7e7ee] bg-white px-4 py-3 text-sm text-[#44444c]">
              {file}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Documentation;
