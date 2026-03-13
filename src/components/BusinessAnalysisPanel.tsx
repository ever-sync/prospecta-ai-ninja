import { useState } from 'react';
import { Sparkles, X, Swords, BarChart3, User, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Business } from '@/types/business';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ApproachSuggestion } from '@/components/ApproachSuggestion';

interface BusinessAnalysisPanelProps {
  business: Business;
  onClose: () => void;
}

interface CompetitorData {
  competitors: { name: string; strength: string; weakness: string }[];
  differentials: string[];
  opportunities: string[];
  summary: string;
}

interface ScoreData {
  totalScore: number;
  breakdown: Record<string, { score: number; max: number; reason: string }>;
  recommendation: string;
  priority: string;
}

interface ProfileData {
  overview: string;
  targetAudience: string;
  estimatedSize: string;
  strengths: string[];
  challenges: string[];
  bestApproachTime: string;
  decisionMaker: string;
  insights: string;
}

type AnalysisCache = {
  competitors?: CompetitorData;
  score?: ScoreData;
  profile?: ProfileData;
};

export const BusinessAnalysisPanel = ({ business, onClose }: BusinessAnalysisPanelProps) => {
  const [cache, setCache] = useState<AnalysisCache>({});
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnalysis = async (mode: 'competitors' | 'score' | 'profile') => {
    if (cache[mode] && !loading) return;
    setLoading(mode);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-business', {
        body: { business, mode },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setCache(prev => ({ ...prev, [mode]: data.result }));
    } catch (error) {
      console.error(`Error fetching ${mode}:`, error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro na análise',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const refresh = (mode: 'competitors' | 'score' | 'profile') => {
    setCache(prev => { const n = { ...prev }; delete n[mode]; return n; });
    fetchAnalysis(mode);
  };

  const priorityColor = (p: string) => {
    if (p === 'alta') return 'bg-[#EF3333]/20 text-[#EF3333] border-[#EF3333]/30';
    if (p === 'média') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const scoreColor = (score: number) => {
    if (score > 70) return 'text-[#EF3333]';
    if (score > 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-10">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">Analisando com IA...</p>
    </div>
  );

  return (
    <Card className="p-6 bg-card border-border animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Análise IA</h3>
            <p className="text-xs text-muted-foreground">{business.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="approach" onValueChange={(v) => {
        if (v === 'competitors' && !cache.competitors) fetchAnalysis('competitors');
        if (v === 'score' && !cache.score) fetchAnalysis('score');
        if (v === 'profile' && !cache.profile) fetchAnalysis('profile');
      }}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="approach" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" /> Abordagem
          </TabsTrigger>
          <TabsTrigger value="competitors" className="text-xs gap-1">
            <Swords className="w-3 h-3" /> Concorrência
          </TabsTrigger>
          <TabsTrigger value="score" className="text-xs gap-1">
            <BarChart3 className="w-3 h-3" /> Score
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-xs gap-1">
            <User className="w-3 h-3" /> Perfil
          </TabsTrigger>
        </TabsList>

        {/* Abordagem Tab */}
        <TabsContent value="approach">
          <ApproachSuggestion business={business} onClose={() => {}} embedded />
        </TabsContent>

        {/* Concorrência Tab */}
        <TabsContent value="competitors">
          {loading === 'competitors' ? <LoadingState /> : cache.competitors ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-foreground">Análise Competitiva</h4>
                <Button variant="ghost" size="sm" onClick={() => refresh('competitors')}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{cache.competitors.summary}</p>

              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase">Concorrentes</h5>
                {cache.competitors.competitors.map((c, i) => (
                  <div key={i} className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <p className="font-medium text-sm text-foreground">{c.name}</p>
                    <p className="text-xs text-[#EF3333] mt-1">✓ {c.strength}</p>
                    <p className="text-xs text-red-400">✗ {c.weakness}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase">Diferenciais Sugeridos</h5>
                <div className="flex flex-wrap gap-2">
                  {cache.competitors.differentials.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase">Oportunidades</h5>
                {cache.competitors.opportunities.map((o, i) => (
                  <p key={i} className="text-sm text-foreground">💡 {o}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">Analise os concorrentes desta empresa e descubra oportunidades.</p>
              <Button onClick={() => fetchAnalysis('competitors')} className="gradient-primary text-primary-foreground">
                <Swords className="w-4 h-4 mr-2" /> Analisar Concorrência
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Score Tab */}
        <TabsContent value="score">
          {loading === 'score' ? <LoadingState /> : cache.score ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-foreground">Score de Qualificação</h4>
                <Button variant="ghost" size="sm" onClick={() => refresh('score')}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
                </Button>
              </div>

              <div className="text-center py-4">
                <span className={`text-5xl font-bold ${scoreColor(cache.score.totalScore)}`}>
                  {cache.score.totalScore}
                </span>
                <span className="text-lg text-muted-foreground">/100</span>
                <div className="mt-2">
                  <Badge className={`${priorityColor(cache.score.priority)} border`}>
                    Prioridade {cache.score.priority}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(cache.score.breakdown).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{val.reason}</span>
                      <span className="text-foreground font-medium">{val.score}/{val.max}</span>
                    </div>
                    <Progress value={(val.score / val.max) * 100} className="h-2" />
                  </div>
                ))}
              </div>

              <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                <p className="text-sm text-foreground">{cache.score.recommendation}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">Pontue este lead de 0 a 100 com base no potencial de conversão.</p>
              <Button onClick={() => fetchAnalysis('score')} className="gradient-primary text-primary-foreground">
                <BarChart3 className="w-4 h-4 mr-2" /> Calcular Score
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Perfil Tab */}
        <TabsContent value="profile">
          {loading === 'profile' ? <LoadingState /> : cache.profile ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-foreground">Resumo do Perfil</h4>
                <Button variant="ghost" size="sm" onClick={() => refresh('profile')}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
                </Button>
              </div>

              <p className="text-sm text-foreground">{cache.profile.overview}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground">Público-alvo</p>
                  <p className="text-sm font-medium text-foreground">{cache.profile.targetAudience}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground">Porte</p>
                  <p className="text-sm font-medium text-foreground capitalize">{cache.profile.estimatedSize}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground">Decisor</p>
                  <p className="text-sm font-medium text-foreground">{cache.profile.decisionMaker}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground">Melhor horário</p>
                  <p className="text-sm font-medium text-foreground">{cache.profile.bestApproachTime}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Forças</h5>
                  {cache.profile.strengths.map((s, i) => (
                    <p key={i} className="text-sm text-[#EF3333]">✓ {s}</p>
                  ))}
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Desafios</h5>
                  {cache.profile.challenges.map((c, i) => (
                    <p key={i} className="text-sm text-yellow-400">⚠ {c}</p>
                  ))}
                </div>
              </div>

              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">💡 Insight Estratégico</p>
                <p className="text-sm text-foreground">{cache.profile.insights}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">Gere um resumo executivo completo desta empresa.</p>
              <Button onClick={() => fetchAnalysis('profile')} className="gradient-primary text-primary-foreground">
                <User className="w-4 h-4 mr-2" /> Gerar Perfil
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
