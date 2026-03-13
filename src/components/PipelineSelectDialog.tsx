import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
}

type ResponseMode = 'buttons' | 'form';

interface FormTemplate {
  id: string;
  name: string;
  body: string;
}

interface PipelineSelectDialogProps {
  open: boolean;
  onConfirm: (result: {
    attach: boolean;
    stageId?: string;
    responseMode: ResponseMode;
    formTemplateId?: string;
    formTemplateName?: string;
    formTemplateBody?: string;
  }) => void;
  onCancel: () => void;
}

export const PipelineSelectDialog = ({ open, onConfirm, onCancel }: PipelineSelectDialogProps) => {
  const { user } = useAuth();
  const [attach, setAttach] = useState(true);
  const [stageId, setStageId] = useState<string>('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [responseMode, setResponseMode] = useState<ResponseMode>('buttons');
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formTemplateId, setFormTemplateId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      setResponseMode('buttons');
      setFormTemplateId('');

      const [{ data: stagesData }, { data: templatesData }] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('*')
          .eq('user_id', user.id)
          .order('position'),
        supabase
          .from('message_templates')
          .select('id, name, body')
          .eq('user_id', user.id)
          .eq('channel', 'formulario')
          .order('name'),
      ]);

      if (stagesData && stagesData.length > 0) {
        setStages(stagesData as PipelineStage[]);
        setStageId(stagesData[0].id);
      }
      setFormTemplates((templatesData as FormTemplate[]) || []);
      setLoading(false);
    };
    load();
  }, [open, user]);

  const selectedFormTemplate = formTemplates.find((tpl) => tpl.id === formTemplateId);
  const mustSelectFormTemplate = responseMode === 'form' && !formTemplateId;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar ao Pipeline</DialogTitle>
          <DialogDescription>Deseja anexar as apresentações a uma etapa do seu pipeline?</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="attach-pipeline" className="text-sm font-medium">Anexar ao pipeline?</Label>
              <Switch id="attach-pipeline" checked={attach} onCheckedChange={setAttach} />
            </div>

            {attach && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Selecione a etapa</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Resposta da proposta</Label>
              <Select value={responseMode} onValueChange={(value) => setResponseMode(value as ResponseMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um modo de resposta..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buttons">Botoes de Aceitar e Recusar</SelectItem>
                  <SelectItem value="form">Formulario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {responseMode === 'form' && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Template de formulario</Label>
                <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um formulario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formTemplates.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum template de formulario encontrado. Crie um em Templates.
                      </div>
                    ) : (
                      formTemplates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            onClick={() =>
              onConfirm({
                attach,
                stageId: attach ? stageId : undefined,
                responseMode,
                formTemplateId: responseMode === 'form' ? formTemplateId : undefined,
                formTemplateName: responseMode === 'form' ? selectedFormTemplate?.name : undefined,
                formTemplateBody: responseMode === 'form' ? selectedFormTemplate?.body : undefined,
              })
            }
            disabled={loading || (attach && !stageId) || mustSelectFormTemplate}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
