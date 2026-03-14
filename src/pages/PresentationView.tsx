import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { sanitizePresentationHtml } from '@/lib/presentation-html';
import { selectFirstRow } from '@/lib/supabase/select-first-row';
import { Loader2 } from 'lucide-react';

const getScoreBucket = (analysisData: any): 'low' | 'medium' | 'high' | 'unknown' => {
  const score = analysisData?.scores?.overall;
  if (typeof score !== 'number') return 'unknown';
  if (score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
};

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
        .select('id, user_id, business_category, analysis_data, pipeline_stage_id, presentation_html, status')
        .eq('public_id', publicId)
        .single();

      if (dbError || !data) {
        setError('Apresentação não encontrada');
      } else if (data.status !== 'ready') {
        setError('Apresentação ainda está sendo gerada');
      } else {
        const profile = await selectFirstRow(
          supabase
            .from('profiles')
            .select('company_name, company_logo_url')
            .eq('id', data.user_id),
        );
        const analysisData = (data.analysis_data as Record<string, unknown> | null) || null;

        setHtml(
          sanitizePresentationHtml(data.presentation_html || '', {
            companyName: profile?.company_name || 'Nossa Empresa',
            logoSrc: profile?.company_logo_url || null,
            googleMapsScreenshot: typeof analysisData?.google_maps_screenshot === 'string'
              ? analysisData.google_maps_screenshot
              : null,
            websiteScreenshot: typeof analysisData?.website_screenshot === 'string'
              ? analysisData.website_screenshot
              : null,
          }),
        );
        // Register view (fire and forget)
        supabase
          .from('presentation_views')
          .insert({ presentation_id: data.id } as any)
          .then(() => {});

        const params = new URLSearchParams(window.location.search);
        const campaignId = params.get('cid');
        const campaignPresentationId = params.get('cpid');
        const templateId = params.get('tid');
        const variantId = params.get('vid');
        const channel = params.get('ch') || 'unknown';
        const source = params.get('src') || 'presentation_view';

        supabase
          .from('message_conversion_events')
          .insert({
            event_type: 'opened',
            presentation_id: data.id,
            user_id: data.user_id,
            campaign_id: campaignId || null,
            campaign_presentation_id: campaignPresentationId || null,
            template_id: templateId || null,
            variant_id: variantId || null,
            channel,
            pipeline_stage_id: data.pipeline_stage_id || null,
            niche: data.business_category || null,
            score_bucket: getScoreBucket(data.analysis_data),
            source,
            metadata: {
              public_id: publicId,
            },
          } as any)
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
      sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
    />
  );
};

export default PresentationView;
