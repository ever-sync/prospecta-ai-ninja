import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";

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
    await getAuthenticatedUserContext(req);

    const { accessToken, phoneNumberId } = await req.json();

    if (!accessToken?.trim() || !phoneNumberId?.trim()) {
      throw new HttpError(400, "Informe o Access Token e o Phone Number ID.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const verifyToken = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") || "";
    const webhookUrl = supabaseUrl
      ? `${supabaseUrl}/functions/v1/whatsapp-status-webhook`
      : "";

    // Validate via Meta Graph API — fetch phone number info
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId.trim()}?fields=display_phone_number,verified_name,code_verification_status,quality_rating`,
      {
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
      },
    );

    const metaData = await metaRes.json().catch(() => ({}));

    if (!metaRes.ok) {
      const errorMsg =
        metaData?.error?.message ||
        metaData?.error?.error_user_msg ||
        `Erro ${metaRes.status} na API da Meta.`;

      return new Response(
        JSON.stringify({ valid: false, error: errorMsg, webhookUrl, verifyToken }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        displayPhoneNumber: metaData.display_phone_number || null,
        verifiedName: metaData.verified_name || null,
        qualityRating: metaData.quality_rating || null,
        webhookUrl,
        verifyToken,
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
