import { Business, LeadSignalSummary, OnlinePresenceSnapshot } from "@/types/business";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const deriveFallbackPresence = (business: Business): OnlinePresenceSnapshot => {
  const hasWebsite = Boolean(business.website?.trim());
  const hasEmail = Boolean(business.email?.trim());
  const hasPhone = Boolean(business.phone?.trim());

  if (!hasWebsite) {
    return {
      score: 8,
      classification: "critical",
      label: "Presenca critica",
      summary: "O lead nao possui site proprio e depende de canais terceirizados ou reputacao local isolada.",
      strengths: hasPhone || hasEmail ? ["Existe ao menos um canal direto de contato."] : [],
      weaknesses: [
        "Nao possui site proprio",
        "Perde autoridade fora do Google",
        "Nao controla bem a propria narrativa comercial",
      ],
      emailsFound: hasEmail ? [business.email] : [],
      phonesFound: hasPhone ? [business.phone] : [],
      socialLinks: {},
      hasContactForm: false,
      hasTitle: false,
      hasMetaDescription: false,
      hasHttps: false,
      contentDepth: "low",
    };
  }

  const score = hasEmail && hasPhone ? 54 : hasEmail || hasPhone ? 45 : 38;

  return {
    score,
    classification: score <= 45 ? "weak" : "average",
    label: score <= 45 ? "Presenca fraca" : "Presenca mediana",
    summary:
      score <= 45
        ? "O lead tem site, mas ainda sem sinais suficientes de maturidade comercial."
        : "O lead tem base digital minima, mas ainda precisa de auditoria completa.",
    strengths: ["Site proprio encontrado."],
    weaknesses:
      score <= 45
        ? ["Contato incompleto", "Site ainda nao auditado", "Autoridade digital pouco clara"]
        : ["Falta auditoria aprofundada do site"],
    emailsFound: hasEmail ? [business.email] : [],
    phonesFound: hasPhone ? [business.phone] : [],
    socialLinks: {},
    hasContactForm: false,
    hasTitle: false,
    hasMetaDescription: false,
    hasHttps: true,
    contentDepth: "medium",
  };
};

export const deriveLeadSignalSummary = (business: Business): LeadSignalSummary => {
  const hasWebsite = Boolean(business.website?.trim());
  const hasEmail = Boolean(business.email?.trim());
  const hasPhone = Boolean(business.phone?.trim());
  const rating = business.rating ?? 0;
  const onlinePresence = business.onlinePresence ?? deriveFallbackPresence(business);

  const contactCompleteness = [hasPhone, hasEmail, hasWebsite].filter(Boolean).length;

  let score = 28;
  score += hasPhone ? 18 : 0;
  score += hasEmail ? 14 : 0;
  score += hasWebsite ? 16 : 0;
  score +=
    onlinePresence.score <= 20
      ? 18
      : onlinePresence.score <= 40
        ? 12
        : onlinePresence.score <= 60
          ? 6
          : 0;
  score += rating >= 4.5 ? 14 : rating >= 4 ? 10 : rating >= 3.5 ? 6 : 0;
  score += business.distance <= 3 ? 10 : business.distance <= 8 ? 6 : business.distance <= 15 ? 3 : 0;
  score = clamp(score, 0, 100);

  const signalFlags: string[] = [];
  if (hasWebsite) signalFlags.push("Site ativo");
  else signalFlags.push("Sem site proprio");

  if (hasPhone && hasEmail) signalFlags.push("Contato completo");
  else if (hasPhone || hasEmail) signalFlags.push("Contato parcial");
  else signalFlags.push("Contato fraco");

  if (rating >= 4.5) signalFlags.push("Boa reputacao");
  else if (rating > 0 && rating < 4) signalFlags.push("Reputacao vulneravel");

  if (business.distance <= 3) signalFlags.push("Muito proximo");
  else if (business.distance >= 15) signalFlags.push("Mais distante");

  signalFlags.push(onlinePresence.label);
  if (onlinePresence.weaknesses[0]) signalFlags.push(onlinePresence.weaknesses[0]);

  const priorityLabel =
    score >= 74 ? "Alta oportunidade" : score >= 55 ? "Priorizar analise" : "Contato fraco";

  const priorityTone: LeadSignalSummary["priorityTone"] =
    score >= 74 ? "high" : score >= 55 ? "medium" : "low";

  const reputationLabel =
    rating >= 4.5 ? "Boa reputacao" : rating >= 4 ? "Reputacao estavel" : rating > 0 ? "Reputacao vulneravel" : "Sem rating";

  const proximityLabel =
    business.distance <= 3 ? "Muito perto" : business.distance <= 8 ? "Raio quente" : business.distance <= 15 ? "Raio medio" : "Raio expandido";

  const onlinePresenceTone: LeadSignalSummary["onlinePresenceTone"] =
    onlinePresence.score <= 35 ? "critical" : onlinePresence.score <= 65 ? "warning" : "healthy";

  const opportunityNarrative =
    onlinePresence.score <= 20
      ? "A presenca online esta muito fraca. Existe espaco claro para abordagem de diagnostico e recuperacao de autoridade."
      : onlinePresence.score <= 45
        ? "A presenca online e vulneravel. O lead tende a responder bem a uma leitura consultiva com ganhos rapidos."
        : onlinePresence.score <= 70
          ? "A base digital existe, mas ainda ha brechas para elevar conversao e clareza comercial."
          : "A presenca online parece mais madura; a abordagem precisa ser mais estrategica e menos basica.";

  return {
    score,
    priorityLabel,
    priorityTone,
    contactCompleteness,
    signalFlags,
    hasWebsite,
    hasEmail,
    hasPhone,
    reputationLabel,
    proximityLabel,
    onlinePresenceScore: onlinePresence.score,
    onlinePresenceLabel: onlinePresence.label,
    onlinePresenceTone,
    onlinePresenceWeaknesses: onlinePresence.weaknesses,
    opportunityNarrative,
  };
};
