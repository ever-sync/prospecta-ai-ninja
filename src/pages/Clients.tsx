import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Star,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ClientProfileSheet } from '@/components/crm/ClientProfileSheet';

type Client = {
  presentation_id: string;
  public_id: string;
  business_name: string | null;
  business_category: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_website: string | null;
  business_address: string | null;
  analysis_score: number | null;
  last_response_at: string | null;
  created_at: string | null;
  view_count: number | null;
  note_count: number | null;
};

function normalizeWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ScoreBadge = ({ score }: { score: number | null }) => {
  if (score == null) return null;
  const cls =
    score >= 80 ? 'bg-[#effaf3] text-[#1c7f43] border-[#b8e9cb]' :
    score >= 60 ? 'bg-[#fffbeb] text-[#92600a] border-[#f6e3b0]' :
    'bg-[#fff4f6] text-[#a22639] border-[#f6c3ca]';
  return (
    <Badge variant="outline" className={cn('rounded-full text-xs', cls)}>
      Score {score}
    </Badge>
  );
};

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const SNAPSHOT_COLS = 'presentation_id, public_id, business_name, business_category, business_phone, business_email, business_website, business_address, analysis_score, last_response_at, created_at, view_count, note_count';

    const load = async () => {
      setLoading(true);

      // 1. Leads que aceitaram a proposta
      const { data: acceptedData } = await supabase
        .from('crm_lead_snapshot')
        .select(SNAPSHOT_COLS)
        .eq('user_id', user.id)
        .eq('lead_response', 'accepted');

      // 2. Leads que foram incluídos em campanhas
      const { data: userCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', user.id);

      const campaignIds = (userCampaigns || []).map((c: { id: string }) => c.id);
      let campaignLeadsData: Client[] = [];

      if (campaignIds.length > 0) {
        const { data: cpData } = await supabase
          .from('campaign_presentations')
          .select('presentation_id')
          .in('campaign_id', campaignIds);

        const presIds = [...new Set((cpData || []).map((r: { presentation_id: string }) => r.presentation_id))];

        if (presIds.length > 0) {
          const { data: campSnap } = await supabase
            .from('crm_lead_snapshot')
            .select(SNAPSHOT_COLS)
            .eq('user_id', user.id)
            .in('presentation_id', presIds);
          campaignLeadsData = (campSnap || []) as Client[];
        }
      }

      if (!active) return;

      // 3. Merge e deduplica por presentation_id, mais recentes primeiro
      const merged = new Map<string, Client>();
      for (const c of [...(acceptedData || []) as Client[], ...campaignLeadsData]) {
        if (!merged.has(c.presentation_id)) merged.set(c.presentation_id, c);
      }
      const sorted = [...merged.values()].sort((a, b) =>
        new Date(b.last_response_at || b.created_at || 0).getTime() -
        new Date(a.last_response_at || a.created_at || 0).getTime()
      );

      setClients(sorted);
      setLoading(false);
    };

    void load();
    return () => { active = false; };
  }, [user]);

  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.business_name?.toLowerCase().includes(q) ||
      c.business_category?.toLowerCase().includes(q) ||
      c.business_phone?.includes(q) ||
      c.business_email?.toLowerCase().includes(q)
    );
  });

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8a8a92]">Carteira</p>
            <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A]">Clientes</h1>
            <p className="mt-1 text-sm text-[#696971]">
              Leads com proposta gerada ou enviados em campanhas.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[#ececf0] bg-white px-5 py-3">
            <Star className="h-5 w-5 text-[#EF3333]" />
            <span className="text-2xl font-bold text-[#1A1A1A]">{loading ? '-' : clients.length}</span>
            <span className="text-sm text-[#8a8a92]">clientes</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8a92]" />
          <Input
            placeholder="Buscar por nome, categoria, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-2xl border-[#ececf0] bg-white pl-10 shadow-none focus-visible:ring-1 focus-visible:ring-[#EF3333]"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px] rounded-[22px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#dcdce0] bg-white py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f5f7]">
              <Building2 className="h-7 w-7 text-[#8a8a92]" />
            </div>
            <p className="mt-4 text-base font-semibold text-[#1A1A1A]">
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
            </p>
            <p className="mt-1 max-w-xs text-sm text-[#8a8a92]">
              {search
                ? 'Tente outro termo de busca.'
                : 'Leads com proposta gerada ou enviados em campanhas aparecem aqui.'}
            </p>
            {!search && (
              <Button
                className="mt-6 rounded-xl bg-[#EF3333] text-white hover:bg-[#d92f2f]"
                onClick={() => navigate('/crm')}
              >
                Ir para o CRM
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => (
              <div
                key={client.presentation_id}
                className="flex flex-col justify-between rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[#1A1A1A]">
                      {client.business_name || 'Sem nome'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#8a8a92]">
                      {client.business_category || 'Sem categoria'}
                    </p>
                  </div>
                  <ScoreBadge score={client.analysis_score} />
                </div>

                {/* Contacts */}
                <div className="mt-4 space-y-2">
                  {client.business_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#8a8a92]" />
                      <span className="flex-1 truncate text-sm text-[#1A1A1A]">{client.business_phone}</span>
                      <button
                        type="button"
                        className="rounded-lg p-1 text-[#8a8a92] hover:bg-[#f5f5f7] hover:text-[#1A1A1A]"
                        onClick={() => copyText(client.business_phone!, 'Telefone')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {client.business_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-[#8a8a92]" />
                      <span className="flex-1 truncate text-sm text-[#1A1A1A]">{client.business_email}</span>
                      <button
                        type="button"
                        className="rounded-lg p-1 text-[#8a8a92] hover:bg-[#f5f5f7] hover:text-[#1A1A1A]"
                        onClick={() => copyText(client.business_email!, 'Email')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#8a8a92]">
                  <span>Aceitou em {formatDate(client.last_response_at || client.created_at)}</span>
                  {(client.view_count ?? 0) > 0 && (
                    <span>· {client.view_count} visualização{client.view_count !== 1 ? 'ões' : ''}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-[#f0f0f3] space-y-2">
                  <Button
                    size="sm"
                    className="w-full rounded-xl text-xs bg-[#EF3333] hover:bg-[#d92f2f] text-white"
                    onClick={() => { setSelectedClient(client); setProfileOpen(true); }}
                  >
                    <UserRound className="mr-1.5 h-3.5 w-3.5" />
                    Ver Perfil
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl text-xs"
                      onClick={() => window.open(`/presentation/${client.public_id}`, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Proposta
                    </Button>
                    {client.business_phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl text-xs text-green-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                        onClick={() =>
                          window.open(
                            `https://web.whatsapp.com/send?phone=${normalizeWhatsApp(client.business_phone!)}`,
                            '_blank',
                            'noopener,noreferrer'
                          )
                        }
                      >
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl text-xs"
                      onClick={() => navigate(`/crm?lead=${client.presentation_id}`)}
                    >
                      CRM
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClient && (
        <ClientProfileSheet
          open={profileOpen}
          onOpenChange={setProfileOpen}
          presentationId={selectedClient.presentation_id}
          publicId={selectedClient.public_id}
          businessName={selectedClient.business_name}
          businessCategory={selectedClient.business_category}
          businessPhone={selectedClient.business_phone}
          businessEmail={selectedClient.business_email}
          businessWebsite={selectedClient.business_website}
          businessAddress={selectedClient.business_address}
          analysisScore={selectedClient.analysis_score}
          acceptedAt={selectedClient.last_response_at || selectedClient.created_at}
        />
      )}
    </div>
  );
}
