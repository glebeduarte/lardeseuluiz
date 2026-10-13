import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";
import { maskPhone, maskDate, parseDateBRToISO, isValidDateBR } from "@/lib/masks";
import { useEscolhaMaca, buscarMacasAtivas, encerrarPorTroca } from "@/components/EscolhaMacaDialog";

type Props = {
  macaId: string;
  macaNome: string;
  trigger?: React.ReactNode;
};

export function AtribuirConsulenteDialog({ macaId, macaNome, trigger }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [escolherMaca, escolhaEl] = useEscolhaMaca();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState({ nome: "", telefone: "", data_nascimento: "" });
  const [duplicatas, setDuplicatas] = useState<Array<{ id: string; nome: string; telefone: string | null }>>([]);

  const { data: encontrados } = useQuery({
    queryKey: ["busca-consulentes", busca],
    enabled: open && busca.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulentes")
        .select("id, nome, telefone, dialogo_pendente")
        .ilike("nome", `%${busca.trim()}%`)
        .limit(15);
      if (error) throw error;
      return data;
    },
  });

  const reset = () => {
    setBusca("");
    setNovo({ nome: "", telefone: "", data_nascimento: "" });
    setDuplicatas([]);
  };

  const criarDesignacao = async (consulente_id: string) => {
    const { error } = await supabase.from("designacoes").insert({
      consulente_id,
      maca_id: macaId,
      dialogador_id: user?.id,
      status: "ativa",
    });
    if (error) throw error;
  };

  const designarExistente = async (id: string, nome?: string) => {
    setBusy(true);
    try {
      const ativas = await buscarMacasAtivas(id);
      if (ativas.some((a) => a.maca_id === macaId)) {
        toast.error("Consulente já está designado nesta maca.");
        return;
      }
      let escolha: "adicionar" | "trocar" | null = null;
      if (ativas.length > 0) {
        escolha = await escolherMaca({ nome: nome ?? "O consulente", atuais: ativas.map((a) => a.nome), nova: macaNome });
        if (!escolha) return;
      }
      await criarDesignacao(id);
      if (escolha === "trocar") await encerrarPorTroca(ativas.map((a) => a.id));
      const anteriores = ativas.map((a) => a.nome).join(", ");
      if (escolha === "trocar") toast.success(`Consulente trocado para ${macaNome}`, { description: `Saiu de ${anteriores} e agora está somente em ${macaNome}.` });
      else if (escolha === "adicionar") toast.success(`Maca ${macaNome} adicionada`, { description: `O consulente agora está em ${anteriores} e ${macaNome}.` });
      else toast.success("Consulente designado à maca");
      qc.invalidateQueries({ queryKey: ["maca-lista"] });
      qc.invalidateQueries({ queryKey: ["recepcao-macas"] });
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error(friendlyDbError(e));
    } finally {
      setBusy(false);
    }
  };

  const criarRapido = async (ignorarDuplicatas = false) => {
    if (!novo.nome.trim()) {
      return toast.error("Preencha o nome");
    }
    if (novo.data_nascimento && !isValidDateBR(novo.data_nascimento)) {
      return toast.error("Data de nascimento inválida. Use o formato dd/mm/aaaa com uma data real.");
    }
    setBusy(true);
    try {
      if (!ignorarDuplicatas) {
        // Avisa se já existe cadastro parecido (mesmo telefone ou nome parecido).
        const foneDigits = novo.telefone.replace(/\D/g, "");
        let query = supabase.from("consulentes").select("id, nome, telefone").limit(5);
        if (foneDigits.length >= 8) {
          query = query.or(`nome.ilike.%${novo.nome.trim()}%,telefone.ilike.%${foneDigits}%`);
        } else {
          query = query.ilike("nome", `%${novo.nome.trim()}%`);
        }
        const { data: parecidos } = await query;
        const filtrados = (parecidos ?? []).filter(
          (c) => c.nome.toLowerCase() === novo.nome.trim().toLowerCase() ||
            (foneDigits.length >= 8 && c.telefone?.replace(/\D/g, "") === foneDigits),
        );
        if (filtrados.length > 0) {
          setDuplicatas(filtrados);
          setBusy(false);
          return;
        }
      }
      const { data, error } = await supabase
        .from("consulentes")
        .insert({
          nome: novo.nome.trim(),
          telefone: novo.telefone.trim() ? maskPhone(novo.telefone.trim()) : null,
          data_nascimento: novo.data_nascimento ? parseDateBRToISO(novo.data_nascimento) : null,
          dialogo_pendente: true,
          dialogador_id: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      await criarDesignacao(data.id);
      toast.success("Consulente cadastrado e designado. Diálogo ficou pendente.");
      qc.invalidateQueries({ queryKey: ["maca-lista"] });
      qc.invalidateQueries({ queryKey: ["recepcao-macas"] });
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>{escolhaEl}
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" /> Atribuir consulente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atribuir à {macaNome}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="existente">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="existente">
              <Search className="h-4 w-4 mr-1" /> Existente
            </TabsTrigger>
            <TabsTrigger value="novo">
              <UserPlus className="h-4 w-4 mr-1" /> Cadastro rápido
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existente" className="space-y-3">
            <Input
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
            />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {busca.trim().length < 2 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Digite ao menos 2 letras para buscar.
                </p>
              )}
              {encontrados?.length === 0 && busca.trim().length >= 2 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum encontrado. Use "Cadastro rápido".
                </p>
              )}
              {encontrados?.map((c) => (
                <button
                  key={c.id}
                  disabled={busy}
                  onClick={() => designarExistente(c.id, c.nome)}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted flex items-center justify-between gap-2 transition-colors border border-transparent hover:border-primary/20"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {c.nome}
                      {c.dialogo_pendente && (
                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">Diálogo pendente</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.telefone}</div>
                  </div>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Designar →</span>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="novo" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              O consulente será criado com diálogo fraterno pendente, para ser preenchido depois pelo dialogador.
            </p>
            <div className="space-y-2">
              <Label htmlFor="qc-nome">Nome *</Label>
              <Input
                id="qc-nome"
                value={novo.nome}
                onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="qc-tel">Telefone *</Label>
                <Input
                  id="qc-tel"
                  value={novo.telefone}
                  onChange={(e) => setNovo((n) => ({ ...n, telefone: maskPhone(e.target.value) }))}
                  placeholder="(11) 90000-0000"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qc-dt">Nascimento *</Label>
                <Input
                  id="qc-dt"
                  value={novo.data_nascimento}
                  onChange={(e) => setNovo((n) => ({ ...n, data_nascimento: maskDate(e.target.value) }))}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  maxLength={10}
                />
              </div>
            </div>
            {duplicatas.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-100 p-3 space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  Encontramos {duplicatas.length === 1 ? "um cadastro parecido" : `${duplicatas.length} cadastros parecidos`}. Confira se não é a mesma pessoa:
                </p>
                <div className="space-y-1">
                  {duplicatas.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      disabled={busy}
                      onClick={() => { setDuplicatas([]); void designarExistente(d.id, d.nome); }}
                      className="w-full text-left px-3 py-2 rounded-md bg-card border border-amber-300 hover:border-primary/40 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-sm">{d.nome}</div>
                        <div className="text-xs text-muted-foreground">{d.telefone ?? "sem telefone"}</div>
                      </div>
                      <span className="text-xs font-medium text-primary">Usar este cadastro →</span>
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={busy}
                  onClick={() => { setDuplicatas([]); void criarRapido(true); }}
                >
                  Não é a mesma pessoa — cadastrar mesmo assim
                </Button>
              </div>
            )}
            <Button onClick={() => void criarRapido()} disabled={busy} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" /> Cadastrar e designar
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog></>
  );
}
