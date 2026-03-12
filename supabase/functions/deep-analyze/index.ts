import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business, dna, profile } = await req.json();

    if (!business) {
      return new Response(JSON.stringify({ error: 'Business data is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    // Step 1: Scrape website if available
    let scrapedContent = null;
    if (business.website && FIRECRAWL_API_KEY) {
      try {
        let url = business.website.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }

        console.log('Scraping website:', url);
        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats: ['markdown', 'html', 'screenshot'],
            onlyMainContent: false,
          }),
        });

        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          scrapedContent = {
            markdown: scrapeData.data?.markdown || scrapeData.markdown || '',
            html: scrapeData.data?.html || scrapeData.html || '',
            screenshot: scrapeData.data?.screenshot || scrapeData.screenshot || null,
            metadata: scrapeData.data?.metadata || scrapeData.metadata || {},
          };
          console.log('Scrape successful, content length:', scrapedContent.markdown.length);
        } else {
          console.error('Scrape failed:', scrapeRes.status);
        }
      } catch (e) {
        console.error('Scrape error:', e);
      }
    }

    // Step 1.5: Screenshot Google Maps reviews page
    let googleMapsScreenshot: string | null = null;
    if (FIRECRAWL_API_KEY && business.name) {
      try {
        const searchQuery = encodeURIComponent(`${business.name} ${business.address || ''}`);
        const mapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
        
        console.log('Taking Google Maps screenshot:', mapsUrl);
        const screenshotRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: mapsUrl,
            formats: ['screenshot'],
            waitFor: 3000,
          }),
        });

        if (screenshotRes.ok) {
          const screenshotData = await screenshotRes.json();
          const screenshotBase64 = screenshotData.data?.screenshot || screenshotData.screenshot;
          if (screenshotBase64) {
            googleMapsScreenshot = screenshotBase64;
            console.log('Google Maps screenshot captured');
          }
        } else {
          console.error('Google Maps screenshot failed:', screenshotRes.status);
        }
      } catch (e) {
        console.error('Google Maps screenshot error:', e);
      }
    }

    // Step 2: AI analysis
    const htmlSnippet = scrapedContent?.html
      ? scrapedContent.html.substring(0, 8000)
      : 'Sem site disponível';
    const markdownContent = scrapedContent?.markdown
      ? scrapedContent.markdown.substring(0, 6000)
      : 'Sem conteúdo disponível';
    const metadata = scrapedContent?.metadata || {};

    const dnaContext = dna ? `
DADOS DA SUA EMPRESA (quem está prospectando):
- Serviços: ${(dna.services || []).join(', ') || 'Não informado'}
- Diferenciais: ${(dna.differentials || []).join(', ') || 'Não informado'}
- Público-alvo: ${dna.target_audience || 'Não informado'}
- Proposta de valor: ${dna.value_proposition || 'Não informado'}
- Tom de comunicação: ${dna.tone || 'Não informado'}
` : '';

    const systemPrompt = `Você é um analista de marketing digital especializado em auditoria de presença online de empresas.
Analise a empresa-alvo e retorne scores e recomendações.

IMPORTANTE: Retorne APENAS o JSON via tool call, sem texto adicional.`;

    const userPrompt = `Analise a seguinte empresa:

EMPRESA-ALVO:
- Nome: ${business.name}
- Endereço: ${business.address}
- Telefone: ${business.phone}
- Site: ${business.website || 'Sem site'}
- Categoria: ${business.category}
- Rating Google: ${business.rating || 'N/A'}

CONTEÚDO DO SITE (HTML parcial):
${htmlSnippet}

CONTEÚDO DO SITE (Markdown):
${markdownContent}

METADADOS:
- Title: ${metadata.title || 'N/A'}
- Description: ${metadata.description || 'N/A'}
- Language: ${metadata.language || 'N/A'}

${dnaContext}

Analise e retorne os scores e recomendações para esta empresa.`;

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
        tools: [{
          type: 'function',
          function: {
            name: 'submit_analysis',
            description: 'Submit the complete analysis of the business',
            parameters: {
              type: 'object',
              properties: {
                scores: {
                  type: 'object',
                  properties: {
                    seo: { type: 'number', description: 'Score SEO 0-100' },
                    speed: { type: 'number', description: 'Score velocidade estimada 0-100' },
                    layout: { type: 'number', description: 'Score layout/UX 0-100' },
                    security: { type: 'number', description: 'Score segurança 0-100' },
                    overall: { type: 'number', description: 'Score geral 0-100' },
                  },
                  required: ['seo', 'speed', 'layout', 'security', 'overall'],
                },
                seo_details: {
                  type: 'object',
                  properties: {
                    has_title: { type: 'boolean' },
                    has_meta_description: { type: 'boolean' },
                    has_h1: { type: 'boolean' },
                    has_sitemap: { type: 'boolean' },
                    issues: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['has_title', 'has_meta_description', 'has_h1', 'issues'],
                },
                security_details: {
                  type: 'object',
                  properties: {
                    has_https: { type: 'boolean' },
                    has_ssl: { type: 'boolean' },
                    issues: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['has_https', 'issues'],
                },
                google_presence: {
                  type: 'object',
                  properties: {
                    rating: { type: 'number' },
                    estimated_position: { type: 'string' },
                    strengths: { type: 'array', items: { type: 'string' } },
                    weaknesses: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['strengths', 'weaknesses'],
                },
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string', enum: ['alta', 'média', 'baixa'] },
                      category: { type: 'string', enum: ['SEO', 'Velocidade', 'Layout', 'Segurança', 'Marketing', 'Geral'] },
                    },
                    required: ['title', 'description', 'priority', 'category'],
                  },
                },
                summary: { type: 'string', description: 'Resumo executivo da análise em 2-3 parágrafos' },
              },
              required: ['scores', 'seo_details', 'security_details', 'google_presence', 'recommendations', 'summary'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'submit_analysis' } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('AI did not return structured analysis');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    analysis.has_website = !!business.website;
    analysis.scraped = !!scrapedContent;
    if (googleMapsScreenshot) {
      analysis.google_maps_screenshot = googleMapsScreenshot;
    }
    if (scrapedContent?.screenshot) {
      analysis.website_screenshot = scrapedContent.screenshot;
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Deep analyze error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
