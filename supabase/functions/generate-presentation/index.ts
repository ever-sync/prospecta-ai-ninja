const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysis, business, dna, profile, template, tone: requestedTone, customInstructions } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const companyName = profile?.company_name || 'Nossa Empresa';
    const logoUrl = profile?.company_logo_url || '';

    const templateStyles: Record<string, string> = {
      'modern-dark': 'Fundo escuro (#0a0a0f), accent indigo (#6366f1), tipografia moderna, bordas arredondadas, visual tech.',
      'clean-light': 'Fundo branco (#ffffff), texto escuro (#1a1a2e), accent azul (#3b82f6), tipografia elegante serif, muito espaço em branco, minimalista.',
      'corporate': 'Fundo cinza claro (#f8f9fa), accent azul corporativo (#1e40af), layout formal com seções bem delimitadas, estilo enterprise.',
      'bold-gradient': 'Gradientes fortes (roxo para azul), tipografia grande e impactante, cards com glassmorphism, visual ousado.',
    };

    const toneDescriptions: Record<string, string> = {
      'professional': 'Tom profissional e objetivo, focado em dados e resultados.',
      'consultive': 'Tom consultivo e educativo, explicando o "porquê" de cada recomendação.',
      'urgent': 'Tom urgente, destacando riscos e oportunidades perdidas, criando senso de urgência.',
      'friendly': 'Tom amigável e acessível, usando linguagem simples e encorajadora.',
      'technical': 'Tom técnico e detalhado, com termos específicos da área e métricas aprofundadas.',
    };

    const selectedTemplate = template || 'modern-dark';
    const selectedTone = requestedTone || dna?.tone || 'professional';
    const styleGuide = templateStyles[selectedTemplate] || templateStyles['modern-dark'];
    const toneGuide = toneDescriptions[selectedTone] || toneDescriptions['professional'];

    const systemPrompt = `Você é um designer de apresentações comerciais. Gere HTML completo e estilizado para uma apresentação de prospecção.

ESTILO VISUAL: ${styleGuide}

TOM DE COMUNICAÇÃO: ${toneGuide}

${customInstructions ? `INSTRUÇÕES ADICIONAIS DO USUÁRIO: ${customInstructions}` : ''}

A apresentação deve ser responsiva e incluir:
1. Header com logo/nome da empresa que prospecta
2. Resumo executivo
3. Scores visuais (barras de progresso coloridas)
4. Detalhes de SEO, velocidade, layout, segurança
5. Recomendações priorizadas
6. Call-to-action final

Use CSS inline e HTML puro (sem frameworks). Garanta que fique bonito em qualquer navegador.
Retorne APENAS o HTML completo, começando com <!DOCTYPE html>.`;

    const userPrompt = `Gere a apresentação HTML para:

EMPRESA PROSPECTORA:
- Nome: ${companyName}
- Logo URL: ${logoUrl || 'Sem logo'}
- Serviços: ${(dna?.services || []).join(', ') || 'Marketing Digital'}
- Diferenciais: ${(dna?.differentials || []).join(', ') || 'Não informado'}
- Proposta de valor: ${dna?.value_proposition || 'Não informado'}

EMPRESA ANALISADA:
- Nome: ${business.name}
- Endereço: ${business.address}
- Telefone: ${business.phone}
- Site: ${business.website || 'Sem site'}
- Categoria: ${business.category}
- Rating: ${business.rating || 'N/A'}

ANÁLISE:
${JSON.stringify(analysis, null, 2)}

Gere o HTML completo da apresentação.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let html = aiData.choices?.[0]?.message?.content || '';

    // Clean up markdown code fences if present
    html = html.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

    return new Response(JSON.stringify({ success: true, html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Generate presentation error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Generation failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
