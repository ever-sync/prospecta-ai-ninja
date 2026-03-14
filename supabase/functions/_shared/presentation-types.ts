export type PresentationTemplateSkin =
  | "modern-dark"
  | "clean-light"
  | "corporate"
  | "bold-gradient"
  | "custom";

export type PresentationTone =
  | "professional"
  | "consultive"
  | "urgent"
  | "friendly"
  | "technical";

export type PresentationResponseMode = "buttons" | "form";

export type PresentationAssetState = {
  src: string | null;
  status: "ready" | "fallback";
  error?: string | null;
  capturedAt?: string | null;
};

export type PresentationBusinessInput = {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  category?: string | null;
  rating?: number | null;
};

export type PresentationDNAInput = Record<string, unknown> & {
  services?: string[] | null;
  differentials?: string[] | null;
  value_proposition?: string | null;
  target_audience?: string | null;
  priority_pains?: string[] | null;
  common_objections?: string[] | null;
  objection_responses?: string | null;
  offer_packages?: string | null;
  case_metrics?: string | null;
  guarantee?: string | null;
  custom_bg_color?: string | null;
  custom_text_color?: string | null;
  custom_button_color?: string | null;
};

export type PresentationProfileInput = {
  company_name?: string | null;
  company_logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type PresentationSocialProof = {
  name?: string | null;
  company?: string | null;
  testimonial?: string | null;
  image_url?: string | null;
};

export type PresentationClientLogo = {
  company_name?: string | null;
  logo_url?: string | null;
};

export type PresentationProblemCard = {
  title: string;
  impact: string;
  urgency: string;
  opportunity: string;
};

export type PresentationSolutionCard = {
  problem: string;
  service: string;
  benefit: string;
};

export type PresentationDifferentialCard = {
  title: string;
  description: string;
};

export type PresentationProofCard = {
  title: string;
  metric?: string | null;
  description: string;
};

export type PresentationSectionHero = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  miniSummary: string;
};

export type PresentationSectionExecutiveSummary = {
  title: string;
  bullets: string[];
};

export type PresentationSectionDiagnosis = {
  title: string;
  summary: string;
  riskStatement: string;
};

export type PresentationSectionVisualInsight = {
  title: string;
  insight: string;
  impact: string;
};

export type PresentationSectionOffer = {
  title: string;
  summary: string;
  expectedResult: string;
  riskOfInaction: string;
};

export type PresentationSectionCTA = {
  title: string;
  primaryLabel: string;
  secondaryLabel?: string | null;
  microcopy: string;
  trustLine?: string | null;
};

export type PresentationContentV2 = {
  hero: PresentationSectionHero;
  executiveSummary: PresentationSectionExecutiveSummary;
  diagnosis: PresentationSectionDiagnosis;
  googleMapsInsight: PresentationSectionVisualInsight;
  websiteInsight: PresentationSectionVisualInsight;
  opportunities: PresentationProblemCard[];
  solutionMapping: PresentationSolutionCard[];
  differentials: PresentationDifferentialCard[];
  proof: PresentationProofCard[];
  offer: PresentationSectionOffer;
  cta: PresentationSectionCTA;
};

export type PresentationRenderContext = {
  template: PresentationTemplateSkin;
  tone: PresentationTone;
  responseMode: PresentationResponseMode;
  business: PresentationBusinessInput;
  analysis: Record<string, any>;
  dna: PresentationDNAInput | null;
  profile: PresentationProfileInput | null;
  publicId: string;
  companyName: string;
  logoUrl: string | null;
  whatsappUrl: string | null;
  formTemplateName?: string | null;
  formTemplateBody?: string | null;
  testimonials: PresentationSocialProof[];
  clientLogos: PresentationClientLogo[];
  assets: {
    googleMaps: PresentationAssetState;
    website: PresentationAssetState;
  };
};

export type PresentationRenderResult = {
  html: string;
  assetsUsed: {
    googleMapsScreenshot: boolean;
    websiteScreenshot: boolean;
    logo: boolean;
  };
  fallbacksUsed: string[];
};
