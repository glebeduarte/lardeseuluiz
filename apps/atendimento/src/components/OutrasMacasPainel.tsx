import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, Radio, Save, ShieldCheck, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isDataEsperadaQuinzenal } from "@/lib/atendimento-dates";
import { cn } from "@/lib/utils";

// "Atendeu consulentes de outra maca?": quando uma maca não se forma no dia e os consulentes
// são redistribuídos, o médium lança aqui a presença e a observação. O registro vai para a
// designação da maca original, então aparece no histórico do tratamento dela.

type Status = "presente" | "ausente" | "falta_justificada" | "atendimento_distancia";
export type OutraMaca = { id: string; numero: number; nome: string; cor_hex: string; ativos: number; mediuns: string[] };
type ConsulenteOutra = {
  id: string; nome: string; frequencia: string; sessoes_totais: number; realizados: number; created_at: string;
  presenca: { status: Status; observacao: string | null; atendido_em_maca_id: string | null } | null;
  datas: { data: string; status: string }[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as any)(fn, args) as Promise<{ data: unknown; error: { message: string } | null }>;
const erro = (m: string) => m.replace(/^.*?ERROR:\s*/i, "");

const TOM: Record<Status, { cartao: string; botao: string; rotulo: string }> = {
  presente: { cartao: "bg-[#e9f7ef] shadow-[inset_0_0_0_2px_#9fd8b9]", botao: "bg-[#157a4a] text-white", rotulo: "Presente" },
  ausente: { cartao: "bg-[#fdeeec] shadow-[inset_0_0_0_2px_#f3b1aa]", botao: "bg-[#b42318] text-white", rotulo: "Falta" },
  falta_justificada: { cartao: "bg-[#fff5d9] shadow-[inset_0_0_0_2px_#f0cf7e]", botao: "bg-[#c98a00] text-white", rotulo: "Justificada" },
  atendimento_distancia: { cartao: "bg-[#e6f4f9] shadow-[inset_0_0_0_2px_#9cd3e3]", botao: "bg-[#0b6c8c] text-white", rotulo: "À distância" },
};
const DIA_COR: Record<string, string> = {
  presente: "bg-[#dff3e7] text-[#157a4a]", ausente: "bg-[#fbe1de] text-[#b42318]",
  falta_justificada: "bg-[#fdeec4] text-[#8a5a00]", atendimento_distancia: "bg-[#d9eef6] text-[#0b6c8c]",
};

export function useOutrasMacas(macaOrigem: string) {
  return useQuery({
    queryKey: ["outras-macas-dia", macaOrigem],
    queryFn: async () => {
      const { data, error } = await rpc("outras_macas_do_dia", { p_maca_origem: macaOrigem });
      if (error) throw new Error(error.message);
      return (data ?? []) as OutraMaca[];
    },
  });
}

export default function OutrasMacasPainel({ macaOrigem, sessaoId, isoDate, dia }: {
  macaOrigem: string; sessaoId: string; isoDate: string; dia?: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [macaSel, setMacaSel] = useState<string | null>(null);
  const { data: macas = [], isLoading } = useOutrasMacas(macaOrigem);
  const maca = macas.find((m) => m.id === macaSel);

  const { data: consulentes = [], isLoading: carregando } = useQuery({
    queryKey: ["consulentes-outra-maca", macaOrigem, macaSel, sessaoId],
    enabled: aberto && !!macaSel,
    queryFn: async () => {
      const { data, error } = await rpc("consulentes_de_outra_maca", { p_maca_origem: macaOrigem, p_maca: macaSel, p_sessao: sessaoId });
      if (error) throw new Error(error.message);
      return (data ?? []) as ConsulenteOutra[];
    },
  });
  const lancadosAqui = consulentes.filter((c) => c.presenca?.atendido_em_maca_id === macaOrigem).length;

  return (
    <section className="rounded-2xl bg-card p-4 shadow-[inset_0_0_0_1px_#e3e8ef]" aria-label="Consulentes de outra maca">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}
        className="w-full flex items-center gap-3 text-left">
        <span className="h-10 w-10 shrink-0 rounded-xl bg-[#eef4fb] text-[#003c7f] grid place-items-center"><Users className="h-5 w-5" /></span>
        <span className="flex-1 min-w-0">
          <strong className="block text-[15px]">Atendeu consulentes de outra maca?</strong>
          <span className="block text-[13px] text-muted-foreground">Quando uma maca não se forma e as pessoas são redistribuídas.</span>
        </span>
        <span className={cn("shrink-0 rounded-lg px-3 h-9 inline-flex items-center gap-1 text-sm font-semibold", aberto ? "bg-[#e9edf3]" : "bg-[#003c7f] text-white")}>
          {aberto ? "Fechar" : "Sim"}<ChevronDown className={cn("h-4 w-4 transition-transform", aberto && "rotate-180")} />
        </span>
      </button>

      {aberto && (
        <div className="mt-4 space-y-3">
          <p className="text-[13px] font-semibold text-muted-foreground">De qual maca?</p>
          {isLoading ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando macas…</p>
            : macas.length === 0 ? <p className="text-sm text-muted-foreground">Não há outras macas neste dia.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {macas.map((m) => (
                <button key={m.id} type="button" onClick={() => setMacaSel(m.id)} aria-pressed={macaSel === m.id}
                  className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                    macaSel === m.id ? "bg-[#003c7f] text-white" : "bg-[#f3f5f8] hover:bg-[#e9edf3]")}>
                  <span className="h-8 w-8 shrink-0 rounded-lg grid place-items-center text-sm font-bold text-white" style={{ background: m.cor_hex }}>{m.numero}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{m.nome}</span>
                    <span className={cn("block text-xs tabular-nums", macaSel === m.id ? "text-white/80" : "text-muted-foreground")}>{m.ativos} {m.ativos === 1 ? "consulente" : "consulentes"}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {maca && (
            <div className="space-y-3 pt-1">
              <p className="text-[13px] text-muted-foreground">
                Consulentes da <strong className="text-foreground">Maca {maca.numero} · {maca.nome}</strong>
                {maca.mediuns.length > 0 && <> (médiuns: {maca.mediuns.join(", ")})</>}.
                {lancadosAqui > 0 && <> Você lançou {lancadosAqui}.</>} O registro fica no histórico da maca dela.
              </p>
              {carregando ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando consulentes…</p>
                : consulentes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum consulente ativo nesta maca.</p>
                : consulentes.map((c) => (
                  <CartaoOutra key={c.id} c={c} macaOrigem={macaOrigem} sessaoId={sessaoId} isoDate={isoDate} dia={dia} macaSel={maca.id} />
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CartaoOutra({ c, macaOrigem, sessaoId, isoDate, dia, macaSel }: {
  c: ConsulenteOutra; macaOrigem: string; sessaoId: string; isoDate: string; dia?: string | null; macaSel: string;
}) {
  const qc = useQueryClient();
  const [obs, setObs] = useState(c.presenca?.observacao ?? "");
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => setObs(c.presenca?.observacao ?? ""), [c.presenca?.observacao]);

  const status = c.presenca?.status ?? null;
  const tom = status ? TOM[status] : null;
  const veio = status === "presente" || status === "atendimento_distancia";
  const sessao = veio ? c.realizados : Math.min(c.realizados + 1, c.sessoes_totais);
  const quinzenal = c.frequencia === "quinzenal";
  const naoEsperado = quinzenal && !status && !isDataEsperadaQuinzenal(isoDate, c.datas[0]?.data ?? c.created_at.slice(0, 10), dia);
  const outroMedium = !!status && c.presenca?.atendido_em_maca_id !== macaOrigem;

  const lancar = async (s: Status, observacao?: string) => {
    setOcupado(true);
    const { error } = await rpc("lancar_presenca_outra_maca", {
      p_maca_origem: macaOrigem, p_designacao: c.id, p_sessao: sessaoId, p_status: s, p_observacao: observacao ?? (obs.trim() || null),
    });
    setOcupado(false);
    if (error) return toast.error(erro(error.message));
    toast.success(observacao !== undefined ? "Observação salva" : `${c.nome.split(" ")[0]}: ${TOM[s].rotulo.toLowerCase()} lançado`);
    qc.invalidateQueries({ queryKey: ["consulentes-outra-maca", macaOrigem, macaSel, sessaoId] });
  };

  return (
    <article className={cn("rounded-2xl p-4 space-y-3", tom ? tom.cartao : "bg-white shadow-[inset_0_0_0_1px_#e3e8ef]")}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-sans text-[16px] font-bold leading-snug">{c.nome}</h4>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            {quinzenal ? "Quinzenal" : "Semanal"} · sessão {sessao} de {c.sessoes_totais}
            {naoEsperado && " · não era esperado hoje"}
          </p>
        </div>
        {tom ? (
          <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tom.botao)}>
            <Check className="h-3.5 w-3.5" />{tom.rotulo}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[#fff3d6] px-2.5 py-1 text-xs font-semibold text-[#8a5a00]">Falta lançar</span>
        )}
      </div>
      {!veio && sessao >= c.sessoes_totais && <p className="text-xs rounded-lg bg-[#fff5d9] text-[#5c3b00] px-2.5 py-2"><strong>Última sessão do tratamento.</strong> A presença conclui o ciclo; alta ou prorrogação ficam com a maca dele.</p>}
      {outroMedium && <p className="text-xs text-muted-foreground">Já lançado pela maca dele nesta data. Se você marcar de novo, o seu registro substitui.</p>}

      {c.datas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.datas.map((r) => (
            <span key={r.data + r.status} className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", DIA_COR[r.status] ?? "bg-muted text-muted-foreground",
              r.data === isoDate && "ring-2 ring-[#0059b1] ring-offset-1")}>
              {format(new Date(r.data + "T00:00:00"), "dd/MM")}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {([
          ["presente", Check, true], ["ausente", X, false], ["falta_justificada", ShieldCheck, false], ["atendimento_distancia", Radio, true],
        ] as const).map(([s, Icone, largo]) => {
          const ativo = status === s;
          return (
            <button key={s} type="button" disabled={ocupado} aria-pressed={ativo} onClick={() => lancar(s)}
              className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-[.98] disabled:opacity-60",
                largo && "col-span-2", s === "presente" ? "h-12 text-base" : "h-11 text-[15px]",
                ativo ? TOM[s].botao : "bg-white text-foreground shadow-[inset_0_0_0_1.5px_#d6dde7]", status && !ativo && "opacity-70")}>
              {ativo ? <Check className="h-5 w-5" /> : <Icone className="h-5 w-5" />}{TOM[s].rotulo}
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor={`obs-outra-${c.id}`} className="text-[13px] font-semibold text-muted-foreground">Observação do atendimento</label>
        <Textarea id={`obs-outra-${c.id}`} value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
          placeholder={status ? "Como foi o atendimento?" : "Marque a presença primeiro"}
          className="mt-1 bg-white/80 border-0 shadow-[inset_0_0_0_1px_#e3e8ef] text-[15px]" />
        {status && obs !== (c.presenca?.observacao ?? "") && (
          <Button size="sm" className="mt-2 h-9" disabled={ocupado} onClick={() => lancar(status, obs)}>
            <Save className="h-4 w-4 mr-1" /> Salvar observação
          </Button>
        )}
      </div>
    </article>
  );
}
