import { Business } from '@/types/business';

export const exportToCSV = (businesses: Business[], filename: string = 'prospecta-resultados') => {
  const headers = ['Nome', 'Endereço', 'Telefone', 'Email', 'Website', 'Categoria', 'Distância (km)', 'Avaliação'];
  
  const categoryLabels: Record<string, string> = {
    restaurant: 'Restaurante',
    clinic: 'Clínica',
    store: 'Loja',
    gym: 'Academia',
    salon: 'Salão de Beleza',
    dentist: 'Dentista',
    lawyer: 'Advogado',
    accounting: 'Contabilidade',
    pharmacy: 'Farmácia',
    hotel: 'Hotel',
    school: 'Escola',
    real_estate: 'Imobiliária',
  };

  const rows = businesses.map(business => [
    business.name,
    business.address,
    business.phone,
    business.email || '',
    business.website,
    categoryLabels[business.category] || business.category,
    business.distance.toString(),
    business.rating?.toString() || '-',
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
