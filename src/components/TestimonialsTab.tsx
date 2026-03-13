import { useState, useEffect, useRef } from 'react';
import { Plus, X, Save, Upload, Trash2, Quote, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Testimonial {
  id: string;
  name: string;
  company: string;
  testimonial: string;
  image_url: string | null;
}

const TestimonialsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [testimonialText, setTestimonialText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchTestimonials();
  }, [user]);

  const fetchTestimonials = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('testimonials')
      .select('id, name, company, testimonial, image_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTestimonials(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setCompany('');
    setTestimonialText('');
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Maximo 2MB', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('testimonials').upload(path, file);
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data } = supabase.storage.from('testimonials').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim() || !testimonialText.trim()) {
      toast({ title: 'Preencha os campos obrigatorios', description: 'Nome e testemunho sao obrigatorios.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    let imageUrl: string | null = imagePreview && !imageFile ? imagePreview : null;

    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }

    const payload = {
      user_id: user.id,
      name: name.trim(),
      company: company.trim(),
      testimonial: testimonialText.trim(),
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('testimonials').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('testimonials').insert(payload));
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Testemunho atualizado!' : 'Testemunho adicionado!' });
      resetForm();
      fetchTestimonials();
    }
    setSaving(false);
  };

  const handleEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setName(t.name);
    setCompany(t.company);
    setTestimonialText(t.testimonial);
    setImagePreview(t.image_url);
    setImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Testemunho excluido' });
      fetchTestimonials();
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#66666d]">Adicione depoimentos de clientes para usar nas apresentacoes.</p>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="h-11 rounded-xl gap-2 gradient-primary text-primary-foreground glow-primary">
            <Plus className="h-4 w-4" />
            Novo Testemunho
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="space-y-4 rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1A1A1A]">{editingId ? 'Editar Testemunho' : 'Novo Testemunho'}</h3>
            <Button variant="ghost" size="icon" onClick={resetForm} className="rounded-xl hover:bg-[#f5f5f7]">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Foto (opcional)</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-[#ececf0]">
                {imagePreview ? (
                  <AvatarImage src={imagePreview} alt="Preview" />
                ) : (
                  <AvatarFallback className="bg-[#f5f5f7] text-[#71717a] text-lg">
                    {name ? name[0].toUpperCase() : '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 rounded-xl border-[#e6e6eb] bg-white gap-2 hover:bg-[#fff1f3] hover:text-[#EF3333]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {imagePreview ? 'Trocar' : 'Upload'}
                </Button>
                {imagePreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="h-10 rounded-xl border-[#f2d2d8] text-[#bc374e] hover:bg-[#fff1f3]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Joao Silva"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Empresa</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex: Tech Solutions"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Testemunho *</Label>
            <Textarea
              value={testimonialText}
              onChange={(e) => setTestimonialText(e.target.value)}
              placeholder="O que o cliente disse sobre seu servico..."
              className="min-h-[110px] rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="h-12 w-full rounded-xl gradient-primary text-primary-foreground font-semibold gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
          </Button>
        </Card>
      )}

      {testimonials.length === 0 && !showForm ? (
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-12 text-center shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <Quote className="mx-auto mb-3 h-10 w-10 text-[#d0d0d5]" />
          <p className="text-[#55555d]">Nenhum testemunho adicionado ainda.</p>
          <p className="mt-1 text-sm text-[#818189]">Adicione depoimentos dos seus clientes para enriquecer as apresentacoes.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {testimonials.map((t) => (
            <Card key={t.id} className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 shrink-0 border border-[#ececf0]">
                  {t.image_url ? (
                    <AvatarImage src={t.image_url} alt={t.name} />
                  ) : (
                    <AvatarFallback className="bg-[#f5f5f7] text-[#71717a]">{t.name[0]?.toUpperCase() || '?'}</AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-[#1A1A1A]">{t.name}</p>
                      {t.company && <p className="text-sm text-[#6c6c74]">{t.company}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-[#f5f5f7]" onClick={() => handleEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-[#fff1f3] hover:text-[#bc374e]"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm italic text-[#5f5f68]">"{t.testimonial}"</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestimonialsTab;
