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
    const { templateId, targetEmail, variables = {}, customSubject, customBody } = await req.json() as {
      templateId?: string;
      targetEmail: string;
      variables?: Record<string, string>;
      customSubject?: string;
      customBody?: string;
    };

    if (!targetEmail) {
      return new Response(
        JSON.stringify({ error: 'targetEmail is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let subject = customSubject;
    let body = customBody;

    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('message_templates')
        .select('subject, body')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        return new Response(
          JSON.stringify({ error: 'Template not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      subject = subject || template.subject;
      body = body || template.body;
    }

    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: 'Subject and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Replace variables
    const allVars: Record<string, string> = {
      ...variables,
    };

    const replaceVars = (text: string) =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key) => allVars[key] ?? `{{${key}}}`);

    const finalSubject = replaceVars(subject);
    const finalHtml = replaceVars(body).replace(/\n/g, '<br/>');

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'envPRO <noreply@prospecta.ai>',
        to: [targetEmail],
        subject: finalSubject,
        html: finalHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
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
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
