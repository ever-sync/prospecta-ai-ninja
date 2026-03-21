function createCheck(key, label, ok, passingDetail, failingDetail, severityWhenMissing = "danger") {
  return {
    key,
    label,
    ok,
    severity: ok ? "success" : severityWhenMissing,
    detail: ok ? passingDetail : failingDetail,
  };
}

function createIssue(key, title, detail, action, severity = "warning") {
  return { key, title, detail, action, severity };
}

export function buildMetaWhatsAppReadiness({
  hasAccessToken,
  hasPhoneNumberId,
  hasWabaId,
  hasWebhookUrl,
  hasVerifyToken,
  hasAppSecret,
  apiReachable,
  apiError,
}) {
  const checks = [
    createCheck(
      "meta_api",
      "Graph API da Meta",
      apiReachable,
      "Conexao validada com a Graph API.",
      apiError || "Nao foi possivel validar a conexao com a Meta.",
      "danger",
    ),
    createCheck(
      "access_token",
      "Access Token permanente",
      hasAccessToken,
      "Token informado.",
      "Necessario para validar a API da Meta.",
      "danger",
    ),
    createCheck(
      "phone_number_id",
      "Phone Number ID",
      hasPhoneNumberId,
      "Numero vinculado encontrado.",
      "Necessario para enviar mensagens oficiais.",
      "danger",
    ),
    createCheck(
      "waba_id",
      "WABA ID",
      hasWabaId,
      "Pronto para aprovacao de templates.",
      "Recomendado para submeter templates oficiais.",
      "warning",
    ),
    createCheck(
      "webhook_url",
      "Webhook publico",
      hasWebhookUrl,
      "URL publica gerada pelo Supabase.",
      "Nao foi possivel gerar a URL do webhook.",
      "danger",
    ),
    createCheck(
      "verify_token",
      "Verify Token",
      hasVerifyToken,
      "Token pronto para configuracao no Meta Developers.",
      "Defina META_WHATSAPP_VERIFY_TOKEN para validar callbacks.",
      "warning",
    ),
    createCheck(
      "app_secret",
      "App Secret",
      hasAppSecret,
      "Status assinados e receipts de leitura ativos.",
      "Defina META_WHATSAPP_APP_SECRET para receber eventos assinados.",
      "warning",
    ),
  ];

  const issues = [];
  if (!apiReachable) {
    issues.push(
      createIssue(
        "meta_api",
        "Credenciais Meta precisam de ajuste",
        apiError || "A Graph API nao respondeu corretamente.",
        "Revalide o Access Token e o Phone Number ID no painel Meta.",
        "danger",
      ),
    );
  }
  if (!hasWabaId) {
    issues.push(
      createIssue(
        "waba_id",
        "WABA ID ausente",
        "Envios oficiais funcionam, mas templates nao podem ser aprovados sem o WABA ID.",
        "Copie o WABA ID do painel Meta e salve em Configuracoes > Integracoes.",
        "warning",
      ),
    );
  }
  if (!hasWebhookUrl) {
    issues.push(
      createIssue(
        "webhook_url",
        "Webhook publico indisponivel",
        "A URL do webhook depende de SUPABASE_URL configurado no ambiente.",
        "Confirme a SUPABASE_URL e registre a URL do webhook no Meta Developers.",
        "danger",
      ),
    );
  }
  if (!hasVerifyToken) {
    issues.push(
      createIssue(
        "verify_token",
        "Verify Token ausente",
        "Defina META_WHATSAPP_VERIFY_TOKEN para validar o webhook da Meta.",
        "Adicione META_WHATSAPP_VERIFY_TOKEN nos secrets do Supabase.",
        "warning",
      ),
    );
  }
  if (!hasAppSecret) {
    issues.push(
      createIssue(
        "app_secret",
        "App Secret ausente",
        "Defina META_WHATSAPP_APP_SECRET para receber status assinados e eventos de leitura.",
        "Adicione META_WHATSAPP_APP_SECRET nos secrets do Supabase.",
        "warning",
      ),
    );
  }

  const hasBlockingGap = !hasAccessToken || !hasPhoneNumberId || !hasWebhookUrl || !apiReachable;
  const readiness = hasBlockingGap ? "blocked" : issues.length > 0 ? "partial" : "ready";
  const summary =
    readiness === "ready"
      ? "Integracao oficial pronta para envios, templates e status."
      : readiness === "partial"
        ? "Conexao valida, mas ainda faltam ajustes para uma operacao oficial completa."
        : "A integracao ainda nao esta pronta para operacao oficial.";

  return {
    readiness,
    summary,
    checks,
    issues,
  };
}
