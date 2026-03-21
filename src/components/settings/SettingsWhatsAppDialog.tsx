import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  MessageCircle,
  Save,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';

type MetaConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';
type MetaReadinessLevel = 'ready' | 'partial' | 'blocked';

type MetaReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: 'success' | 'warning' | 'danger';
  detail: string;
};

type MetaReadinessIssue = {
  key: string;
  title: string;
  detail: string;
  action?: string;
  severity: 'warning' | 'danger';
};

type MetaStatusInfo = {
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  qualityRating?: string | null;
  error?: string;
  webhookUrl?: string;
  verifyToken?: string;
  readiness?: MetaReadinessLevel;
  summary?: string;
  checks?: MetaReadinessCheck[];
  issues?: MetaReadinessIssue[];
};

type SettingsWhatsAppDialogProps = {
  open: boolean;
  saving: boolean;
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  metaStatus: MetaConnectionStatus;
  metaStatusInfo: MetaStatusInfo;
  showMetaGuide: boolean;
  onAccessTokenChange: (value: string) => void;
  onPhoneNumberIdChange: (value: string) => void;
  onWabaIdChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onTestConnection: () => void;
  onToggleGuide: () => void;
  onCopyToClipboard: (value: string, label: string) => void;
  onSave: () => void;
};

const guideSteps = [
  'Acesse developers.facebook.com e crie um App do tipo "Business".',
  'No app, va em "WhatsApp" -> "Configuracao" e adicione um numero de telefone.',
  'Copie o "Phone Number ID" que aparece na pagina de configuracao e cole no campo acima.',
  'Gere um Token de Acesso Permanente em "Configuracoes do Sistema" -> "Usuarios do Sistema" com o escopo "whatsapp_business_messaging".',
  'Cole o token permanente no campo "Meta Access Token".',
  'Configure o META_WHATSAPP_APP_SECRET no Supabase para receber status de entrega e leitura.',
  'Clique em "Testar conexao" para validar. Se der OK, salve as integracoes.',
  'Depois de salvar, teste novamente para ver a URL do webhook e o Verify Token.',
  'No painel Meta: WhatsApp -> Configuracao -> Webhooks -> Editar -> cole a URL e o Verify Token -> ative o campo "messages".',
];

