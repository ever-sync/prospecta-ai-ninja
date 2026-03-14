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

export type PresentationContentV2 = {
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    miniSummary: string;
  };
  executiveSummary: {
    title: string;
    bullets: string[];
  };
  diagnosis: {
    title: string;
    summary: string;
    riskStatement: string;
  };
  googleMapsInsight: {
    title: string;
    insight: string;
    impact: string;
  };
  websiteInsight: {
    title: string;
    insight: string;
    impact: string;
  };
  opportunities: PresentationProblemCard[];
  solutionMapping: PresentationSolutionCard[];
  differentials: PresentationDifferentialCard[];
  proof: PresentationProofCard[];
  offer: {
    title: string;
    summary: string;
    expectedResult: string;
    riskOfInaction: string;
  };
  cta: {
    title: string;
    primaryLabel: string;
    secondaryLabel?: string | null;
    microcopy: string;
    trustLine?: string | null;
  };
};

export type GeneratePresentationResponse = {
  success?: boolean;
  html: string;
  version?: string;
  content?: PresentationContentV2;
  assetsUsed?: {
    googleMapsScreenshot: boolean;
    websiteScreenshot: boolean;
    logo: boolean;
  };
  fallbacksUsed?: string[];
  error?: string;
};
