const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function scoreBucket(analysisData: any): 'low' | 'medium' | 'high' | 'unknown' {
  const score = analysisData?.scores?.overall;
  if (typeof score !== 'number') return 'unknown';
  if (score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

function getQueryContextFromReferer(referer: string | null) {
  if (!referer) return {};
  try {
    const url = new URL(referer);
    return {
      cid: url.searchParams.get('cid'),
      cpid: url.searchParams.get('cpid'),
      tid: url.searchParams.get('tid'),
      vid: url.searchParams.get('vid'),
      ch: url.searchParams.get('ch'),
      src: url.searchParams.get('src'),
    };
  } catch {
    return {};
  }
}

async function insertUniqueConversionEvent(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) {
  let query = supabase
    .from('message_conversion_events')
    .select('id')
    .eq('presentation_id', payload.presentation_id as string)
    .eq('event_type', payload.event_type as string)
    .limit(1);

  const campaignPresentationId = payload.campaign_presentation_id as string | null | undefined;
  if (campaignPresentationId) {
    query = query.eq('campaign_presentation_id', campaignPresentationId);
  } else {
    query = query.is('campaign_presentation_id', null);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) return false;

  const { error } = await supabase.from('message_conversion_events').insert(payload);
  if (error) throw error;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { public_id, response } = body;

    if (!public_id || !response || !['accepted', 'rejected'].includes(response)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: presentation, error: presError } = await supabase
      .from('presentations')
      .select('id, user_id, pipeline_stage_id, business_category, analysis_data, business_name')
      .eq('public_id', public_id)
      .maybeSingle();

    if (presError || !presentation) {
      return new Response(JSON.stringify({ error: 'Presentation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: attemptContext } = await supabase
      .from('campaign_message_attempts')
      .select('campaign_id, campaign_presentation_id, template_id, variant_id, channel')
      .eq('presentation_id', presentation.id)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const refererContext = getQueryContextFromReferer(req.headers.get('referer'));

    const campaignId = body.campaign_id || refererContext.cid || attemptContext?.campaign_id || null;
    const campaignPresentationId = body.campaign_presentation_id || refererContext.cpid || attemptContext?.campaign_presentation_id || null;
    const templateId = body.template_id || refererContext.tid || attemptContext?.template_id || null;
    const variantId = body.variant_id || refererContext.vid || attemptContext?.variant_id || null;
    const channel = body.channel || refererContext.ch || attemptContext?.channel || 'unknown';
    const source = body.source || refererContext.src || 'respond_presentation';
    const score = scoreBucket(presentation.analysis_data);

    const clickedEvent = response === 'accepted' ? 'clicked_accept' : 'clicked_reject';
    await insertUniqueConversionEvent(supabase, {
      event_type: clickedEvent,
      presentation_id: presentation.id,
      user_id: presentation.user_id,
      campaign_id: campaignId,
      campaign_presentation_id: campaignPresentationId,
      template_id: templateId,
      variant_id: variantId,
      channel,
      pipeline_stage_id: presentation.pipeline_stage_id,
      niche: presentation.business_category,
      score_bucket: score,
      source,
      metadata: {
        public_id,
        response,
        user_agent: req.headers.get('user-agent'),
      },
    });

    const { error } = await supabase
      .from('presentations')
      .update({ lead_response: response })
      .eq('public_id', public_id);

    if (error) throw error;

    await insertUniqueConversionEvent(supabase, {
      event_type: response,
      presentation_id: presentation.id,
      user_id: presentation.user_id,
      campaign_id: campaignId,
      campaign_presentation_id: campaignPresentationId,
      template_id: templateId,
      variant_id: variantId,
      channel,
      pipeline_stage_id: presentation.pipeline_stage_id,
      niche: presentation.business_category,
      score_bucket: score,
      source,
      metadata: {
        public_id,
        response,
        user_agent: req.headers.get('user-agent'),
      },
    });

    // Notify presentation owner when lead accepts
    if (response === 'accepted') {
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', presentation.user_id)
        .maybeSingle();
      if (ownerData?.email) {
        await supabase.functions.invoke('send-system-email', {
          body: {
            type: 'proposal_accepted',
            user_email: ownerData.email,
            variables: {
              empresa_prospectada: (presentation as any).business_name ?? presentation.business_category ?? 'Lead',
            },
          },
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ success: true, response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Respond error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save response' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
