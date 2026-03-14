const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function resolveBaseOrigin(domain: string | null | undefined, requestOrigin: string | null): string {
  const fallback = requestOrigin || 'https://envpro.com.br';
  const value = (domain || '').trim().replace(/\/+$/, '');
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

async function logApiUsage(userId: string, service: string, operation: string, costCents: number, metadata: Record<string, any> = {}) {
  try {
    const svc = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    await svc.from('api_usage_logs').insert({
      user_id: userId, service, operation,
      cost_estimate_cents: costCents, metadata,
    });
  } catch (e) { console.error('Failed to log API usage:', e); }
}

function scoreBucket(analysisData: any): 'low' | 'medium' | 'high' | 'unknown' {
  const score = analysisData?.scores?.overall;
  if (typeof score !== 'number') return 'unknown';
  if (score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error('campaign_id is required');

    // Get campaign with template_id
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();
    if (campErr || !campaign) throw new Error('Campaign not found');

    // Fetch template if set
    let template: { body: string; subject: string; image_url: string; include_proposal_link: boolean } | null = null;
    if (campaign.template_id) {
      const { data: tpl } = await supabase
        .from('message_templates')
        .select('body, subject, image_url, include_proposal_link')
        .eq('id', campaign.template_id)
        .single();
      template = tpl as any;
    }

    // Get pending campaign presentations
    const { data: cpRows } = await supabase
      .from('campaign_presentations')
      .select('id, presentation_id')
      .eq('campaign_id', campaign_id)
      .eq('send_status', 'pending');

    if (!cpRows || cpRows.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No pending presentations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get presentations with business details
    const presIds = cpRows.map(r => r.presentation_id);
    const { data: presentations } = await supabase
      .from('presentations')
      .select('id, public_id, user_id, pipeline_stage_id, business_name, business_phone, business_email, business_website, business_address, business_category, business_rating, analysis_data')
      .in('id', presIds);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, email, campaign_sender_email, campaign_sender_name, proposal_link_domain')
      .eq('user_id', user.id)
      .single();

    const senderName = profile?.campaign_sender_name || profile?.company_name || 'envPRO';
    const fromEmail = profile?.campaign_sender_email || 'onboarding@resend.dev';
    const baseOrigin = resolveBaseOrigin(profile?.proposal_link_domain, req.headers.get('origin'));

    const replaceVariables = (text: string, pres: any, publicUrl: string) => {
      return text
        .replace(/\{\{nome_empresa\}\}/g, pres.business_name || '')
        .replace(/\{\{categoria\}\}/g, pres.business_category || '')
        .replace(/\{\{endereco\}\}/g, pres.business_address || '')
        .replace(/\{\{telefone\}\}/g, pres.business_phone || '')
        .replace(/\{\{website\}\}/g, pres.business_website || '')
        .replace(/\{\{rating\}\}/g, pres.business_rating?.toString() || '')
        .replace(/\{\{score\}\}/g, (pres.analysis_data as any)?.scores?.overall?.toString() || '')
        .replace(/\{\{link_proposta\}\}/g, publicUrl)
        .replace(/\{\{sua_empresa\}\}/g, senderName);
    };

    let sentCount = 0;

    for (const pres of (presentations || [])) {
      const businessEmail = pres.business_email || null;
      const cpRow = cpRows.find(r => r.presentation_id === pres.id);

      if (!businessEmail) continue;
      if (!cpRow) continue;

      const tracked = new URLSearchParams({
        cid: campaign_id,
        cpid: cpRow.id,
        ch: 'email',
        src: 'campaign_email',
      });
      if (campaign.template_id) {
        tracked.set('tid', campaign.template_id);
        tracked.set('vid', campaign.template_id);
      }
      const publicUrl = `${baseOrigin}/presentation/${pres.public_id}?${tracked.toString()}`;

      let emailSubject: string;
      let emailHtml: string;

      if (template) {
        emailSubject = replaceVariables(template.subject || `${pres.business_name} — Análise Digital Personalizada`, pres, publicUrl);
        const bodyContent = replaceVariables(template.body, pres, publicUrl);
        
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${template.image_url ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${template.image_url}" alt="" style="max-width: 100%; max-height: 200px; border-radius: 8px;" /></div>` : ''}
            <div style="color: #444; line-height: 1.8; font-size: 15px; white-space: pre-wrap;">${bodyContent}</div>
            ${template.include_proposal_link ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${publicUrl}" 
                   style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  📊 Ver Apresentação
                </a>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">Enviado por ${senderName} via envPRO</p>
          </div>
        `;
      } else {
        emailSubject = `${pres.business_name} — Análise Digital Personalizada`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">Olá, ${pres.business_name}!</h2>
            <p style="color: #444; line-height: 1.6;">
              Sou da <strong>${senderName}</strong> e preparamos uma apresentação exclusiva para sua empresa, 
              com uma análise completa da sua presença digital e oportunidades de crescimento.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${publicUrl}" 
                 style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                📊 Ver Apresentação
              </a>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              Dentro da apresentação você poderá ver um diagnóstico completo e, caso tenha interesse, 
              aceitar receber nosso contato diretamente pelo WhatsApp.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">Enviado por ${senderName} via envPRO</p>
          </div>
        `;
      }

      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${senderName} <${fromEmail}>`,
            to: [businessEmail],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (resendResponse.ok) {
          const sentAt = new Date().toISOString();
          await supabase
            .from('campaign_presentations')
            .update({
              send_status: 'sent',
              sent_at: sentAt,
              delivery_status: 'sent',
              last_status_at: sentAt,
              variant_id: campaign.template_id || null,
            })
            .eq('id', cpRow.id);

          await supabase.from('campaign_message_attempts').insert({
            user_id: user.id,
            campaign_presentation_id: cpRow.id,
            campaign_id,
            presentation_id: pres.id,
            template_id: campaign.template_id || null,
            variant_id: campaign.template_id || null,
            channel: 'email',
            send_mode: 'api',
            provider: 'resend',
            status: 'sent',
            sent_at: sentAt,
            metadata: { channel: 'email' },
          });

          await supabase.from('message_conversion_events').insert({
            event_type: 'sent',
            presentation_id: pres.id,
            user_id: pres.user_id,
            campaign_id,
            campaign_presentation_id: cpRow.id,
            template_id: campaign.template_id || null,
            variant_id: campaign.template_id || null,
            channel: 'email',
            pipeline_stage_id: pres.pipeline_stage_id || null,
            niche: pres.business_category || null,
            score_bucket: scoreBucket(pres.analysis_data),
            source: 'send_campaign_emails',
            metadata: { provider: 'resend' },
          });
          sentCount++;
        } else {
          const errData = await resendResponse.json();
          console.error(`Failed to send to ${businessEmail}:`, errData);
          await supabase
            .from('campaign_presentations')
            .update({ send_status: 'failed' })
            .eq('id', cpRow.id);
        }
      } catch (emailErr) {
        console.error(`Error sending email to ${businessEmail}:`, emailErr);
      }
    }

    // Log API usage
    if (sentCount > 0) {
      await logApiUsage(user!.id, 'resend', 'send_email', sentCount * 0.1, { campaign_id, sentCount });
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', campaign_id);

    // Notify campaign owner
    if (user.email && sentCount > 0) {
      const svcClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
      );
      await svcClient.functions.invoke('send-system-email', {
        body: {
          type: 'campaign_started',
          user_email: user.email,
          variables: {
            nome_campanha: campaign.name ?? 'Campanha',
            total_enviados: String(sentCount),
          },
        },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send campaign emails error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
