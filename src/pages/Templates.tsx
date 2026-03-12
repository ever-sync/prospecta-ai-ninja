import { FileText } from 'lucide-react';
import TemplatesManager from '@/components/TemplatesManager';

const Templates = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary" />
        Templates
      </h1>
      <TemplatesManager />
    </div>
  );
};

export default Templates;
