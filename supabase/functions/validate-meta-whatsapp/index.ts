import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { buildMetaWhatsAppReadiness } from "../_shared/meta-whatsapp.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, svc } = await getAuthenticatedUserContext(req);
    const { accessToken, phoneNumberId, wabaId } = await req.json();

    if (!accessToken?.trim() || !phoneNumberId?.trim()) {
      throw new HttpError(400, "Informe o Access Token e o Phone Number ID.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const verifyToken = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") || "";
    const appSecret = Deno.env.get("META_WHATSAPP_APP_SECRET") || "";
    const webhookUrl = supabaseUrl
      ? `${supabaseUrl}/functions/v1/whatsapp-status-webhook`
      : "";

    const { data: profile } = await svc
      .from("profiles")
      .select("whatsapp_business_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const resolvedWabaId = (wabaId || profile?.whatsapp_business_account_id || "").trim();

    const baseReadiness = {
      hasAccessToken: !!accessToken?.trim(),
      hasPhoneNumberId: !!phoneNumberId?.trim(),
      hasWabaId: !!resolvedWabaId,
      hasWebhookUrl: !!webhookUrl,
      hasVerifyToken: !!verifyToken,
      hasAppSecret: !!appSecret,
    };

    // Validate via Meta Graph API — fetch phone number info
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId.trim()}?fields=display_phone_number,verified_name,code_verification_status,quality_rating`,
      {
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
      },
    );

    const metaData = await metaRes.json().catch(() => ({}));
    const readiness = buildMetaWhatsAppReadiness({
      ...baseReadiness,
      apiReachable: metaRes.ok,
      apiError:
        metaRes.ok
          ? null
          : metaData?.error?.message ||
            metaData?.error?.error_user_msg ||
            `Erro ${metaRes.status} na API da Meta.`,
    });

    if (!metaRes.ok) {
      const errorMsg =
        metaData?.error?.message ||
        metaData?.error?.error_user_msg ||
        `Erro ${metaRes.status} na API da Meta.`;

      return new Response(
        JSON.stringify({
          valid: false,
          error: errorMsg,
          webhookUrl,
          verifyToken,
          wabaId: resolvedWabaId || null,
          readiness: readiness.readiness,
          summary: readiness.summary,
          checks: readiness.checks,
          issues: readiness.issues,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        displayPhoneNumber: metaData.display_phone_number || null,
        verifiedName: metaData.verified_name || null,
        qualityRating: metaData.quality_rating || null,
        codeVerificationStatus: metaData.code_verification_status || null,
        webhookUrl,
        verifyToken,
        wabaId: resolvedWabaId || null,
        readiness: readiness.readiness,
        summary: readiness.summary,
        checks: readiness.checks,
        issues: readiness.issues,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : "Erro desconhecido.",
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