export const SettingsWhatsAppDialog = ({
  open,
  saving,
  accessToken,
  phoneNumberId,
  wabaId,
  metaStatus,
  metaStatusInfo,
  showMetaGuide,
  onAccessTokenChange,
  onPhoneNumberIdChange,
  onWabaIdChange,
  onOpenChange,
  onTestConnection,
  onToggleGuide,
  onCopyToClipboard,
  onSave,
}: SettingsWhatsAppDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white p-0 sm:max-w-2xl">
      <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">WhatsApp - Meta Cloud API</DialogTitle>
          <DialogDescription className="text-xs text-[#6d6d75]">
            Configure suas credenciais da Meta para enviar mensagens via WhatsApp oficial.
          </DialogDescription>
        </div>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div className="flex items-center justify-between rounded-2xl border border-[#d9e4ff] bg-[#f4f7ff] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">Modo WhatsApp</p>
            <p className="text-xs text-[#5a5a62]">Somente Meta Cloud API oficial permanece habilitada.</p>
          </div>
          <Badge className="rounded-full border-[#d9e4ff] bg-white text-[#365fc2]">Oficial</Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm text-[#1A1A1A]">Meta Access Token</Label>
            <Input
              type="password"
              className={fieldClass}
              value={accessToken}
              onChange={(event) => onAccessTokenChange(event.target.value)}
              placeholder="Cole o token permanente da Meta"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-[#1A1A1A]">Phone Number ID</Label>
            <Input
              className={fieldClass}
              value={phoneNumberId}
              onChange={(event) => onPhoneNumberIdChange(event.target.value)}
              placeholder="Ex: 123456789012345"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm text-[#1A1A1A]">
              WABA ID <span className="font-normal text-[#9b9ba3]">(WhatsApp Business Account ID)</span>
            </Label>
            <Input
              className={fieldClass}
              value={wabaId}
              onChange={(event) => onWabaIdChange(event.target.value)}
              placeholder="Ex: 102098765432100"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onTestConnection}
            disabled={metaStatus === 'testing' || !accessToken.trim() || !phoneNumberId.trim()}
            className="h-9 gap-2 rounded-xl border-[#e0e0e8]"
          >
            {metaStatus === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Testar conexao
          </Button>
          {metaStatus === 'connected' && (
            <div className="flex items-center gap-2 rounded-xl border border-[#cde8d9] bg-[#eef8f3] px-3 py-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#1f8f47]" />
              <span className="text-sm font-medium text-[#1f6e38]">
                {metaStatusInfo.displayPhoneNumber
                  ? `${metaStatusInfo.verifiedName || 'Conectado'} - ${metaStatusInfo.displayPhoneNumber}`
                  : 'Conectado'}
              </span>
              {metaStatusInfo.qualityRating && (
                <Badge className="rounded-full border-[#cde8d9] bg-white px-2 text-[10px] text-[#2a7a50]">
                  {metaStatusInfo.qualityRating}
                </Badge>
              )}
            </div>
          )}
          {metaStatus === 'error' && (
            <div className="flex items-center gap-2 rounded-xl border border-[#f2d4d8] bg-[#fff3f5] px-3 py-1.5">
              <WifiOff className="h-4 w-4 text-[#b2374b]" />
              <span className="text-sm text-[#8c2535]">{metaStatusInfo.error || 'Credenciais invalidas'}</span>
            </div>
          )}
        </div>

        {metaStatusInfo.readiness && (
          <div
            className={`space-y-4 rounded-2xl border p-4 ${
              metaStatusInfo.readiness === 'ready'
                ? 'border-[#cde8d9] bg-[#eef8f3]'
                : metaStatusInfo.readiness === 'partial'
                  ? 'border-[#f5c842]/40 bg-[#fffbeb]'
                  : 'border-[#f2d4d8] bg-[#fff3f5]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8b92]">Prontidao da integracao</p>
                <p className="text-sm text-[#44444c]">
                  {metaStatusInfo.summary || 'Diagnostico da integracao oficial do WhatsApp.'}
                </p>
              </div>
              <Badge
                className={`rounded-full px-2.5 py-1 text-[10px] ${
                  metaStatusInfo.readiness === 'ready'
                    ? 'border-[#cde8d9] bg-white text-[#1f6e38]'
                    : metaStatusInfo.readiness === 'partial'
                      ? 'border-[#f5c842]/50 bg-white text-[#8b5e00]'
                      : 'border-[#f2d4d8] bg-white text-[#8c2535]'
                }`}
              >
                {metaStatusInfo.readiness === 'ready'
                  ? 'Pronta'
                  : metaStatusInfo.readiness === 'partial'
                    ? 'Parcial'
                    : 'Bloqueada'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {(metaStatusInfo.checks || []).map((check) => (
                <div key={check.key} className="flex gap-2 rounded-xl border border-[#e7e7ee] bg-white/85 p-3">
                  {check.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1f8f47]" />
                  ) : check.severity === 'danger' ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b2374b]" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-[#1A1A1A]">{check.label}</p>
                    <p className="text-[11px] leading-relaxed text-[#6d6d75]">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {metaStatusInfo.issues && metaStatusInfo.issues.length > 0 && (
              <div className="rounded-xl border border-[#e7e7ee] bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8b92]">Itens que exigem atencao</p>
                <ul className="mt-2 space-y-2">
                  {metaStatusInfo.issues.map((issue) => (
                    <li key={issue.key} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-[#1A1A1A]">{issue.title}</p>
                        <p className="text-[11px] leading-relaxed text-[#6d6d75]">{issue.detail}</p>
                        {issue.action && (
                          <p className="text-[11px] leading-relaxed text-[#8b5e00]">Acao recomendada: {issue.action}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {metaStatusInfo.webhookUrl && (
          <div className="space-y-3 rounded-2xl border border-[#e8e8ef] bg-[#f5f5fa] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8b92]">Configure no painel Meta Developer</p>
            <div className="space-y-2">
              <Label className="text-xs text-[#5a5a62]">URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={metaStatusInfo.webhookUrl}
                  className="h-9 rounded-xl border-[#dcdce4] bg-white font-mono text-xs text-[#3a3a42]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl border-[#dcdce4]"
                  onClick={() => onCopyToClipboard(metaStatusInfo.webhookUrl!, 'URL do Webhook')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {metaStatusInfo.verifyToken && (
              <div className="space-y-2">
                <Label className="text-xs text-[#5a5a62]">Verify Token</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={metaStatusInfo.verifyToken}
                    className="h-9 rounded-xl border-[#dcdce4] bg-white font-mono text-xs text-[#3a3a42]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl border-[#dcdce4]"
                    onClick={() => onCopyToClipboard(metaStatusInfo.verifyToken!, 'Verify Token')}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            <p className="text-[11px] text-[#8b8b92]">
              No Meta for Developers: App - WhatsApp - Configuracao - Webhooks - Editar - cole a URL e o Verify
              Token - Verificar - ative o campo <strong>messages</strong>.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleGuide}
          className="flex items-center gap-1.5 text-xs font-medium text-[#6060c8] hover:text-[#4040a8]"
        >
          {showMetaGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showMetaGuide ? 'Ocultar guia de configuracao' : 'Como obter as credenciais Meta?'}
        </button>

        {showMetaGuide && (
          <div className="space-y-3 rounded-2xl border border-[#e4e4f0] bg-[#f8f8fd] p-4 text-sm text-[#44444c]">
            <p className="font-semibold text-[#1A1A1A]">Passo a passo - Meta WhatsApp Cloud API</p>
            <ol className="list-none space-y-2">
              {guideSteps.map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#5d5dd3]">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <div className="rounded-xl border border-[#ececf3] bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8b92]">Importante</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6d6d75]">
                O custo de mensagens e cobrado diretamente pela Meta. As primeiras 1.000 conversas por mes sao gratuitas.
              </p>
            </div>
          </div>
        )}
      </div>
      <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving} className="h-11 gap-2 rounded-xl gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
