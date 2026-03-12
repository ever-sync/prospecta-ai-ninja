import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ClientLogo {
  id: string;
  company_name: string;
  logo_url: string;
}

const ClientLogosTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logos, setLogos] = useState<ClientLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchLogos();
  }, [user]);

  const fetchLogos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('client_logos')
      .select('id, company_name, logo_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLogos(data || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Máximo 2MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('client-logos').upload(path, file);
    if (uploadError) {
      toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('client-logos').getPublicUrl(path);

    const { error: insertError } = await supabase.from('client_logos').insert({
      user_id: user.id,
      company_name: companyName.trim() || 'Sem nome',
      logo_url: urlData.publicUrl,
    });

    if (insertError) {
      toast({ title: 'Erro ao salvar', description: insertError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Logo adicionado!' });
      setCompanyName('');
      fetchLogos();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('client_logos').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Logo removido' });
      fetchLogos();
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Adicione logos de empresas que você já atendeu. Eles aparecerão nas apresentações como prova de experiência.
      </p>

      {/* Upload form */}
      <Card className="p-6 bg-card border-border space-y-4">
        <h3 className="font-semibold text-foreground">Adicionar Logo</h3>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Nome da Empresa</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex: Magazine Luiza"
            className="bg-secondary border-border"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 gradient-primary text-primary-foreground glow-primary gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Enviando...' : 'Selecionar Logo'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </Card>

      {/* Gallery */}
      {logos.length === 0 ? (
        <Card className="p-12 bg-card border-border text-center">
          <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum logo adicionado ainda.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Adicione logos dos seus clientes para mostrar credibilidade nas apresentações.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {logos.map((logo) => (
            <Card key={logo.id} className="p-4 bg-card border-border group relative flex flex-col items-center gap-3">
              <div className="w-full aspect-square bg-secondary rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={logo.logo_url}
                  alt={logo.company_name}
                  className="max-w-full max-h-full object-contain p-2"
                />
              </div>
              <p className="text-sm font-medium text-foreground text-center truncate w-full">
                {logo.company_name}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(logo.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientLogosTab;
