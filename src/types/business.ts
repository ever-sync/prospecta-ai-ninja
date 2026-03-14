export interface LeadSignalSummary {
  score: number;
  priorityLabel: string;
  priorityTone: "high" | "medium" | "low";
  contactCompleteness: number;
  signalFlags: string[];
  hasWebsite: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  reputationLabel: string;
  proximityLabel: string;
  onlinePresenceScore: number;
  onlinePresenceLabel: string;
  onlinePresenceTone: "critical" | "warning" | "healthy";
  onlinePresenceWeaknesses: string[];
  opportunityNarrative: string;
}

export interface ScannerSessionState {
  hasSearched: boolean;
  totalResults: number;
  filteredResults: number;
  selectedCount: number;
  contactFilter: "all" | "email" | "phone" | "any";
}

export interface DashboardReadinessState {
  label: string;
  ready: boolean;
  detail: string;
}

export interface OnlinePresenceSnapshot {
  score: number;
  classification: "critical" | "weak" | "average" | "strong";
  label: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  emailsFound: string[];
  phonesFound: string[];
  socialLinks: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    whatsapp?: string;
    youtube?: string;
  };
  hasContactForm: boolean;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  hasHttps: boolean;
  contentDepth: "low" | "medium" | "high";
}

export interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  category: string;
  distance: number;
  rating?: number;
  priorityLabel?: string;
  signalFlags?: string[];
  contactCompleteness?: number;
  signalSummary?: LeadSignalSummary;
  onlinePresence?: OnlinePresenceSnapshot;
}

export interface SearchFilters {
  niches: string[];
  location: string;
  radius: number;
}

export interface SearchRefinementFilters {
  siteStatus: "all" | "with_site" | "without_site";
  presenceTone: "all" | "critical" | "warning" | "healthy";
  contactQuality: "all" | "complete" | "partial" | "weak";
  contentDepth: "all" | "low" | "medium" | "high";
  minRating: "all" | "4_plus" | "4_5_plus";
  hasContactForm: "all" | "yes" | "no";
  hasSocialLinks: "all" | "yes" | "no";
  smartPreset: "all" | "attack_now" | "consultative" | "premium" | "authority_gap";
  sortBy: "score_desc" | "pain_desc" | "rating_desc" | "distance_asc" | "contact_desc";
}

export const DEFAULT_SEARCH_REFINEMENT_FILTERS: SearchRefinementFilters = {
  siteStatus: "all",
  presenceTone: "all",
  contactQuality: "all",
  contentDepth: "all",
  minRating: "all",
  hasContactForm: "all",
  hasSocialLinks: "all",
  smartPreset: "all",
  sortBy: "score_desc",
};

export const AVAILABLE_NICHES = [
  { value: "restaurant", label: "Restaurantes" },
  { value: "clinic", label: "Clinicas" },
  { value: "store", label: "Lojas" },
  { value: "gym", label: "Academias" },
  { value: "salon", label: "Saloes de Beleza" },
  { value: "dentist", label: "Dentistas" },
  { value: "lawyer", label: "Advogados" },
  { value: "accounting", label: "Contabilidade" },
  { value: "pharmacy", label: "Farmacias" },
  { value: "hotel", label: "Hoteis" },
  { value: "school", label: "Escolas" },
  { value: "real_estate", label: "Imobiliarias" },
];
