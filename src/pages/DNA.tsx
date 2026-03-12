import { Dna, Quote } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DNAFormTab from '@/components/DNAFormTab';
import TestimonialsTab from '@/components/TestimonialsTab';

const DNA = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-3 mb-6">
        <Dna className="w-6 h-6 text-primary" />
        DNA da Empresa
      </h1>

      <Tabs defaultValue="dna" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="dna" className="flex-1 gap-2">
            <Dna className="w-4 h-4" />
            DNA
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="flex-1 gap-2">
            <Quote className="w-4 h-4" />
            Testemunhos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dna">
          <DNAFormTab />
        </TabsContent>

        <TabsContent value="testimonials">
          <TestimonialsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DNA;
