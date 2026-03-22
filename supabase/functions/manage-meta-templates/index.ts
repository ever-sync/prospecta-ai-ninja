/**
 * manage-meta-templates
 *
 * Actions:
 *   submit  – converts body variables to {{N}}, submits template to Meta for approval
 *   check   – fetches current status from Meta and updates the DB row
 *   preview – returns the converted Meta body + variable order (no API call)
 */

import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Our variable keys in priority order for numbering.
// Variables found in the body are numbered in order of first appearance; this list is the
// canonical mapping — any variable not in this list is appended in encounter order.
const KNOWN_VARS = [
  "nome_empresa",
  "link_proposta",
  "sua_empresa",
  "categoria",
  "score",
  "rating",
  "endereco",
  "telefone",
  "website",
];

/**
 * Parse a template body and return:
 *  - metaBody: body with {{nome_empresa}} → {{1}} substitutions
 *  - variableOrder: ordered array of variable keys mapped to {{1}}, {{2}}, ...
 */
function convertBodyToMetaFormat(body: string): {
  metaBody: string;
  variableOrder: string[];
} {
  const varRegex = /\{\{([a-z_]+)\}\}/g;
  const seen: string[] = [];

  // Collect unique variable keys in order of appearance
  for (const match of body.matchAll(varRegex)) {
    const key = match[1];
    if (!seen.includes(key)) seen.push(key);
  }

  // Replace each occurrence with its {{N}} number
  let metaBody = body;
  seen.forEach((key, idx) => {
    metaBody = metaBody.replaceAll(`{{${key}}}`, `{{${idx + 1}}}`);
  });

  return { metaBody, variableOrder: seen };
}

function toSnakeCase(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 512);
}

/** Example values for each variable key (so Meta can validate the template) */
function exampleValue(key: string): string {
  const examples: Record<string, string> = {
    nome_empresa: "Empresa Exemplo Ltda",
    link_proposta: "https://envpro.com.br/presentation/abc123",
    sua_empresa: "Minha Empresa",
    categoria: "Restaurantes",
    score: "78",
    rating: "4.5",
    endereco: "Rua das Flores, 100 - São Paulo/SP",
    telefone: "(11) 99999-9999",
    website: "www.exemplo.com.br",
  };
  return examples[key] ?? `[${key}]`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await getAuthenticatedUserContext(req, { requireBillingAccess: true });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json();
    const { action, template_id } = body;

    if (!action) throw new HttpError(400, "Campo 'action' obrigatorio: submit | check | preview");
    if (!template_id) throw new HttpError(400, "Campo 'template_id' obrigatorio");

    // Load template
    const { data: tpl, error: tplErr } = await svc
      .from("message_templates")
      .select("id, user_id, name, body, channel, meta_template_name, meta_template_status, meta_template_language, meta_variable_order")
      .eq("id", template_id)
      .single();

    if (tplErr || !tpl) throw new HttpError(404, "Template nao encontrado");
    if (tpl.user_id !== userId) throw new HttpError(403, "Acesso negado");
    if (tpl.channel !== "whatsapp") throw new HttpError(400, "Aprovacao Meta disponivel apenas para templates WhatsApp");

    // Load user profile for WABA ID and access token
    const { data: profile } = await svc
      .from("profiles")
      .select("whatsapp_business_account_id, whatsapp_official_access_token, whatsapp_connection_type")
      .eq("user_id", userId)
      .maybeSingle();

    const wabaId = (profile?.whatsapp_business_account_id || "").trim();
    const accessToken = (profile?.whatsapp_official_access_token || "").trim();

    // ─── PREVIEW ────────────────────────────────────────────────────────────────
    if (action === "preview") {
      const { metaBody, variableOrder } = convertBodyToMetaFormat(tpl.body || "");
      return new Response(
        JSON.stringify({ metaBody, variableOrder }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Submit and check require credentials
    if (!wabaId) throw new HttpError(400, "Configure o WABA ID (WhatsApp Business Account ID) em Configuracoes > Integracoes primeiro.");
    if (!accessToken) throw new HttpError(400, "Configure o Access Token Meta em Configuracoes > Integracoes primeiro.");

    // ─── SUBMIT ─────────────────────────────────────────────────────────────────
    if (action === "submit") {
      const rawName = (body.template_name || tpl.meta_template_name || toSnakeCase(tpl.name));
      const templateName = toSnakeCase(rawName);
      const language = body.language || tpl.meta_template_language || "pt_BR";

      if (!templateName) throw new HttpError(400, "Informe um nome para o template (snake_case)");

      const { metaBody, variableOrder } = convertBodyToMetaFormat(tpl.body || "");

      const components: any[] = [
        {
          type: "BODY",
          text: metaBody,
          ...(variableOrder.length > 0
            ? { example: { body_text: [variableOrder.map(exampleValue)] } }
            : {}),
        },
      ];

      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: templateName,
            language,
            category: "MARKETING",
            components,
          }),
        },
      );

      const metaData = await metaRes.json().catch(() => ({}));

      if (!metaRes.ok) {
        const errorMsg =
          metaData?.error?.message ||
          metaData?.error?.error_user_msg ||
          `Erro ${metaRes.status} ao submeter template`;

        return new Response(
          JSON.stringify({ success: false, error: errorMsg, meta: metaData }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Meta returns { id, status } on success
      const newStatus = (metaData.status || "pending").toLowerCase();

      await svc.from("message_templates").update({
        meta_template_name: templateName,
        meta_template_status: newStatus,
        meta_template_language: language,
        meta_variable_order: variableOrder,
        updated_at: new Date().toISOString(),
      }).eq("id", template_id);

      return new Response(
        JSON.stringify({
          success: true,
          templateName,
          status: newStatus,
          metaBody,
          variableOrder,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── CHECK ──────────────────────────────────────────────────────────────────
    if (action === "check") {
      const templateName = tpl.meta_template_name;
      if (!templateName) throw new HttpError(400, "Template ainda nao foi submetido para aprovacao");

      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}&fields=id,name,status,components`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      const metaData = await metaRes.json().catch(() => ({}));

      if (!metaRes.ok) {
        const errorMsg = metaData?.error?.message || `Erro ${metaRes.status} ao verificar status`;
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const found = metaData?.data?.[0];
      if (!found) {
        return new Response(
          JSON.stringify({ success: false, error: "Template nao encontrado na Meta. Pode ter sido rejeitado ou excluido." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const newStatus = (found.status || "pending").toLowerCase();
      await svc.from("message_templates").update({
        meta_template_status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", template_id);

      return new Response(
        JSON.stringify({ success: true, status: newStatus, meta: found }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new HttpError(400, `Action desconhecida: ${action}`);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
