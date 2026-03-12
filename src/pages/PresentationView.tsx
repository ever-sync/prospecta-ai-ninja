import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const PresentationView = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!publicId) { setError('ID inválido'); setLoading(false); return; }

      const { data, error: dbError } = await supabase
        .from('presentations')
        .select('presentation_html, status')
        .eq('public_id', publicId)
        .single();

      if (dbError || !data) {
        setError('Apresentação não encontrada');
      } else if (data.status !== 'ready') {
        setError('Apresentação ainda está sendo gerada');
      } else {
        setHtml(data.presentation_html);
        // Register view (fire and forget)
        supabase
          .from('presentation_views')
          .insert({ presentation_id: data.id } as any)
          .then(() => {});
      }
      setLoading(false);
    };
    load();
  }, [publicId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html || ''}
      className="w-full min-h-screen border-0"
      title="Apresentação"
      sandbox="allow-same-origin"
    />
  );
};

export default PresentationView;
