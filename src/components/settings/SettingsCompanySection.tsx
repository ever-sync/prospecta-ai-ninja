import type { ChangeEventHandler } from 'react';
import { Building2, Save, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';
const cardClass = 'rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]';

type SettingsCompanySectionProps = {
  logoUrl: string;
  uploading: boolean;
  fullName: string;
  companyName: string;
  documentNumber: string;
  email: string;
  phone: string;
  saving: boolean;
  formattedDocumentNumber: string;
  onLogoUpload: ChangeEventHandler<HTMLInputElement>;
  onFullNameChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onOpenEmailChange: () => void;
  onSave: () => void;
};

export const SettingsCompanySection = ({
  logoUrl,
  uploading,
  fullName,
  companyName,
  documentNumber,
  email,
  phone,
  saving,
  formattedDocumentNumber,
  onLogoUpload,
  onFullNameChange,
  onCompanyNameChange,
  onPhoneChange,
  onOpenEmailChange,
  onSave,
}: SettingsCompanySectionProps) => (
  <Card className={cardClass}>
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-[#1A1A1A]">Logo da Empresa</Label>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg border border-[#e6e6eb] object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#f5f5f7]">
              <Building2 className="h-8 w-8 text-[#7b7b83]" />
            </div>
          )}
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" className="h-10 gap-2 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]" asChild>
              <span>
                <Upload className="h-4 w-4" />
                {uploading ? 'Enviando...' : 'Upload'}
              </span>
            </Button>
            <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="fullName" className="text-sm text-[#1A1A1A]">
            Nome completo
          </Label>
          <Input
            id="fullName"
            className={fieldClass}
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            placeholder="Nome do responsavel"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="companyName" className="text-sm text-[#1A1A1A]">
            Nome da Empresa
          </Label>
          <Input
            id="companyName"
            className={fieldClass}
            value={companyName}
            onChange={(event) => onCompanyNameChange(event.target.value)}
            placeholder="Sua empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentNumber" className="text-sm text-[#1A1A1A]">
            CPF ou CNPJ
          </Label>
          <Input
            id="documentNumber"
            className={`${fieldClass} bg-[#f7f7fa] text-[#65656d]`}
            value={formattedDocumentNumber || documentNumber}
            readOnly
            disabled
            placeholder="Documento principal"
          />
          <p className="text-xs text-[#6d6d75]">
            Esse documento define o perfil da empresa e nao pode ser alterado apos o cadastro.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settingsEmail" className="text-sm text-[#1A1A1A]">
            Email de acesso
          </Label>
          <Input
            id="settingsEmail"
            className={`${fieldClass} bg-[#f7f7fa] text-[#65656d]`}
            type="email"
            value={email}
            readOnly
            disabled
            placeholder="contato@empresa.com"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[#6d6d75]">O email de acesso so pode ser alterado com verificacao.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-[#f1d2d7] text-[#b2374b] hover:bg-[#fff3f5]"
              onClick={onOpenEmailChange}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Alterar com verificacao
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settingsPhone" className="text-sm text-[#1A1A1A]">
            Telefone
          </Label>
          <Input
            id="settingsPhone"
            className={fieldClass}
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <Button onClick={onSave} disabled={saving} className="h-12 w-full gap-2 rounded-xl font-semibold gradient-primary text-primary-foreground">
        <Save className="h-4 w-4" />
        {saving ? 'Salvando...' : 'Salvar Configuracoes'}
      </Button>
    </div>
  </Card>
);
