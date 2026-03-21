import { AlertTriangle, CheckCircle2, Loader2, Mail, Save, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  emailSenderBadgeClass,
  emailSenderBadgeLabel,
  emailSenderPanelClass,
  type EmailSenderReadinessLevel,
  type EmailSenderStatus,
} from '@/lib/settings/email-sender-ui';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';

type EmailSenderCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: 'success' | 'warning' | 'danger';
  detail: string;
};

type EmailSenderIssue = {
  key: string;
  title: string;
  detail: string;
  action?: string;
  severity: 'warning' | 'danger';
};

type EmailSenderRecord = {
  record?: string | null;
  name?: string | null;
  type?: string | null;
  value?: string | null;
  status?: string | null;
  priority?: number | null;
};

type EmailSenderInfo = {
  summary?: string;
  readiness?: EmailSenderReadinessLevel;
  checks?: EmailSenderCheck[];
  issues?: EmailSenderIssue[];
  records?: EmailSenderRecord[];
};

type SettingsEmailDialogProps = {
  open: boolean;
  saving: boolean;
  validating: boolean;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  campaignSenderEmail: string;
  emailSenderStatus: EmailSenderStatus;
  emailSenderError: string;
  emailSenderInfo: EmailSenderInfo;
  emailSenderDomain: string;
  emailSenderLastCheckedAt: string | null;
  emailSenderVerifiedAt: string | null;
  onSenderEmailChange: (value: string) => void;
  onSenderNameChange: (value: string) => void;
  onReplyToEmailChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onValidate: () => void;
  onSave: () => void;
};

export const SettingsEmailDialog = ({
  open,
  saving,
  validating,
  senderEmail,
  senderName,
  replyToEmail,
  campaignSenderEmail,
  emailSenderStatus,
  emailSenderError,
  emailSenderInfo,
  emailSenderDomain,
  emailSenderLastCheckedAt,
  emailSenderVerifiedAt,
  onSenderEmailChange,
  onSenderNameChange,
  onReplyToEmailChange,
  onOpenChange,
  onValidate,
  onSave,
}: SettingsEmailDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-[22px] border border-[#ececf0] bg-white p-0 sm:max-w-lg">
      <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA4335]/10">
          <Mail className="h-5 w-5 text-[#EA4335]" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Configuracao de E-Mail</DialogTitle>
          <DialogDescription className="text-xs text-[#6d6d75]">
            Configure o remetente das propostas e campanhas por email.
          </DialogDescription>
        </div>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div className="rounded-2xl border border-[#e7e7ee] bg-[#f8f8fd] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Identidade do cliente</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6d6d75]">
                Use um email no dominio do cliente. Depois valide o dominio no Resend para liberar os disparos.
              </p>
            </div>
            <Badge className={emailSenderBadgeClass(emailSenderStatus)}>{emailSenderBadgeLabel(emailSenderStatus)}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-[#1A1A1A]">Email remetente das propostas</Label>
          <Input
            className={fieldClass}
            type="email"
            value={senderEmail}
            onChange={(event) => onSenderEmailChange(event.target.value)}
            placeholder="Ex: comercial@seudominio.com"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-[#1A1A1A]">Nome do remetente (opcional)</Label>
          <Input
            className={fieldClass}
            value={senderName}
            onChange={(event) => onSenderNameChange(event.target.value)}
            placeholder="Ex: Equipe EnvPRO"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-[#1A1A1A]">Reply-To (opcional)</Label>
          <Input
            className={fieldClass}
            type="email"
            value={replyToEmail}
            onChange={(event) => onReplyToEmailChange(event.target.value)}
            placeholder="Ex: respostas@seudominio.com"
          />
          <p className="text-xs text-[#6d6d75]">
            Se preenchido, as respostas vao para esse email em vez do remetente principal.
          </p>
        </div>

        {(campaignSenderEmail || emailSenderInfo.summary || emailSenderError) && (
          <div className={`space-y-4 rounded-2xl border p-4 ${emailSenderPanelClass(emailSenderInfo.readiness, emailSenderStatus)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8b92]">Prontidao do remetente</p>
                <p className="text-sm text-[#44444c]">
                  {emailSenderInfo.summary ||
                    (emailSenderStatus === 'ready'
                      ? 'Dominio validado e pronto para envio com a identidade do cliente.'
                      : emailSenderStatus === 'pending'
                        ? 'O dominio foi salvo, mas ainda precisa concluir a verificacao DNS no Resend.'
                        : emailSenderStatus === 'blocked'
                          ? emailSenderError || 'O remetente nao esta operacional neste momento.'
                          : 'Salve e valide o remetente para liberar campanhas com email do cliente.')}
                </p>
              </div>
              <Badge className={emailSenderBadgeClass(emailSenderStatus)}>{emailSenderBadgeLabel(emailSenderStatus)}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-[#e7e7ee] bg-white/85 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b8b92]">Dominio</p>
                <p className="mt-1 text-sm text-[#1A1A1A]">{emailSenderDomain || 'Nao definido'}</p>
              </div>
              <div className="rounded-xl border border-[#e7e7ee] bg-white/85 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b8b92]">Ultima validacao</p>
                <p className="mt-1 text-sm text-[#1A1A1A]">
                  {emailSenderLastCheckedAt ? new Date(emailSenderLastCheckedAt).toLocaleString('pt-BR') : 'Ainda nao validado'}
                </p>
              </div>
            </div>

            {emailSenderInfo.checks && emailSenderInfo.checks.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {emailSenderInfo.checks.map((check) => (
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
            )}

            {emailSenderInfo.issues && emailSenderInfo.issues.length > 0 && (
              <div className="rounded-xl border border-[#e7e7ee] bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8b92]">Itens que exigem atencao</p>
                <ul className="mt-2 space-y-2">
                  {emailSenderInfo.issues.map((issue) => (
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

            {emailSenderInfo.records && emailSenderInfo.records.length > 0 && (
              <div className="rounded-xl border border-[#e7e7ee] bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8b92]">Registros DNS esperados no dominio</p>
                <div className="mt-2 space-y-2">
                  {emailSenderInfo.records.map((record, index) => (
                    <div key={`${record.type}-${record.name}-${index}`} className="rounded-xl border border-[#ececf0] bg-white p-3">
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {(record.record || record.type || 'Registro')}
                        {record.status ? ` - ${record.status}` : ''}
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] text-[#6d6d75]">
                        {(record.name || '@')} - {record.type || '-'} - {record.value || '-'}
                        {typeof record.priority === 'number' ? ` - prioridade ${record.priority}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emailSenderVerifiedAt && (
              <p className="text-[11px] text-[#5d6b61]">
                Dominio verificado em {new Date(emailSenderVerifiedAt).toLocaleString('pt-BR')}.
              </p>
            )}
          </div>
        )}
      </div>
      <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-xl border-[#e0e0e8]"
          onClick={onValidate}
          disabled={validating || saving || !senderEmail.trim()}
        >
          {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Validar remetente
        </Button>
        <Button onClick={onSave} disabled={saving} className="h-11 gap-2 rounded-xl gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
