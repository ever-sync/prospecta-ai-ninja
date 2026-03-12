import { Presentation } from 'lucide-react';
import { Card } from '@/components/ui/card';

const Presentations = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
        <Presentation className="w-6 h-6 text-primary" />
        Apresentações
      </h1>

      <Card className="p-12 bg-card border-border">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center">
            <Presentation className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">
              Nenhuma apresentação ainda
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione empresas na aba Busca e clique em "Analisar Selecionadas" para gerar apresentações.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Presentations;
