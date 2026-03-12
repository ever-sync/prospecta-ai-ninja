import { useState, useEffect, useRef } from 'react';
import { Plus, X, Save, Upload, Trash2, Quote } from 'lucide-react';
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

  // Form fields
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
      toast({ title: 'Imagem muito grande', description: 'Máximo 2MB', variant: 'destructive' });
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
      toast({ title: 'Preencha os campos obrigatórios', description: 'Nome e testemunho são obrigatórios.', variant: 'destructive' });
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
      toast({ title: 'Testemunho excluído' });
      fetchTestimonials();
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Adicione depoimentos de clientes para usar nas apresentações.
        </p>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2 gradient-primary text-primary-foreground glow-primary">
            <Plus className="w-4 h-4" />
            Novo Testemunho
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6 bg-card border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {editingId ? 'Editar Testemunho' : 'Novo Testemunho'}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Foto (opcional)</Label>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-border">
                {imagePreview ? (
                  <AvatarImage src={imagePreview} alt="Preview" />
                ) : (
                  <AvatarFallback className="bg-secondary text-muted-foreground text-lg">
                    {name ? name[0].toUpperCase() : '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {imagePreview ? 'Trocar' : 'Upload'}
                </Button>
                {imagePreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João Silva"
              className="bg-secondary border-border"
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Empresa</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex: Tech Solutions Ltda"
              className="bg-secondary border-border"
            />
          </div>

          {/* Testimonial text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Testemunho *</Label>
            <Textarea
              value={testimonialText}
              onChange={(e) => setTestimonialText(e.target.value)}
              placeholder="O que o cliente disse sobre seu serviço..."
              className="bg-secondary border-border min-h-[100px]"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gradient-primary text-primary-foreground font-semibold py-5 glow-primary gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
          </Button>
        </Card>
      )}

      {/* Testimonials list */}
      {testimonials.length === 0 && !showForm ? (
        <Card className="p-12 bg-card border-border text-center">
          <Quote className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum testemunho adicionado ainda.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Adicione depoimentos dos seus clientes para enriquecer as apresentações.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {testimonials.map((t) => (
            <Card key={t.id} className="p-5 bg-card border-border">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12 border border-border shrink-0">
                  {t.image_url ? (
                    <AvatarImage src={t.image_url} alt={t.name} />
                  ) : (
                    <AvatarFallback className="bg-secondary text-muted-foreground">
                      {t.name[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{t.name}</p>
                      {t.company && (
                        <p className="text-sm text-muted-foreground">{t.company}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}>
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 italic">"{t.testimonial}"</p>
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
