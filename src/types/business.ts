export interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  distance: number;
  rating?: number;
}

export interface SearchFilters {
  niches: string[];
  location: string;
  radius: number;
}

export const AVAILABLE_NICHES = [
  { value: 'restaurant', label: 'Restaurantes' },
  { value: 'clinic', label: 'Clínicas' },
  { value: 'store', label: 'Lojas' },
  { value: 'gym', label: 'Academias' },
  { value: 'salon', label: 'Salões de Beleza' },
  { value: 'dentist', label: 'Dentistas' },
  { value: 'lawyer', label: 'Advogados' },
  { value: 'accounting', label: 'Contabilidade' },
  { value: 'pharmacy', label: 'Farmácias' },
  { value: 'hotel', label: 'Hotéis' },
  { value: 'school', label: 'Escolas' },
  { value: 'real_estate', label: 'Imobiliárias' },
];
