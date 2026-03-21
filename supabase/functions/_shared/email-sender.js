const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function normalizeEmailAddress(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized || null;
}

export function extractEmailDomain(value) {
  const normalized = normalizeEmailAddress(value);
  if (!normalized || !EMAIL_RE.test(normalized)) return null;
  return normalized.split("@")[1] || null;
}

function isVerifiedDomainStatus(status) {
  return String(status || "").toLowerCase() === "verified";
}

function isBlockedDomainStatus(status) {
  return ["failed", "temporary_failure", "canceled"].includes(String(status || "").toLowerCase());
}

export function buildEmailSenderReadiness({
  senderEmail,
  replyToEmail,
  hasResendKey,
  apiReachable,
  apiError,
  domainExists,
  domainStatus,
  domainWasCreated = false,
}) {
  const normalizedSender = normalizeEmailAddress(senderEmail);
  const normalizedReplyTo = normalizeEmailAddress(replyToEmail);
  const senderDomain = extractEmailDomain(normalizedSender);
  const domainReady = domainExists && isVerifiedDomainStatus(domainStatus);
  const domainBlocked = domainExists && isBlockedDomainStatus(domainStatus);
  const hasBlockingGap =
    !normalizedSender ||
    !senderDomain ||
    !hasResendKey ||
    !apiReachable ||
    domainBlocked;

  const checks = [
    createCheck(
      "sender_email",
      "Email remetente",
      !!normalizedSender && !!senderDomain,
      "Remetente informado e com formato valido.",
      "Informe um email remetente valido para campanhas.",
      "danger",
    ),
    createCheck(
      "reply_to",
      "Reply-To",
      true,
      normalizedReplyTo
        ? "As respostas serao direcionadas para o email configurado."
        : "Nao informado. As respostas ficarao no proprio remetente.",
      "Nao informado. As respostas ficarao no proprio remetente.",
      "warning",
    ),
    createCheck(
      "resend_api",
      "Chave Resend",
      hasResendKey && apiReachable,
      "Conexao com a API do Resend validada.",
      apiError || "Nao foi possivel validar a integracao com o Resend.",
      "danger",
    ),
    createCheck(
      "sender_domain",
      "Dominio do remetente",
      !!domainExists,
      domainWasCreated
        ? "Dominio criado no Resend. Publique os registros DNS abaixo."
        : "Dominio localizado no Resend.",
      "O dominio do remetente ainda nao esta registrado no Resend.",
      "danger",
    ),
    createCheck(
      "dns_verification",
      "Verificacao DNS",
      domainReady,
      "Dominio verificado e pronto para envio.",
      domainBlocked
        ? `O dominio esta com erro no Resend (${domainStatus || "desconhecido"}).`
        : `O dominio ainda nao foi verificado no Resend (${domainStatus || "pendente"}).`,
      domainBlocked ? "danger" : "warning",
    ),
  ];

  const issues = [];

  if (!hasResendKey) {
    issues.push(
      createIssue(
        "resend_api",
        "RESEND_API_KEY ausente",
        "O backend nao consegue validar nem enviar emails sem a chave do Resend.",
        "Configure RESEND_API_KEY nos secrets do Supabase antes de usar remetentes customizados.",
        "danger",
      ),
    );
  } else if (!apiReachable) {
    issues.push(
      createIssue(
        "resend_api",
        "Nao foi possivel validar o dominio no Resend",
        apiError || "A API do Resend nao respondeu corretamente.",
        "Revise a chave RESEND_API_KEY e tente validar novamente.",
        "danger",
      ),
    );
  }

  if (!domainExists) {
    issues.push(
      createIssue(
        "sender_domain",
        "Dominio ainda nao esta pronto no Resend",
        "O dominio do remetente precisa existir no Resend para liberar envios com a identidade do cliente.",
        "Valide o remetente para cadastrar o dominio e copiar os registros DNS.",
        hasBlockingGap ? "danger" : "warning",
      ),
    );
  } else if (domainBlocked) {
    issues.push(
      createIssue(
        "dns_verification",
        "Dominio bloqueado no Resend",
        `O Resend retornou o status ${domainStatus || "desconhecido"} para este dominio.`,
        "Revise os registros DNS e revalide o dominio no painel de email.",
        "danger",
      ),
    );
  } else if (!domainReady) {
    issues.push(
      createIssue(
        "dns_verification",
        "DNS ainda nao confirmado",
        "O dominio ja esta cadastrado, mas o Resend ainda nao confirmou os registros SPF/DKIM.",
        "Publique os registros DNS e clique em Validar remetente novamente.",
        "warning",
      ),
    );
  }

  const readiness = hasBlockingGap ? "blocked" : issues.length > 0 ? "partial" : "ready";
  const summary =
    readiness === "ready"
      ? "Remetente pronto para enviar campanhas com a identidade do cliente."
      : readiness === "partial"
        ? "Remetente salvo, mas o dominio ainda precisa concluir a verificacao DNS no Resend."
        : "O remetente nao esta operacional para campanhas neste momento.";

  return {
    readiness,
    status: readiness === "ready" ? "ready" : readiness === "blocked" ? "blocked" : "pending",
    summary,
    checks,
    issues,
    normalizedSenderEmail: normalizedSender,
    normalizedReplyToEmail: normalizedReplyTo,
    senderDomain,
    domainStatus: domainStatus || null,
  };
}
