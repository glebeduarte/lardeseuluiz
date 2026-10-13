import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { toTitleCaseName } from "@/lib/text";
import { maskPhone } from "@/lib/masks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, Search } from "lucide-react";

type Props = { trigger?: React.ReactNode };

type Trabalhador = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  data_nascimento: string | null;
  como_chamar: string | null;
  roles: string[];
};

export function TrabalhadorTratamentoDialog({ trigger }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState(false);
  const [completar, setCompletar] = useState<Trabalhador | null>(null);
  const [extra, setExtra] = useState({ telefone: "", data_nascimento: "" });

  const { data: trabalhadores, isLoading } = useQuery({
    queryKey: ["trabalhadores-ativos"],
    enabled: open,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nome, email, telefone, data_nascimento, como_chamar")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;
      const rolesMap = new Map<string, string[]>();
      rolesData?.forEach((r) => {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });
      return (profiles ?? [])
        .map((p) => ({ ...p, roles: rolesMap.get(p.id) ?? [] })) as Trabalhador[];
    },
  });

  const filtrados = (trabalhadores ?? []).filter((t) =>
    !busca.trim()
      ? true
      : t.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (t.email ?? "").toLowerCase().includes(busca.toLowerCase()),
  );

  const reset = () => {
    setBusca("");
    setCompletar(null);
    setExtra({ telefone: "", data_nascimento: "" });
  };

  const criarEDesignar = async (t: Trabalhador, overrides?: { telefone?: string; data_nascimento?: string }) => {
    const telefone = overrides?.telefone ?? t.telefone ?? "";
    const data_nascimento = overrides?.data_nascimento ?? t.data_nascimento ?? "";
    if (!telefone || !data_nascimento) {
      setCompletar(t);
      setExtra({ telefone: telefone, data_nascimento: data_nascimento });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("consulentes")
        .insert({
          nome: toTitleCaseName(t.nome),
          telefone: maskPhone(telefone),
          data_nascimento,
          dialogador_id: user?.id,
          dialogo_pendente: false,
          encaminhamento_maca: true,
          trabalhador: true,
          outras_informacoes: `Trabalhador em tratamento (${t.email}).`,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Trabalhador registrado como atendido. Selecione a maca.");
      setOpen(false);
      reset();
      navigate({ to: "/dialogo/$consulenteId/designar", params: { consulenteId: data.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="border-2">
            <HeartPulse className="h-4 w-4 mr-1.5" /> Trabalhador para tratamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Trabalhador para tratamento</DialogTitle>
          <DialogDescription>
            Selecione um trabalhador para registrá-lo como atendido e designá-lo a uma maca.
          </DialogDescription>
        </DialogHeader>

        {!completar && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {isLoading && (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              )}
              {!isLoading && filtrados.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum trabalhador encontrado.
                </p>
              )}
              {filtrados.map((t) => (
                <button
                  key={t.id}
                  disabled={busy}
                  onClick={() => criarEDesignar(t)}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-secondary flex items-center justify-between gap-2 transition-colors border border-transparent hover:border-primary/20"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.email}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px] capitalize">{r}</Badge>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full shrink-0">
                    Selecionar →
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {completar && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Complete os dados que faltam no cadastro de <strong>{completar.nome}</strong> para prosseguir.
            </p>
            <div className="space-y-2">
              <Label htmlFor="tt-tel">Telefone *</Label>
              <Input
                id="tt-tel"
                value={extra.telefone}
                onChange={(e) => setExtra((s) => ({ ...s, telefone: maskPhone(e.target.value) }))}
                placeholder="(11) 90000-0000"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt-dt">Data de nascimento *</Label>
              <Input
                id="tt-dt"
                type="date"
                value={extra.data_nascimento}
                onChange={(e) => setExtra((s) => ({ ...s, data_nascimento: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCompletar(null)} className="border-2">
                Voltar
              </Button>
              <Button
                disabled={busy || !extra.telefone || !extra.data_nascimento}
                onClick={() => criarEDesignar(completar, extra)}
                className="bg-brand-blue text-white hover:bg-brand-blue-dark"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
