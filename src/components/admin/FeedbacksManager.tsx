import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare, Loader2, Star, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Feedback {
  id: string;
  user_id: string | null;
  rating: number;
  message: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    company_name: string | null;
  } | null;
}

interface FeedbackProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
}

const FeedbacksManager = () => {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const enrichFeedbacksWithProfiles = useCallback(async (rows: Feedback[]) => {
    const userIds = [...new Set(rows.map((feedback) => feedback.user_id).filter(Boolean))] as string[];

    if (userIds.length === 0) {
      return rows;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, company_name')
      .in('user_id', userIds);

    if (profilesError) {
      throw profilesError;
    }

    const profilesByUserId = new Map<string, Feedback['profiles']>(
      ((profilesData || []) as FeedbackProfile[]).map((profile) => [
        profile.user_id,
        {
          full_name: profile.full_name,
          email: profile.email,
          company_name: profile.company_name,
        },
      ]),
    );

    return rows.map((feedback) => ({
      ...feedback,
      profiles: feedback.user_id ? profilesByUserId.get(feedback.user_id) ?? null : null,
    }));
  }, []);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const hydratedFeedbacks = await enrichFeedbacksWithProfiles((data || []) as Feedback[]);
      setFeedbacks(hydratedFeedbacks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar feedbacks',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [enrichFeedbacksWithProfiles, toast]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const searchLower = searchTerm.toLowerCase();
    const profile = fb.profiles;
    return (
      fb.message?.toLowerCase().includes(searchLower) ||
      profile?.email?.toLowerCase().includes(searchLower) ||
      profile?.full_name?.toLowerCase().includes(searchLower) ||
      profile?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Email', 'Nome', 'Empresa', 'Nota', 'Mensagem', 'Data'];
    const rows = filteredFeedbacks.map((fb) => [
      fb.id,
      fb.profiles?.email || 'N/A',
      fb.profiles?.full_name || 'N/A',
      fb.profiles?.company_name || 'N/A',
      fb.rating.toString(),
      fb.message || '',
      new Date(fb.created_at).toLocaleString('pt-BR'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `feedbacks_prospecta_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-5 w-5 text-primary" />
            Feedbacks dos Usuários
          </h2>
          <p className="text-sm text-muted-foreground">O que os usuários estão achando da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por mensagem, email ou nome..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="w-[40%]">Mensagem</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.map((fb) => (
                  <TableRow key={fb.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{fb.profiles?.full_name || 'Usuário'}</span>
                        <span className="text-xs text-muted-foreground">{fb.profiles?.email || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{fb.profiles?.company_name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">{fb.rating}</span>
                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-pre-wrap py-3">
                      {fb.message || <span className="italic text-muted-foreground">Sem mensagem</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(fb.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredFeedbacks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum feedback encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbacksManager;
