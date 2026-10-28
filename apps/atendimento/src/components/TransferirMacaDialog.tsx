import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Transferência de maca pela ficha do consulente.
// Pergunta para qual maca vai e se ele sai da maca atual ou fica nas duas.
// A mudança inteira acontece em atendimento.transferir_maca(), que também grava o histórico.

export type MacaAtiva = { designacaoId: string; macaId: string; numero: number; nome: string; cor_hex: string; feitas: number; totais: number };

type MacaOpcao = { id: string; numero: number; nome: string; cor_hex: string; dia: string; lotacao_max: number; ativos: number };

const diaCurto = (d: string) => (d === "sabado" ? "Sábado" : d === "terca" ? "Terça" : "");

export function TransferirMacaDialog({
  aberto, aoFechar, consulenteId, consulenteNome, ativas, aoConcluir,
}: {
  aberto: boolean;
  aoFechar: () => void;
  consulenteId: string;
  consulenteNome: string;
  ativas: MacaAtiva[];
  aoConcluir: () => void;
}) {
  const [origem, setOrigem] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [modo, setModo] = useState<"trocar" | "adicionar" | "">("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setOrigem(ativas.length === 1 ? ativas[0].designacaoId : "");
    setDestino("");
    setModo("");
    setMotivo("");
  }, [aberto, ativas]);

  const { data: macas, isLoading } = useQuery({
    queryKey: ["macas-transferencia"],
    enabled: aberto,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("macas_para_transferencia");
      if (error) throw error;
      return (data ?? []) as MacaOpcao[];
    },
  });

  const atual = ativas.find((a) => a.designacaoId === origem);
  const jaEsta = useMemo(() => new Set(ativas.map((a) => a.macaId)), [ativas]);
  const escolhida = (macas ?? []).find((m) => m.id === destino);
  const pronto = !!atual && !!escolhida && !!modo;

  const confirmar = async () => {
    if (!pronto) return;
    setEnviando(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("transferir_maca", {
      p_consulente: consulenteId, p_origem: origem, p_destino: destino, p_modo: modo, p_motivo: motivo || null,
    });
    setEnviando(false);
    if (error) return toast.error(String(error.message).replace(/^.*?ERROR:\s*/, ""));
    toast.success((data as { mensagem?: string })?.mensagem ?? "Pronto.");
    aoConcluir();
    aoFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o && !enviando) aoFechar(); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-['Playfair_Display'] text-xl">Transferir de maca</DialogTitle>
          <DialogDescription>{consulenteNome}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {ativas.length > 1 && (
            <Passo n={1} titulo="De qual maca?">
              <div className="grid gap-2">
                {ativas.map((a) => (
                  <Opcao key={a.designacaoId} ativo={origem === a.designacaoId} onClick={() => setOrigem(a.designacaoId)}>
                    <Selo cor={a.cor_hex} numero={a.numero} />
                    <span className="min-w-0 flex-1 truncate font-medium">{a.nome}</span>
                    <span className="text-xs text-muted-foreground">{a.feitas} de {a.totais}</span>
                  </Opcao>
                ))}
              </div>
            </Passo>
          )}
          {ativas.length === 1 && atual && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Hoje na</span>
              <Selo cor={atual.cor_hex} numero={atual.numero} />
              <span className="font-medium">{atual.nome}</span>
              <span className="ml-auto text-xs text-muted-foreground">{atual.feitas} de {atual.totais} sessões</span>
            </div>
          )}

          <Passo n={ativas.length > 1 ? 2 : 1} titulo="Para qual maca?">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando macas...</p>
            ) : (
              <div className="grid max-h-64 gap-1.5 overflow-y-auto pr-1">
                {(macas ?? []).map((m) => {
                  const lotada = m.ativos >= m.lotacao_max;
                  const mesma = jaEsta.has(m.id);
                  return (
                    <Opcao key={m.id} ativo={destino === m.id} desabilitado={lotada || mesma} onClick={() => setDestino(m.id)}>
                      <Selo cor={m.cor_hex} numero={m.numero} />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{m.nome}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{diaCurto(m.dia)}</span>
                      </span>
                      <span className={cn("text-xs tabular-nums", lotada ? "text-destructive" : "text-muted-foreground")}>
                        {mesma ? "já está" : lotada ? "lotada" : `${m.ativos}/${m.lotacao_max}`}
                      </span>
                    </Opcao>
                  );
                })}
              </div>
            )}
          </Passo>

          <Passo n={ativas.length > 1 ? 3 : 2} titulo={atual ? `Ele sai da Maca ${atual.numero}?` : "Ele sai da maca atual?"}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Opcao ativo={modo === "trocar"} onClick={() => setModo("trocar")} alto>
                <ArrowRightLeft className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-left">
                  <span className="block font-medium">Sim, sai da atual</span>
                  <span className="block text-xs text-muted-foreground">Fica só na maca nova</span>
                </span>
              </Opcao>
              <Opcao ativo={modo === "adicionar"} onClick={() => setModo("adicionar")} alto>
                <Plus className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-left">
                  <span className="block font-medium">Não, fica nas duas</span>
                  <span className="block text-xs text-muted-foreground">Atendido nas duas macas</span>
                </span>
              </Opcao>
            </div>
          </Passo>

          <label className="grid gap-1.5 text-sm font-medium">
            Motivo <span className="font-normal text-muted-foreground">(opcional, fica no histórico)</span>
            <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: mudou o dia em que pode vir" />
          </label>

          {pronto && (
            <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              {modo === "trocar"
                ? <>Sai da <strong>Maca {atual!.numero}</strong> e entra na <strong>Maca {escolhida!.numero} · {escolhida!.nome}</strong>. A contagem de sessões começa do zero na maca nova.</>
                : <>Continua na <strong>Maca {atual!.numero}</strong> e passa a ser atendido também na <strong>Maca {escolhida!.numero} · {escolhida!.nome}</strong>.</>}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={aoFechar} disabled={enviando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!pronto || enviando}>{enviando ? "Salvando..." : "Confirmar transferência"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">{n}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Opcao({ ativo, desabilitado, alto, onClick, children }: {
  ativo: boolean; desabilitado?: boolean; alto?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={desabilitado}
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border px-3 text-sm transition-colors",
        alto ? "py-3" : "py-2",
        ativo ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:bg-muted/60",
        desabilitado && "cursor-not-allowed opacity-45 hover:bg-transparent",
      )}
    >
      {children}
      {ativo && <Check className="ml-1 h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

function Selo({ cor, numero }: { cor: string; numero: number }) {
  return (
    <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: cor }}>
      {numero}
    </span>
  );
}
