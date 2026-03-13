import { useState, useEffect, useRef } from 'react';
import { Trash2, Upload, ImageIcon } from 'lucide-react';
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
      toast({ title: 'Imagem muito grande', description: 'Maximo 2MB', variant: 'destructive' });
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
    return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#66666d]">
        Adicione logos de empresas que voce ja atendeu. Eles aparecerao nas apresentacoes como prova de experiencia.
      </p>

      <Card className="space-y-4 rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
        <h3 className="text-base font-semibold text-[#1A1A1A]">Adicionar Logo</h3>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Nome da Empresa</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex: Magazine Luiza"
            className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-11 flex-1 rounded-xl gradient-primary text-primary-foreground glow-primary gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Enviando...' : 'Selecionar Logo'}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </Card>

      {logos.length === 0 ? (
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-12 text-center shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-[#d0d0d5]" />
          <p className="text-[#55555d]">Nenhum logo adicionado ainda.</p>
          <p className="mt-1 text-sm text-[#818189]">Adicione logos dos seus clientes para mostrar credibilidade nas apresentacoes.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {logos.map((logo) => (
            <Card key={logo.id} className="group relative flex flex-col items-center gap-3 rounded-[20px] border border-[#ececf0] bg-white p-4 shadow-[0_8px_20px_rgba(18,18,22,0.05)]">
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-[#f0f0f3] bg-[#fafafb]">
                <img src={logo.logo_url} alt={logo.company_name} className="max-h-full max-w-full object-contain p-2" />
              </div>
              <p className="w-full truncate text-center text-sm font-medium text-[#1A1A1A]">{logo.company_name}</p>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7 rounded-lg opacity-0 transition-opacity text-muted-foreground hover:bg-[#fff1f3] hover:text-[#bc374e] group-hover:opacity-100"
                onClick={() => handleDelete(logo.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientLogosTab;
