import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Eye, Settings, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export type FieldType = 'text' | 'textarea' | 'phone' | 'email' | 'number' | 'select' | 'radio' | 'checkbox';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
  condition: { fieldId: string; operator: 'equals' | 'not_equals'; value: string } | null;
}

export interface FormSchema {
  title: string;
  description: string;
  thank_you_message: string;
  slug: string;
  fields: FormField[];
}

interface FormBuilderProps {
  value: FormSchema;
  onChange: (schema: FormSchema) => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'phone', label: 'Telefone/WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Lista (dropdown)' },
  { value: 'radio', label: 'Escolha única (radio)' },
  { value: 'checkbox', label: 'Múltipla escolha' },
];

const hasOptions = (type: FieldType) => ['select', 'radio', 'checkbox'].includes(type);

const genId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_FIELDS: FormField[] = [
  { id: genId(), type: 'text', label: 'Nome completo', placeholder: 'Seu nome', required: true, options: [], condition: null },
  { id: genId(), type: 'phone', label: 'WhatsApp', placeholder: '(11) 99999-9999', required: true, options: [], condition: null },
  { id: genId(), type: 'textarea', label: 'Principal desafio hoje', placeholder: 'Descreva brevemente...', required: false, options: [], condition: null },
  { id: genId(), type: 'textarea', label: 'Objetivo nos próximos 90 dias', placeholder: 'O que você quer alcançar?', required: false, options: [], condition: null },
];

export const defaultFormSchema = (): FormSchema => ({
  title: 'Formulário de Qualificação',
  description: 'Preencha para receber sua proposta personalizada',
  thank_you_message: 'Obrigado! Em breve entraremos em contato.',
  slug: '',
  fields: DEFAULT_FIELDS,
});

// ─── Preview ────────────────────────────────────────────────────────────────

