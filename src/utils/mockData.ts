import { Business } from '@/types/business';

export const generateMockBusinesses = (niches: string[], count: number = 15): Business[] => {
  const nicheNames: Record<string, string[]> = {
    restaurant: ['Restaurante Sabor & Arte', 'Cantina Italiana', 'Churrascaria Gaúcha', 'Sushi Premium', 'Bistrô Gourmet'],
    clinic: ['Clínica Vida Plena', 'Centro Médico Saúde', 'Policlínica Central', 'Clínica Bem Estar', 'Instituto de Saúde'],
    store: ['Loja Fashion Style', 'Mega Store', 'Outlet Premium', 'Loja do Bairro', 'Empório Central'],
    gym: ['Academia Fitness Plus', 'CrossFit Elite', 'Smart Fit Unidade', 'Bio Ritmo', 'Academia Corpo & Mente'],
    salon: ['Salão Beauty Hair', 'Studio de Beleza', 'Espaço Glamour', 'Hair Design', 'Beleza Total'],
    dentist: ['Odonto Excellence', 'Sorriso Perfeito', 'Clínica Dental Care', 'Odontologia Avançada', 'DentalPro'],
    lawyer: ['Advocacia Silva & Associados', 'Escritório Jurídico Central', 'Advocacia Especializada', 'Leal Advogados', 'Juris Consultoria'],
    accounting: ['Contabilidade Exata', 'Contador Express', 'Gestão Contábil', 'Contábil Premium', 'Assessoria Fiscal'],
    pharmacy: ['Farmácia Popular', 'Drogaria Mais', 'Farmácia 24h', 'Droga Rápida', 'Farmácia Central'],
    hotel: ['Hotel Comfort Inn', 'Pousada do Sol', 'Hotel Business', 'Resort & Spa', 'Hotel Executive'],
    school: ['Colégio Futuro', 'Escola Criativa', 'Instituto de Ensino', 'Centro Educacional', 'Escola Integral'],
    real_estate: ['Imobiliária Casa Nova', 'Corretor Premium', 'Imóveis & Cia', 'Real Estate Pro', 'Imobiliária Central'],
  };

  const streets = [
    'Av. Paulista', 'Rua Augusta', 'Av. Brasil', 'Rua das Flores', 'Av. Central',
    'Rua Bela Vista', 'Av. Independência', 'Rua São João', 'Av. Rio Branco', 'Rua Nova'
  ];

  const businesses: Business[] = [];
  
  for (let i = 0; i < count; i++) {
    const niche = niches[Math.floor(Math.random() * niches.length)];
    const names = nicheNames[niche] || nicheNames['store'];
    const name = names[Math.floor(Math.random() * names.length)] + ` ${i + 1}`;
    const street = streets[Math.floor(Math.random() * streets.length)];
    const number = Math.floor(Math.random() * 2000) + 100;
    
    businesses.push({
      id: `business-${i + 1}`,
      name,
      address: `${street}, ${number} - São Paulo, SP`,
      phone: `(11) ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      website: `www.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
      category: niche,
      distance: parseFloat((Math.random() * 10).toFixed(1)),
      rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
    });
  }

  return businesses.sort((a, b) => a.distance - b.distance);
};
