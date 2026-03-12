const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysis, business, dna, profile, testimonials, clientLogos, template, tone: requestedTone, customInstructions, publicId } = await req.json();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const respondFnUrl = `${SUPABASE_URL}/functions/v1/respond-presentation`;

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

    // Build services section
    const services = (dna?.services || []).join(', ') || 'Serviços não informados';
    const differentials = (dna?.differentials || []).join(', ') || 'Não informado';
    const valueProposition = dna?.value_proposition || 'Não informado';
    const targetAudience = dna?.target_audience || 'Não informado';
    const additionalInfo = dna?.additional_info || '';
    const portfolioUrl = dna?.portfolio_url || '';
    const instagramUrl = dna?.instagram_url || '';
    const linkedinUrl = dna?.linkedin_url || '';

    // Build WhatsApp link
    const rawPhone = profile?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const whatsappUrl = cleanPhone ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Vi a apresentação da ${companyName} sobre minha empresa ${business.name} e gostaria de receber mais informações.`)}` : '';

    // Build testimonials section
    let testimonialsBlock = '';
    if (testimonials && testimonials.length > 0) {
      testimonialsBlock = `\n\nDEPOIMENTOS DE CLIENTES (incluir na apresentação como prova social):
${testimonials.map((t: any, i: number) => `${i + 1}. "${t.testimonial}" — ${t.name}${t.company ? `, ${t.company}` : ''}${t.image_url ? ` (foto: ${t.image_url})` : ''}`).join('\n')}`;
    }

    // Build client logos section
    let clientLogosBlock = '';
    if (clientLogos && clientLogos.length > 0) {
      clientLogosBlock = `\n\nLOGOS DE CLIENTES (incluir na apresentação como seção "Empresas que confiam em nós" ou "Nossos Clientes"):
Exibir os logos em uma faixa horizontal centralizada, com espaçamento uniforme. Cada logo deve ter max-height de 50px e ser exibido com <img> tag. Se houver nome da empresa, usar como alt text.
${clientLogos.map((l: any, i: number) => `${i + 1}. ${l.company_name || 'Cliente'}: ${l.logo_url}`).join('\n')}`;
    }

    const systemPrompt = `Você é um especialista em criar apresentações comerciais de vendas persuasivas. Seu objetivo é gerar uma apresentação HTML que VENDA os serviços da empresa prospectora para o lead analisado.

OBJETIVO PRINCIPAL: A apresentação deve convencer o lead (empresa analisada) de que ele PRECISA contratar os serviços da empresa prospectora. Use os dados da análise para mostrar problemas e oportunidades, e então posicione os serviços como a solução ideal.

ESTILO VISUAL: ${styleGuide}

TOM DE COMUNICAÇÃO: ${toneGuide}

${customInstructions ? `INSTRUÇÕES ADICIONAIS DO USUÁRIO: ${customInstructions}` : ''}

ESTRUTURA OBRIGATÓRIA DA APRESENTAÇÃO:
1. **Header** — Logo e nome da empresa prospectora (quem está vendendo)
2. **Saudação personalizada** — Dirigida ao lead pelo nome, mencionando o setor dele
3. **Diagnóstico do Lead** — Resumo dos problemas encontrados na análise (scores, SEO, velocidade, etc.) apresentados de forma que o lead entenda o impacto no seu negócio
4. **Scores visuais** — Barras de progresso coloridas mostrando os scores (vermelho=ruim, amarelo=médio, verde=bom)
${analysis?.google_maps_screenshot ? `4.5. **Screenshot do Google Maps** — Incluir a imagem do Google Maps da empresa analisada usando a tag <img> com src="data:image/png;base64,GOOGLE_MAPS_SCREENSHOT_PLACEHOLDER". Adicionar borda arredondada e sombra. Título: "Presença no Google Maps"` : `4.5. **Presença no Google Maps (fallback visual)** — Como não há screenshot disponível, criar um card visual estilizado com:
   - Ícone do Google Maps (usar SVG inline do pin do Google Maps ou emoji 📍)
   - Nome da empresa: "${business.name}"
   - Rating: ${business.rating ? `${business.rating} estrelas (usar estrelas ★ amarelas preenchidas e ☆ vazias)` : 'Sem avaliação disponível'}
   - Categoria: "${business.category || 'Não informada'}"
   - Endereço: "${business.address || 'Não informado'}"
   - Estilo: card com borda, fundo levemente diferente, cantos arredondados, sombra suave. Título: "Presença no Google Maps"`}
${analysis?.website_screenshot ? `4.6. **Screenshot do Site Atual** — Incluir a imagem do site da empresa analisada usando a tag <img> com src="data:image/png;base64,WEBSITE_SCREENSHOT_PLACEHOLDER". Adicionar borda arredondada, sombra e um título "Seu Site Atual". Pode incluir anotações visuais (setas ou marcações) mencionadas no texto sobre problemas encontrados.` : `4.6. **Site Atual (fallback visual)** — Como não há screenshot do site, criar um card visual com:
   - Ícone de globo/website (🌐)
   - URL: "${business.website || 'Sem site cadastrado'}"
   - ${business.website ? 'Mensagem: "Não foi possível capturar o visual do site. Acesse o link para verificar."' : 'Mensagem: "Esta empresa não possui um site — uma grande oportunidade de mercado!"'}
   - Estilo: card com borda, cantos arredondados, sombra suave. Título: "Site Atual"`}
5. **Problemas detalhados e Oportunidades** — Para cada área problemática, explicar o impacto em linguagem de negócio (ex: "Seu site demora 8s para carregar — isso faz você perder 53% dos visitantes")
6. **A Solução: Nossos Serviços** — Apresentar CADA serviço da empresa prospectora como solução direta para os problemas identificados. Conectar serviço → problema → benefício
7. **Nossos Diferenciais** — Por que escolher esta empresa e não outra
8. **Proposta de Valor** — A promessa principal da empresa prospectora
${portfolioUrl ? `8.5. **Botão Portfólio** — Incluir um botão estilizado "📂 Acessar Portfólio" que abre o link "${portfolioUrl}" em nova aba (target="_blank"). Estilo: botão com borda, cor accent do template, cantos arredondados, centralizado, com ícone. Colocar abaixo da proposta de valor.` : ''}
${(instagramUrl || linkedinUrl) ? `8.6. **Redes Sociais** — No rodapé ou após a proposta de valor, incluir ícones/links para as redes sociais:
${instagramUrl ? `   - Instagram: link "${instagramUrl}" com ícone do Instagram (usar SVG inline simples ou emoji 📸)` : ''}
${linkedinUrl ? `   - LinkedIn: link "${linkedinUrl}" com ícone do LinkedIn (usar SVG inline simples ou emoji 💼)` : ''}
   Estilo: ícones lado a lado, centralizados, com hover effect sutil. Abrir em nova aba.` : ''}
${clientLogosBlock ? `${testimonialsBlock ? '9' : '9'}. **Nossos Clientes** — Seção "Empresas que confiam em nós" com os logos dos clientes dispostos em faixa horizontal centralizada` : ''}
${testimonialsBlock ? `${clientLogosBlock ? '10' : '9'}. **Depoimentos de Clientes** — Seção com os depoimentos reais (com foto se disponível), mostrando resultados de outros clientes` : ''}
${(() => { const next = 9 + (clientLogosBlock ? 1 : 0) + (testimonialsBlock ? 1 : 0); return `${next}`; })()}. **Seção de Resposta com DOIS botões lado a lado**:
   - Botão "✅ Aceito Receber Contato" — verde (#25D366), grande, que ao clicar executa um fetch POST para "${respondFnUrl}" com body JSON {"public_id":"PUBLIC_ID_PLACEHOLDER","response":"accepted"} e depois redireciona para a URL do WhatsApp: ${whatsappUrl || '[sem telefone]'}
   - Botão "❌ Recusar Proposta" — vermelho/cinza escuro, mesmo tamanho, que ao clicar executa um fetch POST para "${respondFnUrl}" com body JSON {"public_id":"PUBLIC_ID_PLACEHOLDER","response":"rejected"} e mostra mensagem "Obrigado pelo retorno. Se mudar de ideia, entre em contato!"
   
   IMPORTANTE: Use JavaScript inline nos onclick dos botões. Após o fetch, desabilite ambos os botões e mostre feedback visual. Use o texto PUBLIC_ID_PLACEHOLDER como placeholder — ele será substituído pelo ID real.
   Abaixo dos botões colocar texto "Seu feedback é importante para nós".

Use CSS inline e HTML puro (sem frameworks). Garanta que fique bonito e profissional em qualquer navegador.
Retorne APENAS o HTML completo, começando com <!DOCTYPE html>.`;

    const userPrompt = `Gere a apresentação HTML de vendas:

EMPRESA QUE ESTÁ VENDENDO (prospectora):
- Nome: ${companyName}
- Logo URL: ${logoUrl || 'Sem logo'}
- Serviços oferecidos: ${services}
- Diferenciais: ${differentials}
- Proposta de valor: ${valueProposition}
- Público-alvo: ${targetAudience}
- Informações adicionais: ${additionalInfo}
- Portfólio URL: ${portfolioUrl || 'Não informado'}
- Instagram: ${instagramUrl || 'Não informado'}
- LinkedIn: ${linkedinUrl || 'Não informado'}
- Telefone/contato: ${profile?.phone || 'Não informado'}
- Email: ${profile?.email || 'Não informado'}
- WhatsApp URL para CTA: ${whatsappUrl || 'Sem telefone cadastrado'}
${testimonialsBlock}
${clientLogosBlock}

LEAD (empresa analisada — potencial cliente):
- Nome: ${business.name}
- Endereço: ${business.address}
- Telefone: ${business.phone}
- Site: ${business.website || 'Sem site'}
- Categoria/Setor: ${business.category}
- Rating Google: ${business.rating || 'N/A'}

ANÁLISE TÉCNICA DO LEAD (use para mostrar os problemas e vender a solução):
${JSON.stringify(analysis, null, 2)}

IMPORTANTE: A apresentação deve posicionar os serviços "${services}" como a solução para os problemas encontrados na análise. Cada problema deve ser conectado a um serviço específico. A apresentação é uma ferramenta de VENDAS.

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

    // Replace placeholders
    if (publicId) {
      html = html.replaceAll('PUBLIC_ID_PLACEHOLDER', publicId);
    }
    if (analysis?.google_maps_screenshot) {
      html = html.replaceAll('GOOGLE_MAPS_SCREENSHOT_PLACEHOLDER', analysis.google_maps_screenshot);
    }
    if (analysis?.website_screenshot) {
      html = html.replaceAll('WEBSITE_SCREENSHOT_PLACEHOLDER', analysis.website_screenshot);
    }

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