function FormPreview({ schema }: { schema: FormSchema }) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const isVisible = (field: FormField) => {
    if (!field.condition) return true;
    const dep = answers[field.condition.fieldId];
    const val = Array.isArray(dep) ? dep.join(', ') : (dep ?? '');
    return field.condition.operator === 'equals' ? val === field.condition.value : val !== field.condition.value;
  };

  const set = (id: string, val: string | string[]) => setAnswers((p) => ({ ...p, [id]: val }));

  return (
    <div className="max-w-lg mx-auto bg-card rounded-2xl border border-border p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold">{schema.title || 'Título do formulário'}</h2>
        {schema.description && <p className="text-sm text-muted-foreground mt-1">{schema.description}</p>}
      </div>
      <Separator />
      {schema.fields.map((field) => {
        if (!isVisible(field)) return null;
        const val = answers[field.id] ?? '';
        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-sm font-medium">
              {field.label || 'Campo'}{field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.type === 'textarea' && (
              <Textarea placeholder={field.placeholder} value={val as string} onChange={(e) => set(field.id, e.target.value)} rows={3} />
            )}
            {(field.type === 'text' || field.type === 'phone' || field.type === 'email' || field.type === 'number') && (
              <Input
                type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                placeholder={field.placeholder}
                value={val as string}
                onChange={(e) => set(field.id, e.target.value)}
              />
            )}
            {field.type === 'select' && (
              <Select value={val as string} onValueChange={(v) => set(field.id, v)}>
                <SelectTrigger><SelectValue placeholder={field.placeholder || 'Selecione...'} /></SelectTrigger>
                <SelectContent>
                  {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {field.type === 'radio' && (
              <div className="space-y-1.5">
                {field.options.map((o) => (
                  <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name={field.id} value={o} checked={val === o} onChange={() => set(field.id, o)} />
                    {o}
                  </label>
                ))}
              </div>
            )}
            {field.type === 'checkbox' && (
              <div className="space-y-1.5">
                {field.options.map((o) => {
                  const checked = Array.isArray(val) ? val.includes(o) : false;
                  return (
                    <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const arr = Array.isArray(val) ? [...val] : [];
                          set(field.id, checked ? arr.filter((v) => v !== o) : [...arr, o]);
                        }}
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <Button className="w-full rounded-full bg-[#ef3333] hover:bg-[#d42b2b] text-white" disabled>
        Enviar
      </Button>
    </div>
  );
}

// ─── Field Editor ────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  index,
  total,
  allFields,
  onChange,
  onMove,
  onDelete,
}: {
  field: FormField;
  index: number;
  total: number;
  allFields: FormField[];
  onChange: (f: FormField) => void;
  onMove: (from: number, to: number) => void;
  onDelete: () => void;
}) {
  const [optionInput, setOptionInput] = useState('');

  const addOption = () => {
    const v = optionInput.trim();
    if (!v || field.options.includes(v)) return;
    onChange({ ...field, options: [...field.options, v] });
    setOptionInput('');
  };

  return (
    <Card className="p-4 space-y-3 border-border/60">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
        <Badge variant="secondary" className="text-xs shrink-0">
          {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
        </Badge>
        <span className="text-sm font-medium truncate flex-1">{field.label || '(sem label)'}</span>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(index, index - 1)}>
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(index, index + 1)}>
            <ChevronDown className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={field.type} onValueChange={(v) => onChange({ ...field, type: v as FieldType, options: [] })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input className="h-9 text-xs" value={field.label} onChange={(e) => onChange({ ...field, label: e.target.value })} placeholder="Pergunta..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Placeholder</Label>
          <Input className="h-9 text-xs" value={field.placeholder} onChange={(e) => onChange({ ...field, placeholder: e.target.value })} placeholder="Texto de ajuda..." />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch checked={field.required} onCheckedChange={(v) => onChange({ ...field, required: v })} />
          <Label className="text-xs">Obrigatório</Label>
        </div>
      </div>

      {hasOptions(field.type) && (
        <div className="space-y-1.5">
          <Label className="text-xs">Opções</Label>
          <div className="flex gap-2">
            <Input className="h-8 text-xs" value={optionInput} onChange={(e) => setOptionInput(e.target.value)} placeholder="Adicionar opção..."
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }} />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addOption}>Adicionar</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {field.options.map((o) => (
              <Badge key={o} variant="secondary" className="gap-1 text-xs">
                {o}
                <button onClick={() => onChange({ ...field, options: field.options.filter((x) => x !== o) })} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Conditional logic */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Lógica condicional (opcional)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={field.condition?.fieldId ?? '__none__'}
            onValueChange={(v) => onChange({
              ...field,
              condition: v === '__none__' ? null : { fieldId: v, operator: 'equals', value: field.condition?.value ?? '' },
            })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Se campo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— nenhum —</SelectItem>
              {allFields.filter((f) => f.id !== field.id).map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.label || f.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={field.condition?.operator ?? 'equals'}
            onValueChange={(v) => field.condition && onChange({ ...field, condition: { ...field.condition, operator: v as 'equals' | 'not_equals' } })}
            disabled={!field.condition}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">for igual a</SelectItem>
              <SelectItem value="not_equals">for diferente de</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className="h-8 text-xs"
            placeholder="valor..."
            disabled={!field.condition}
            value={field.condition?.value ?? ''}
            onChange={(e) => field.condition && onChange({ ...field, condition: { ...field.condition, value: e.target.value } })}
          />
        </div>
      </div>
    </Card>
  );
}

// ─── Main FormBuilder ────────────────────────────────────────────────────────

export default function FormBuilder({ value, onChange }: FormBuilderProps) {
  const update = (patch: Partial<FormSchema>) => onChange({ ...value, ...patch });

  const updateField = (index: number, field: FormField) => {
    const fields = [...value.fields];
    fields[index] = field;
    update({ fields });
  };

  const addField = () => {
    update({
      fields: [
        ...value.fields,
        { id: genId(), type: 'text', label: '', placeholder: '', required: false, options: [], condition: null },
      ],
    });
  };

  const deleteField = (index: number) => {
    update({ fields: value.fields.filter((_, i) => i !== index) });
  };

  const moveField = (from: number, to: number) => {
    const fields = [...value.fields];
    const [item] = fields.splice(from, 1);
    fields.splice(to, 0, item);
    update({ fields });
  };

  return (
    <Tabs defaultValue="fields" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="fields" className="gap-1.5 text-xs">
          <List className="w-3.5 h-3.5" /> Campos
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-1.5 text-xs">
          <Settings className="w-3.5 h-3.5" /> Configurações
        </TabsTrigger>
        <TabsTrigger value="preview" className="gap-1.5 text-xs">
          <Eye className="w-3.5 h-3.5" /> Preview
        </TabsTrigger>
      </TabsList>

      {/* ── Fields tab ── */}
      <TabsContent value="fields" className="space-y-3">
        {value.fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum campo. Clique em "+ Adicionar campo".</p>
        )}
        {value.fields.map((field, index) => (
          <FieldEditor
            key={field.id}
            field={field}
            index={index}
            total={value.fields.length}
            allFields={value.fields}
            onChange={(f) => updateField(index, f)}
            onMove={moveField}
            onDelete={() => deleteField(index)}
          />
        ))}
        <Button variant="outline" className="w-full gap-2" onClick={addField}>
          <Plus className="w-4 h-4" /> Adicionar campo
        </Button>
      </TabsContent>

      {/* ── Settings tab ── */}
      <TabsContent value="settings" className="space-y-4">
        <div className="space-y-1.5">
          <Label>Título do formulário</Label>
          <Input value={value.title} onChange={(e) => update({ title: e.target.value })} placeholder="Ex: Qualificação de Lead" />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea value={value.description} onChange={(e) => update({ description: e.target.value })} placeholder="Subtítulo exibido abaixo do título..." rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Mensagem após envio</Label>
          <Textarea value={value.thank_you_message} onChange={(e) => update({ thank_you_message: e.target.value })} placeholder="Ex: Obrigado! Em breve entraremos em contato." rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>URL personalizada</Label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">/form/</span>
            <Input
              value={value.slug}
              onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })}
              placeholder="qualificacao-restaurantes"
            />
          </div>
          {value.slug && (
            <p className="text-xs text-muted-foreground">{window.location.origin}/form/{value.slug}</p>
          )}
        </div>
      </TabsContent>

      {/* ── Preview tab ── */}
      <TabsContent value="preview">
        <FormPreview schema={value} />
      </TabsContent>
    </Tabs>
  );
}
