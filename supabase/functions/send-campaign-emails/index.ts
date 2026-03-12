const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get campaign
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();
    if (campErr || !campaign) throw new Error('Campaign not found');

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
      .select('id, public_id, business_name, business_phone, business_website')
      .in('id', presIds);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, email')
      .eq('user_id', user.id)
      .single();

    const senderName = profile?.company_name || 'Prospecta IA';
    const fromEmail = 'onboarding@resend.dev'; // Change to your verified domain

    let sentCount = 0;

    for (const pres of (presentations || [])) {
      // Try to extract email from business website or use a placeholder
      // In a real scenario, you'd have the business email stored
      const businessEmail = pres.business_website
        ? `contato@${new URL(pres.business_website.startsWith('http') ? pres.business_website : `https://${pres.business_website}`).hostname}`
        : null;

      if (!businessEmail) continue;

      const publicUrl = `${req.headers.get('origin') || 'https://prospecta-ai-ninja.lovable.app'}/presentation/${pres.public_id}`;

      const emailHtml = `
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
          <p style="color: #999; font-size: 12px;">
            Enviado por ${senderName} via Prospecta IA
          </p>
        </div>
      `;

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
            subject: `${pres.business_name} — Análise Digital Personalizada`,
            html: emailHtml,
          }),
        });

        if (resendResponse.ok) {
          const cpRow = cpRows.find(r => r.presentation_id === pres.id);
          if (cpRow) {
            await supabase
              .from('campaign_presentations')
              .update({ send_status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', cpRow.id);
          }
          sentCount++;
        } else {
          const errData = await resendResponse.json();
          console.error(`Failed to send to ${businessEmail}:`, errData);
          const cpRow = cpRows.find(r => r.presentation_id === pres.id);
          if (cpRow) {
            await supabase
              .from('campaign_presentations')
              .update({ send_status: 'failed' })
              .eq('id', cpRow.id);
          }
        }
      } catch (emailErr) {
        console.error(`Error sending email to ${businessEmail}:`, emailErr);
      }
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', campaign_id);

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
