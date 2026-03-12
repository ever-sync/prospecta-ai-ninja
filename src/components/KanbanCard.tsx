import { useState, useEffect, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, ChevronUp, Phone, Tag, GripVertical, Plus, StickyNote, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface LeadNote {
  id: string;
  content: string;
  created_at: string;
}

interface KanbanCardProps {
  lead: {
    id: string;
    business_name: string | null;
    business_phone: string | null;
    business_category: string | null;
    created_at: string | null;
  };
  onDragStart: (e: DragEvent<HTMLDivElement>, leadId: string) => void;
}

export const KanbanCard = ({ lead, onDragStart }: KanbanCardProps) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (!expanded || !user) return;
    const loadNotes = async () => {
      setLoadingNotes(true);
      const { data } = await supabase
        .from('lead_notes')
        .select('id, content, created_at')
        .eq('presentation_id', lead.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotes((data || []) as LeadNote[]);
      setLoadingNotes(false);
    };
    loadNotes();
  }, [expanded, lead.id, user]);

  const handleAddNote = async () => {
    if (!user || !newNote.trim()) return;
    setAddingNote(true);
    const { data, error } = await supabase.from('lead_notes').insert({
      presentation_id: lead.id,
      user_id: user.id,
      content: newNote.trim(),
    } as any).select('id, content, created_at').single();

    if (error) {
      toast.error('Erro ao salvar nota');
    } else if (data) {
      setNotes(prev => [data as LeadNote, ...prev]);
      setNewNote('');
      toast.success('Nota adicionada');
    }
    setAddingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
    if (error) {
      toast.error('Erro ao excluir nota');
    } else {
      setNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  return (
    <motion.div
      key={lead.id}
      layoutId={lead.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as DragEvent<HTMLDivElement>, lead.id)}
      className="bg-background rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground truncate">{lead.business_name || '—'}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          {lead.business_category && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="w-3 h-3" />
              <span className="truncate">{lead.business_category}</span>
            </div>
          )}
          {lead.business_phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>{lead.business_phone}</span>
            </div>
          )}
          {lead.created_at && (
            <p className="text-[10px] text-muted-foreground/60">
              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
            </p>
          )}

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2 mt-2 border-t border-border space-y-2">
                  <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                    <StickyNote className="w-3 h-3" />
                    Notas ({notes.length})
                  </div>

                  {/* Add note */}
                  <div className="flex gap-1.5">
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Adicionar nota..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2"
                      onClick={handleAddNote}
                      disabled={addingNote || !newNote.trim()}
                    >
                      {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    </Button>
                  </div>

                  {/* Notes list */}
                  {loadingNotes ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/50 text-center py-1">Nenhuma nota</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {notes.map((note) => (
                        <div key={note.id} className="bg-muted/50 rounded p-1.5 group/note">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-[11px] text-foreground leading-relaxed break-words flex-1">{note.content}</p>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="w-4 h-4 flex items-center justify-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/note:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                            {new Date(note.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
