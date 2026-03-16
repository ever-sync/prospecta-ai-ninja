import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Loader2, Play, Search, PlusCircle, Trash2,
  ChevronDown, ChevronUp, Globe, Phone, Star, AlertTriangle,
} from "lucide-react";
import { invokeEdgeFunction } from "@/lib/invoke-edge-function";

type RobotTriggers = {
  noPixel: boolean;
  noWebsite: boolean;
  lowRating: boolean;
  lowRatingThreshold: number;
  limitResults: number;
};

type LeadResult = {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  rating: number | null;
  signalFlags: string[];
  onlinePresence: {
    score: number;
    classification: string;
    weaknesses: string[];
  };
};

type RobotTask = {
  id: string;
  user_id: string;
  search_term: string;
  location: string;
  status: "pending" | "running" | "completed" | "failed";
  triggers: RobotTriggers;
  results: LeadResult[] | null;
  created_at: string;
  completed_at: string | null;
};

const DEFAULT_TRIGGERS: RobotTriggers = {
  noPixel: true,
  noWebsite: false,
  lowRating: true,
  lowRatingThreshold: 4.5,
  limitResults: 15,
};

function StatusBadge({ status }: { status: RobotTask["status"] }) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Aguardando</Badge>;
    case "running":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 animate-pulse">Processando...</Badge>;
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completado</Badge>;
    case "failed":
      return <Badge variant="destructive">Falhou</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function LeadCard({ lead }: { lead: LeadResult }) {
  return (
    <div className="bg-white rounded-lg border border-[#ececf0] p-3 text-sm space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-[#111115] leading-tight">{lead.name}</span>
        {lead.rating !== null && (
          <span className="flex items-center gap-1 text-amber-600 text-xs shrink-0">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {lead.rating}
          </span>
        )}
      </div>
      <div className="text-xs text-zinc-500">{lead.category} · {lead.address}</div>
      <div className="flex flex-wrap gap-2 text-xs">
        {lead.phone && (
          <span className="flex items-center gap-1 text-zinc-600">
            <Phone className="w-3 h-3" /> {lead.phone}
          </span>
        )}
        {lead.website ? (
          <a
            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Globe className="w-3 h-3" /> {lead.website}
          </a>
        ) : (
          <span className="flex items-center gap-1 text-zinc-400 italic">
            <Globe className="w-3 h-3" /> Sem site
          </span>
        )}
      </div>
      {lead.signalFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {lead.signalFlags.map((flag, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[11px]">
              <AlertTriangle className="w-2.5 h-2.5" /> {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onDelete,
}: {
  task: RobotTask;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasResults = task.status === "completed" && task.results && task.results.length > 0;

  return (
    <div className="bg-white rounded-xl border border-[#ececf0] overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row gap-3 justify-between">
        <div className="min-w-0">
          <div className="font-medium text-[#111115] truncate">{task.search_term}</div>
          <div className="text-sm text-zinc-500">{task.location}</div>
        </div>

        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
          <StatusBadge status={task.status} />
          <div className="text-xs text-zinc-400">
            {new Date(task.created_at).toLocaleDateString("pt-BR")} às{" "}
            {new Date(task.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasResults && (
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 h-8 text-xs"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {task.results!.length} leads
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expanded && hasResults && (
        <div className="border-t border-[#ececf0] bg-[#fafafc] p-3 grid sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
          {task.results!.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RobotsSetup() {
  const { session } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<RobotTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [triggers, setTriggers] = useState<RobotTriggers>(DEFAULT_TRIGGERS);

  const fetchTasks = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await (supabase as any)
        .from("robot_tasks")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-refresh while any task is running
  useEffect(() => {
    const hasRunning = tasks.some((t) => t.status === "running" || t.status === "pending");
    if (!hasRunning) return;
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [tasks, fetchTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !location.trim()) {
      toast({ title: "Atenção", description: "Preencha o nicho e a localização.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const { error } = await (supabase as any).from("robot_tasks").insert({
        user_id: session?.user?.id,
        search_term: searchTerm.trim(),
        location: location.trim(),
        triggers,
      });
      if (error) throw error;
      toast({ title: "Robô engatilhado!", description: "Busca adicionada à fila." });
      setSearchTerm("");
      setLocation("");
      await fetchTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerWorker = async () => {
    try {
      setRunning(true);
      toast({ title: "Executando robô...", description: "Processando próxima tarefa da fila." });
      const { data, error } = await invokeEdgeFunction("robot-worker", { body: {} });
      if (error) throw error;
      const msg = (data as { message?: string; resultsCount?: number })?.message
        ?? `${(data as { resultsCount?: number })?.resultsCount ?? 0} leads encontrados.`;
      toast({ title: "Execução finalizada", description: msg });
      await fetchTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("robot_tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao deletar", description: msg, variant: "destructive" });
    }
  };

  const toggle = (key: keyof Pick<RobotTriggers, "noPixel" | "noWebsite" | "lowRating">) =>
    setTriggers((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="container py-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A] flex items-center gap-3">
            <Bot className="w-8 h-8 text-[#EF3333]" />
            Máquina de Listas Passivas
          </h1>
          <p className="mt-1 text-[#5f5f67]">
            Mineração noturna de leads com métricas fracas.
          </p>
        </div>
        <Button
          onClick={handleTriggerWorker}
          disabled={running}
          variant="outline"
          className="border-[#ef3333]/30 text-[#e02626] bg-[#fff5f5] hover:bg-[#ffeaea]"
        >
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          Forçar Execução (Teste)
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="p-6 md:col-span-1 shadow-sm border-[#e0e0e6] bg-white h-fit">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <PlusCircle className="w-5 h-5 text-zinc-500" /> Nova Busca
          </h2>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <Label>Nicho / Termo</Label>
              <Input
                placeholder="ex: Clínicas Odontológicas"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                placeholder="ex: Moema, São Paulo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="bg-[#fafafc] rounded-xl p-3 border border-border space-y-3">
              <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wide">Gatilhos</p>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={triggers.noPixel}
                  onCheckedChange={() => toggle("noPixel")}
                />
                <span className="text-sm text-zinc-700">Sem pixel de rastreio</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={triggers.noWebsite}
                  onCheckedChange={() => toggle("noWebsite")}
                />
                <span className="text-sm text-zinc-700">Sem site próprio</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={triggers.lowRating}
                  onCheckedChange={() => toggle("lowRating")}
                />
                <span className="text-sm text-zinc-700">
                  Nota abaixo de{" "}
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={triggers.lowRatingThreshold}
                    onChange={(e) =>
                      setTriggers((prev) => ({ ...prev, lowRatingThreshold: parseFloat(e.target.value) || 4.5 }))
                    }
                    className="w-12 px-1 py-0.5 border border-zinc-300 rounded text-sm text-center ml-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                </span>
              </label>

              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <span className="text-xs text-zinc-500">Máx. resultados</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={triggers.limitResults}
                  onChange={(e) =>
                    setTriggers((prev) => ({ ...prev, limitResults: parseInt(e.target.value) || 15 }))
                  }
                  className="w-14 px-1 py-0.5 border border-zinc-300 rounded text-sm text-center"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full bg-[#111115] hover:bg-[#1d1d24]">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Adicionar à Fila
            </Button>
          </form>
        </Card>

        {/* Task list */}
        <Card className="p-0 md:col-span-2 shadow-sm border-[#e0e0e6] bg-[#fafafc] overflow-hidden">
          <div className="p-4 border-b border-[#ececf0] bg-white flex items-center justify-between">
            <h2 className="font-semibold text-lg">Caçadas Programadas</h2>
            <Badge variant="outline" className="font-mono">{tasks.length} tarefa(s)</Badge>
          </div>
          <div className="p-4 flex flex-col gap-3 min-h-[300px]">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-zinc-500 text-sm">
                <Bot className="w-8 h-8 mb-2 opacity-20" />
                Nenhum robô na fila. Crie a primeira caçada ao lado!
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard key={task.id} task={task} onDelete={handleDeleteTask} />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
