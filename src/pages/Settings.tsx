import { useState, useEffect } from 'react';
import { Save, Upload, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCompanyName(data.company_name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setLogoUrl(data.company_logo_url || '');
        }
      });
  }, [user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;

    const { error } = await supabase.storage
      .from('company-logos')
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(path);
      setLogoUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: companyName,
        email,
        phone,
        company_logo_url: logoUrl,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salvo!', description: 'Configurações atualizadas com sucesso.' });
    }
    setSaving(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        Configurações da Empresa
      </h1>

      <Card className="p-6 bg-card border-border space-y-6">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Logo da Empresa</Label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Upload'}
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-sm text-foreground">Nome da Empresa</Label>
          <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sua empresa" className="bg-secondary border-border" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="settingsEmail" className="text-sm text-foreground">Email</Label>
          <Input id="settingsEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" className="bg-secondary border-border" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="settingsPhone" className="text-sm text-foreground">Telefone</Label>
          <Input id="settingsPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="bg-secondary border-border" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground font-semibold py-5 glow-primary gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </Card>
    </div>
  );
};

export default Settings;
