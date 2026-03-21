export function scoreBucket(analysisData) {
  const score = analysisData?.scores?.overall;
  if (typeof score !== "number") return "unknown";
  if (score < 40) return "low";
  if (score < 70) return "medium";
  return "high";
}

function normalizeText(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hashToIndex(value, max) {
  if (max <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
}

function variantPriorityScore(variant, lead) {
  const persona = normalizeText(variant?.target_persona);
  const objective = normalizeText(variant?.campaign_objective);
  const trigger = normalizeText(variant?.cta_trigger);
  const leadCategory = normalizeText(lead?.business_category);
  const bucket = scoreBucket(lead?.analysis_data);

  let score = 0;
  if (persona) {
    if (leadCategory && persona.includes(leadCategory)) score += 4;
    if (persona.includes(bucket) || persona.includes(`score:${bucket}`)) score += 4;
  }
  if (objective.includes("recuperar") && bucket === "low") score += 1;
  if (objective.includes("escala") && bucket === "high") score += 1;
  if (trigger.includes("urgencia") && bucket !== "high") score += 1;
  if (trigger.includes("prova social") && bucket === "medium") score += 1;
  return score;
}

export function pickVariantForLead(lead, variants, fallback) {
  if (!variants || variants.length === 0) return fallback;
  if (variants.length === 1) return variants[0];

  const scored = variants.map((variant) => ({
    variant,
    score: variantPriorityScore(variant, lead),
  }));

  const topScore = Math.max(...scored.map((row) => row.score));
  const top = scored.filter((row) => row.score === topScore).map((row) => row.variant);
  return top[hashToIndex(lead.id, top.length)] || fallback || variants[0];
}
