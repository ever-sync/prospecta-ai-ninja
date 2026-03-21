import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  created_at: string | null;
  document_number: string | null;
  document_type: string | null;
}

const UsersManager = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar usuarios',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.company_name?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Email', 'Nome Completo', 'Empresa', 'Telefone', 'Documento', 'Tipo Doc', 'Data Cadastro'];
    const rows = filteredUsers.map((user) => [
      user.id,
      user.email || '',
      user.full_name || '',
      user.company_name || '',
      user.phone || '',
      user.document_number || '',
      user.document_type || '',
      user.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_prospecta_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToXLSX = async () => {
    setExportingXlsx(true);
    try {
      const XLSX = await import('xlsx');
      const data = filteredUsers.map((user) => ({
        ID: user.id,
        Email: user.email || '',
        'Nome Completo': user.full_name || '',
        Empresa: user.company_name || '',
        Telefone: user.phone || '',
        Documento: user.document_number || '',
        'Tipo Doc': user.document_type || '',
        'Data Cadastro': user.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
      XLSX.writeFile(workbook, `usuarios_prospecta_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao exportar XLSX',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setExportingXlsx(false);
    }
  };

  if (loading && users.length === 0) {
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
            <Users className="h-5 w-5 text-primary" />
            Gestao de Usuarios
          </h2>
          <p className="text-sm text-muted-foreground">Lista completa de usuarios cadastrados na plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToXLSX} className="gap-2" disabled={exportingXlsx}>
            {exportingXlsx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar XLSX
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, empresa ou telefone..."
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
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.full_name || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{user.email || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.company_name || 'N/A'}</TableCell>
                    <TableCell className="text-sm">{user.phone || 'N/A'}</TableCell>
                    <TableCell className="text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhum usuario encontrado.
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

export default UsersManager;
