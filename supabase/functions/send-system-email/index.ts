import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { type, user_email, variables = {} } = await req.json() as {
      type: string;
      user_email: string;
      variables?: Record<string, string>;
    };

    if (!type || !user_email) {
      return new Response(
        JSON.stringify({ error: 'type and user_email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('system_email_templates')
      .select('subject, body_html')
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle();

    if (templateError || !template) {
      console.error('Template not found or inactive:', type, templateError);
      return new Response(
        JSON.stringify({ error: 'Template not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Add default variables
    const allVars: Record<string, string> = {
      link_dashboard: `${SUPABASE_URL.replace('.supabase.co', '').replace('https://', 'https://').replace('supabase.co', 'vercel.app')}`,
      ...variables,
    };

    // Replace variables in subject and body
    const replaceVars = (text: string) =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key) => allVars[key] ?? `{{${key}}}`);

    const subject = replaceVars(template.subject);
    const html = replaceVars(template.body_html);

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Prospecta IA <noreply@prospecta.ai>',
        to: [user_email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
