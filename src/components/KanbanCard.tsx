import { useState, useEffect, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Phone, Tag, GripVertical, Plus, StickyNote, Trash2, Loader2, MessageCircle, Mail } from 'lucide-react';
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
    business_website: string | null;
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
    const { data, error } = await supabase
      .from('lead_notes')
      .insert({
        presentation_id: lead.id,
        user_id: user.id,
        content: newNote.trim(),
      } as never)
      .select('id, content, created_at')
      .single();

    if (error) {
      toast.error('Erro ao salvar nota');
    } else if (data) {
      setNotes((prev) => [data as LeadNote, ...prev]);
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
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
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
      className="group cursor-grab rounded-2xl border border-[#e6e6eb] bg-white p-3 shadow-[0_6px_18px_rgba(18,18,22,0.05)] transition-all hover:border-[#dedee5] hover:shadow-[0_10px_20px_rgba(18,18,22,0.08)] active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b1b1ba] opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-[#1A1A1A]">{lead.business_name || '-'}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[#8f8f97] transition-colors hover:bg-[#f4f4f7] hover:text-[#1A1A1A]"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {lead.business_category && (
            <div className="flex items-center gap-1 text-xs text-[#6f6f77]">
              <Tag className="h-3 w-3" />
              <span className="truncate">{lead.business_category}</span>
            </div>
          )}

          {lead.business_phone && (
            <div className="flex items-center gap-1 text-xs text-[#6f6f77]">
              <Phone className="h-3 w-3" />
              <span>{lead.business_phone}</span>
            </div>
          )}

          {lead.created_at && <p className="text-[10px] text-[#94949b]">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</p>}

          <div className="flex items-center gap-1 pt-1">
            {lead.business_phone && (
              <a
                href={`https://web.whatsapp.com/send?phone=${lead.business_phone.replace(/\D/g, '').startsWith('55') ? lead.business_phone.replace(/\D/g, '') : '55' + lead.business_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-lg bg-[#fff0f2] px-2 py-1 text-[10px] font-medium text-[#c4344c] transition-colors hover:bg-[#ffe4e8]"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </a>
            )}
            {lead.business_phone && (
              <a
                href={`mailto:?subject=Proposta - ${lead.business_name || ''}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-lg bg-[#f3f3f7] px-2 py-1 text-[10px] font-medium text-[#4e4e57] transition-colors hover:bg-[#ececf2]"
                title="Enviar e-mail"
              >
                <Mail className="h-3 w-3" />
                E-mail
              </a>
            )}
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2 border-t border-[#ececf0] pt-2">
                  <div className="flex items-center gap-1 text-xs font-semibold text-[#1A1A1A]">
                    <StickyNote className="h-3 w-3" />
                    Notas ({notes.length})
                  </div>

                  <div className="flex gap-1.5">
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Adicionar nota..."
                      className="h-7 rounded-lg border-[#e6e6eb] bg-[#fcfcfd] text-xs focus-visible:ring-[#EF3333]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddNote();
                      }}
                    />
                    <Button size="sm" className="h-7 rounded-lg px-2 gradient-primary text-primary-foreground" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                      {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>

                  {loadingNotes ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#8f8f97]" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="py-1 text-center text-[10px] text-[#a1a1aa]">Nenhuma nota</p>
                  ) : (
                    <div className="max-h-[140px] space-y-1.5 overflow-y-auto scrollbar-hidden">
                      {notes.map((note) => (
                        <div key={note.id} className="group/note rounded-lg border border-[#ececf0] bg-[#fafafd] p-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <p className="flex-1 break-words text-[11px] leading-relaxed text-[#1A1A1A]">{note.content}</p>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="flex h-4 w-4 shrink-0 items-center justify-center text-[#b0b0b8] opacity-0 transition-opacity hover:text-[#bc374e] group-hover/note:opacity-100"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <p className="mt-0.5 text-[9px] text-[#9b9ba3]">
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
