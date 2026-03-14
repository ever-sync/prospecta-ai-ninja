import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CRMTask } from '@/types/crm';

type CRMTaskComposerProps = {
  presentationId: string;
  onCreateTask: (payload: {
    presentation_id: string;
    type: CRMTask['type'];
    title: string;
    due_at?: string | null;
  }) => Promise<boolean>;
  defaultType?: CRMTask['type'];
  compact?: boolean;
};

const taskTypeOptions: Array<{ value: CRMTask['type']; label: string }> = [
  { value: 'followup', label: 'Follow-up' },
  { value: 'call', label: 'Ligacao' },
  { value: 'send_message', label: 'Enviar mensagem' },
  { value: 'review_proposal', label: 'Revisar proposta' },
  { value: 'schedule_meeting', label: 'Agendar reuniao' },
  { value: 'send_next_step', label: 'Enviar proxima etapa' },
];

export const CRMTaskComposer = ({ presentationId, onCreateTask, defaultType = 'followup', compact = false }: CRMTaskComposerProps) => {
  const [type, setType] = useState<CRMTask['type']>(defaultType);
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const ok = await onCreateTask({
      presentation_id: presentationId,
      type,
      title: title.trim(),
      due_at: dueAt || null,
    });
    setLoading(false);
    if (!ok) return;
    setTitle('');
    setDueAt('');
    setType(defaultType);
  };

  return (
    <div className="space-y-3 rounded-[20px] border border-[#ececf0] bg-[#fafafd] p-4">
      {!compact ? <p className="text-sm font-medium text-[#1A1A1A]">Criar tarefa</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(value) => setType(value as CRMTask['type'])}>
            <SelectTrigger className="h-10 rounded-xl border-[#e6e6eb] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prazo</Label>
          <Input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="h-10 rounded-xl border-[#e6e6eb] bg-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Titulo</Label>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex: Retomar contato apos abertura"
          className="h-10 rounded-xl border-[#e6e6eb] bg-white"
        />
      </div>
      <Button type="button" className="rounded-xl gradient-primary text-primary-foreground" disabled={loading || !title.trim()} onClick={handleCreate}>
        {loading ? 'Criando...' : 'Criar tarefa'}
      </Button>
    </div>
  );
};
