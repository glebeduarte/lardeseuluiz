import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { CabecalhoPagina } from "@/compartilhado";
import { LinkRota } from "@/components/LinkRota";
import { getAtendimentoDatesByDia, getUltimaAtendimentoDateByDia, isDataEsperadaQuinzenal, isDesignacaoArquivada } from "@/lib/atendimento-dates";
import { diaFromDate, diaLabel, type DiaTrabalho } from "@/lib/sessao";
import { getMacaCategoria } from "@/lib/maca-categoria";
import { cn } from "@/lib/utils";

// Listas do dia de trabalho, para a tela e para imprimir em A4:
// 1. quem está ativo em cada maca, com a sessão de hoje e espaço para marcar presença;
// 2. os inativos das macas que ainda não foram arquivados;
// 3. quem está esperando diálogo fraterno.

export const Route = createFileRoute("/recepcao/imprimir")({
  component: () => (
    <RequireAuth roles={["recepcao", "dialogador", "admin"]} denyRoles={["medium"]}>
      <ListasDoDia />
    </RequireAuth>
  ),
});

type Aba = "macas" | "inativos" | "dialogo";

type Maca = { id: string; numero: number; nome: string; cor_hex: string; categoria: string | null; dia: string; lotacao_max: number | null };
type Consulente = { id: string; nome: string; telefone: string | null; trabalhador: boolean | null; tratamento_distancia: boolean | null; frequencia: string | null; dialogo_pendente: boolean | null; alta_at: string | null };
type Designacao = {
  id: string; maca_id: string; status: string; closure_reason: string | null; closed_at: string | null; created_at: string;
  sessoes_realizadas: number; sessoes_totais: number; consulente_id: string; consulentes: Consulente | null;
};
type Presenca = { designacao_id: string; status: string; sessoes: { data: string } | null };

const isoDe = (d: Date) => format(d, "yyyy-MM-dd");
const dataCurta = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
const corTexto = (hex: string) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7 ? "#0f1f3d" : "#fff";
};
const MOTIVO_INATIVO: Record<string, string> = {
  alta: "Alta", encaminhamento_dialogo: "Encaminhado ao diálogo", falta: "Faltas", troca_maca: "Troca de maca",
};
const categoriaDe = (m: Maca) => ((m.categoria === "interna" || m.categoria === "externa" ? m.categoria : getMacaCategoria(m.numero)) === "externa" ? "Externa" : "Interna");

function ListasDoDia() {
  const [aba, setAba] = useState<Aba>("macas");
  const [tipo, setTipo] = useState<DiaTrabalho>(() => diaFromDate(new Date()));
  const [dataSel, setDataSel] = useState<string | null>(null);

  // Datas do tipo de dia: as últimas e as próximas, com a de hoje (ou a última) escolhida
  const datasTipo = getAtendimentoDatesByDia(tipo);
  const hojeIso = isoDe(new Date());
  const proxima = datasTipo.find((d) => isoDe(d) >= hojeIso);
  const padrao = proxima && isoDe(proxima) === hojeIso ? proxima : getUltimaAtendimentoDateByDia(tipo) ?? proxima;
  const dataIso = dataSel ?? (padrao ? isoDe(padrao) : hojeIso);
  const pos = Math.max(0, datasTipo.findIndex((d) => isoDe(d) === dataIso));
  const faixa = datasTipo.slice(Math.max(0, pos - 3), pos + 3);
  const dataTitulo = format(new Date(dataIso + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }).replace(/^./, (l) => l.toUpperCase());

  // ---- Dados das macas do dia (ativos e inativos) ----
  const { data: base, isLoading } = useQuery({
    queryKey: ["listas-dia-macas", tipo],
    queryFn: async () => {
      const { data: macas, error } = await supabase
        .from("macas")
        .select("id, numero, nome, cor_hex, categoria, dia, lotacao_max, maca_mediuns(user_id)")
        .eq("ativa", true).eq("dia", tipo).order("numero");
      if (error) throw error;
      const ids = (macas ?? []).map((m) => m.id);
      const { data: desigs } = ids.length
        ? await supabase
            .from("designacoes")
            .select("id, maca_id, status, closure_reason, closed_at, created_at, sessoes_realizadas, sessoes_totais, consulente_id, consulentes(id, nome, telefone, trabalhador, tratamento_distancia, frequencia, dialogo_pendente, alta_at)")
            .in("maca_id", ids)
        : { data: [] };
      const lista = (desigs ?? []) as unknown as Designacao[];
      const ativosIds = lista.filter((d) => d.status === "ativa").map((d) => d.id);
      let presencas: Presenca[] = [];
      for (let i = 0; i < ativosIds.length; i += 200) {
        const { data: p } = await supabase.from("presencas").select("designacao_id, status, sessoes(data)").in("designacao_id", ativosIds.slice(i, i + 200));
        presencas = presencas.concat((p ?? []) as unknown as Presenca[]);
      }
      const userIds = Array.from(new Set((macas ?? []).flatMap((m) => ((m.maca_mediuns ?? []) as { user_id: string }[]).map((x) => x.user_id))));
      const nomes = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nome, como_chamar").in("id", userIds);
        (profs ?? []).forEach((p) => nomes.set(p.id, p.como_chamar || p.nome || ""));
      }
      return {
        macas: (macas ?? []).map((m) => ({
          ...(m as unknown as Maca),
          mediuns: ((m.maca_mediuns ?? []) as { user_id: string }[]).map((x) => nomes.get(x.user_id) || "").filter(Boolean).sort((a, b) => a.localeCompare(b)),
        })),
        designacoes: lista,
        presencas,
      };
    },
  });

  // ---- Pendentes de diálogo (não depende do dia): só os dos últimos 2 meses ----
  const limiteDialogo = (() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return isoDe(d); })();
  const { data: pendentes, isLoading: carregandoPend } = useQuery({
    queryKey: ["listas-dia-dialogo", limiteDialogo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulentes")
        .select("id, nome, telefone, created_at, data_dialogo, dialogador_id, alta_at, designacoes(status, closure_reason, closed_at, created_at, sessoes_realizadas, sessoes_totais, macas(numero, nome, cor_hex, dia))")
        .eq("dialogo_pendente", true)
        .is("alta_at", null);
      if (error) throw error;
      const dialogadores = Array.from(new Set((data ?? []).map((c) => c.dialogador_id).filter(Boolean))) as string[];
      const nomes = new Map<string, string>();
      if (dialogadores.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nome, como_chamar").in("id", dialogadores);
        (profs ?? []).forEach((p) => nomes.set(p.id, p.como_chamar || p.nome || ""));
      }
      type D = { status: string; closure_reason: string | null; closed_at: string | null; created_at: string; sessoes_realizadas: number; sessoes_totais: number; macas: { numero: number; nome: string; cor_hex: string; dia: string } | null };
      return (data ?? [])
        .map((c) => {
          const ds = ((c.designacoes ?? []) as unknown as D[]);
          if (ds.some((d) => d.status === "ativa")) return null;
          const ultima = ds.filter((d) => d.status !== "ativa").sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))[0];
          const motivo = !ultima ? "primeiro" : ultima.closure_reason === "alta" ? "alta" : ultima.closure_reason === "encaminhamento_dialogo" ? "medium" : ultima.closure_reason === "falta" ? "faltas" : "retorno";
          return {
            id: c.id, nome: c.nome, telefone: c.telefone,
            desde: (ultima?.closed_at ?? c.created_at ?? "").slice(0, 10),
            motivo,
            maca: ultima?.macas ?? null,
            sessoes: ultima ? `${ultima.sessoes_realizadas}/${ultima.sessoes_totais}` : null,
            dialogador: c.dialogador_id ? nomes.get(c.dialogador_id) ?? null : null,
          };
        })
        .filter(Boolean)
        // Só quem espera há no máximo 2 meses; mais que isso fica como inativo arquivado
        .filter((p) => (p!.desde || "") >= limiteDialogo)
        .sort((a, b) => (a!.desde || "").localeCompare(b!.desde || "")) as {
          id: string; nome: string; telefone: string | null; desde: string; motivo: string; maca: { numero: number; nome: string; cor_hex: string } | null; sessoes: string | null; dialogador: string | null;
        }[];
    },
  });

  // ---- Organização ----
  const macas = useMemo(() => {
    if (!base) return [];
    const porDesig = new Map<string, { data: string; status: string }[]>();
    base.presencas.forEach((p) => {
      const dt = p.sessoes?.data;
      if (!dt) return;
      const arr = porDesig.get(p.designacao_id) ?? [];
      arr.push({ data: dt, status: p.status });
      porDesig.set(p.designacao_id, arr);
    });
    return base.macas.map((m) => {
      const ds = base.designacoes.filter((d) => d.maca_id === m.id && d.consulentes);
      const ativos = ds.filter((d) => d.status === "ativa").map((d) => {
        const hist = (porDesig.get(d.id) ?? []).sort((a, b) => a.data.localeCompare(b.data));
        const veio = (s: string) => s === "presente" || s === "atendimento_distancia";
        const antes = hist.filter((h) => h.data < dataIso && veio(h.status)).length;
        const deHoje = hist.find((h) => h.data === dataIso);
        const sessao = Math.min(antes + 1, d.sessoes_totais);
        const quinzenal = d.consulentes!.frequencia === "quinzenal";
        const baseQ = hist[0]?.data ?? d.created_at.slice(0, 10);
        const naoVem = quinzenal && !deHoje && !isDataEsperadaQuinzenal(dataIso, baseQ, m.dia);
        const ultimaFalta = [...hist].reverse().find((h) => h.data < dataIso);
        return {
          id: d.id, nome: d.consulentes!.nome, sessao, total: d.sessoes_totais, ultima: antes + 1 >= d.sessoes_totais,
          quinzenal, naoVem, distancia: !!d.consulentes!.tratamento_distancia, trabalhador: !!d.consulentes!.trabalhador,
          faltouUltima: ultimaFalta?.status === "ausente", hoje: deHoje?.status ?? null,
        };
      }).sort((a, b) => Number(a.naoVem) - Number(b.naoVem) || a.nome.localeCompare(b.nome, "pt-BR"));
      const inativos = ds
        .filter((d) => d.status !== "ativa"
          && !["transferencia", "troca_maca"].includes(d.closure_reason ?? "")
          && !(d.status === "concluida" && d.closure_reason !== "alta")
          && !isDesignacaoArquivada(d.status, d.closed_at, m.dia)
          && !base.designacoes.some((o) => o.consulente_id === d.consulente_id && o.status === "ativa"))
        .map((d) => ({
          id: d.id, nome: d.consulentes!.nome, telefone: d.consulentes!.telefone,
          motivo: MOTIVO_INATIVO[d.closure_reason ?? ""] ?? "Inativo",
          desde: d.closed_at?.slice(0, 10) ?? null, sessoes: `${d.sessoes_realizadas}/${d.sessoes_totais}`,
          dialogoPendente: !!d.consulentes!.dialogo_pendente,
        }))
        .sort((a, b) => (a.desde ?? "").localeCompare(b.desde ?? ""));
      return { ...m, ativos, inativos };
    });
  }, [base, dataIso]);

  const totalAtivos = macas.reduce((s, m) => s + m.ativos.length, 0);
  const totalHoje = macas.reduce((s, m) => s + m.ativos.filter((a) => !a.naoVem).length, 0);
  const totalInativos = macas.reduce((s, m) => s + m.inativos.length, 0);
  const impressoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm");

  const MOTIVO_DIALOGO: Record<string, { rotulo: string; ordem: number }> = {
    primeiro: { rotulo: "Primeiro diálogo", ordem: 1 },
    medium: { rotulo: "Encaminhados pelo médium", ordem: 2 },
    faltas: { rotulo: "Retorno depois de faltas", ordem: 3 },
    retorno: { rotulo: "Retorno à maca", ordem: 4 },
    alta: { rotulo: "Diálogo de alta", ordem: 5 },
  };
  const gruposDialogo = Object.entries(MOTIVO_DIALOGO)
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .map(([k, v]) => ({ chave: k, rotulo: v.rotulo, itens: (pendentes ?? []).filter((p) => p.motivo === k) }))
    .filter((g) => g.itens.length > 0);

  const Folha = ({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) => (
    <div className="folha bg-white text-[#0f1f3d] rounded-2xl p-4 sm:p-6 shadow-[inset_0_0_0_1px_#e3e8ef]">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pb-3 mb-4 border-b-2 border-[#0f1f3d]">
        <div>
          <p className="text-xs font-semibold text-[#4a5568]">Lar de Seu Luiz · Atendimento espiritual</p>
          <h2 className="text-xl font-bold leading-tight">{titulo}</h2>
          <p className="text-sm text-[#4a5568]">{resumo}</p>
        </div>
        <p className="text-[11px] text-[#4a5568]">Impresso em {impressoEm}</p>
      </header>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: #fff !important; }
          .no-print, .lsl-barra, .lsl-lateral, .lsl-fazer-botao, .site-cookie-banner { display: none !important; }
          .lsl-corpo { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .lsl-conteudo { padding: 0 !important; max-width: none !important; }
          .folha { box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }
          .bloco-maca, .linha-impressa, tr { break-inside: avoid; }
          .grade-macas { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 4mm !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print space-y-4">
        <CabecalhoPagina
          voltar={{ href: "/recepcao", rotulo: "Voltar" }}
          Link={LinkRota}
          titulo="Listas do dia"
          descricao="Para acompanhar o trabalho na tela ou imprimir em A4."
          acoes={<Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Imprimir esta lista</Button>}
        />

        {/* Qual lista */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#e9edf3] p-1" role="tablist">
          {([["macas", "Nas macas", totalAtivos], ["inativos", "Inativos", totalInativos], ["dialogo", "Diálogo", pendentes?.length]] as const).map(([v, r, n]) => (
            <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => setAba(v)}
              className={cn("min-h-11 rounded-lg px-2 py-1.5 text-sm font-semibold leading-tight", aba === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground")}>
              {r}{typeof n === "number" ? <span className="tabular-nums"> {n}</span> : null}
            </button>
          ))}
        </div>

        {/* Dia de trabalho */}
        {aba !== "dialogo" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-[#e9edf3] p-1">
              {(["terca", "sabado"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setTipo(t); setDataSel(null); }}
                  className={cn("h-8 rounded-md px-3 text-sm font-semibold", tipo === t ? "bg-white shadow-sm" : "text-muted-foreground")}>
                  {diaLabel(t)}
                </button>
              ))}
            </div>
            {aba === "macas" && (
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {faixa.map((d) => {
                  const iso = isoDe(d);
                  return (
                    <button key={iso} type="button" onClick={() => setDataSel(iso)} aria-pressed={iso === dataIso}
                      className={cn("shrink-0 h-8 min-w-[54px] rounded-lg px-2 text-[13px] font-semibold tabular-nums",
                        iso === dataIso ? "bg-[#003c7f] text-white" : "bg-white shadow-[inset_0_0_0_1px_#e3e8ef]")}>
                      {dataCurta(iso)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {(isLoading || (aba === "dialogo" && carregandoPend)) && <p className="text-center text-sm text-muted-foreground py-8">Carregando…</p>}

      {/* 1. Quem está ativo em cada maca */}
      {aba === "macas" && !isLoading && (
        <Folha titulo={`Atendimentos nas macas · ${diaLabel(tipo)}`}
          resumo={`${dataTitulo} · ${totalHoje} esperados em ${macas.length} macas${totalAtivos > totalHoje ? ` · ${totalAtivos - totalHoje} ${totalAtivos - totalHoje === 1 ? "quinzenal não vem" : "quinzenais não vêm"}` : ""}`}>
          {macas.length === 0 ? <p className="text-sm">Nenhuma maca ativa neste dia.</p> : (
            <>
              <div className="grade-macas grid gap-3 sm:grid-cols-2">
                {macas.map((m) => {
                  // Sempre 10 linhas por maca: os ativos e o restante em branco para anotar
                  const linhasVazias = Math.max(0, 10 - m.ativos.length);
                  return (
                    <section key={m.id} className="bloco-maca rounded-lg overflow-hidden shadow-[inset_0_0_0_1.5px_#0f1f3d33]">
                      <header className="px-3 py-1.5 flex items-baseline justify-between gap-2" style={{ background: m.cor_hex, color: corTexto(m.cor_hex) }}>
                        <span className="font-bold text-[14px]">Maca {m.numero} · {m.nome} <span className="font-semibold opacity-85 text-[12px]">({categoriaDe(m)})</span></span>
                        <span className="text-[12px] font-semibold tabular-nums whitespace-nowrap">{m.ativos.length}/{m.lotacao_max ?? "–"}</span>
                      </header>
                      <p className="px-3 py-1 text-[11px] text-[#4a5568] bg-[#f5f7fa]">
                        <strong className="text-[#0f1f3d]">Médiuns:</strong> {m.mediuns.length ? m.mediuns.join(", ") : "não definidos"}
                      </p>
                      <table className="w-full text-[12px] border-collapse">
                        <thead>
                          <tr className="text-[10px] text-[#4a5568]">
                            <th className="font-semibold pl-2 pr-1 py-1 w-12">Ficha</th>
                            <th className="text-left font-semibold pl-2 py-1">Consulente</th>
                            <th className="font-semibold w-12 py-1">Sessão</th>
                            <th className="font-semibold w-7 py-1">P</th>
                            <th className="font-semibold w-7 py-1 pr-2">F</th>
                          </tr>
                        </thead>
                        <tbody>
                          {m.ativos.map((a) => (
                            <tr key={a.id} className={cn("border-t border-[#0f1f3d1f]", a.naoVem && "text-[#8a94a6]")}>
                              <td className="pl-2 pr-1 py-1.5 align-middle"><span className="block h-5 w-full rounded-[3px] shadow-[inset_0_0_0_1.5px_#0f1f3d59]" /></td>
                              <td className="pl-2 py-1.5 leading-tight">
                                <span className="font-semibold">{a.nome}</span>
                                {(a.naoVem || a.ultima || a.quinzenal || a.distancia || a.trabalhador || a.faltouUltima) && (
                                  <span className="block text-[10px] text-[#4a5568]">
                                    {[a.naoVem ? "quinzenal, não vem hoje" : a.quinzenal ? "quinzenal" : null,
                                      a.ultima && !a.naoVem ? "última sessão" : null,
                                      a.distancia ? "à distância" : null,
                                      a.trabalhador ? "trabalhador" : null,
                                      a.faltouUltima && !a.naoVem ? "faltou na anterior" : null].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                              </td>
                              <td className={cn("text-center tabular-nums font-semibold", a.ultima && !a.naoVem && "text-[#8a5a00]")}>{a.naoVem ? "–" : `${a.sessao}/${a.total}`}</td>
                              <td className="text-center"><span className={cn("inline-block h-4 w-4 rounded-[3px] align-middle", a.hoje === "presente" || a.hoje === "atendimento_distancia" ? "bg-[#157a4a]" : "shadow-[inset_0_0_0_1.5px_#0f1f3d80]")} /></td>
                              <td className="text-center pr-2"><span className={cn("inline-block h-4 w-4 rounded-[3px] align-middle", a.hoje === "ausente" || a.hoje === "falta_justificada" ? "bg-[#b42318]" : "shadow-[inset_0_0_0_1.5px_#0f1f3d80]")} /></td>
                            </tr>
                          ))}
                          {Array.from({ length: linhasVazias }, (_, i) => (
                            <tr key={`v${i}`} className="border-t border-[#0f1f3d1f]"><td className="pl-2 pr-1 py-2 align-middle"><span className="block h-5 w-full rounded-[3px] shadow-[inset_0_0_0_1.5px_#0f1f3d59]" /></td><td className="pl-2 py-2 text-[10px] text-[#c0c6d0]">vaga</td><td /><td /><td /></tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-[#4a5568]">Ficha: número da ficha que a pessoa recebeu. P presença · F falta. Sessão mostra qual será a de hoje no tratamento. Quadrado preenchido já foi lançado no sistema.</p>
            </>
          )}
        </Folha>
      )}

      {/* 2. Inativos ainda não arquivados */}
      {aba === "inativos" && !isLoading && (
        <Folha titulo={`Inativos das macas · ${diaLabel(tipo)}`}
          resumo={`${totalInativos} ${totalInativos === 1 ? "pessoa" : "pessoas"} · saem desta lista depois de 6 sessões inativas`}>
          {totalInativos === 0 ? <p className="text-sm">Nenhum inativo nas macas deste dia.</p> : (
            <div className="space-y-4">
              {macas.filter((m) => m.inativos.length > 0).map((m) => (
                <section key={m.id} className="bloco-maca">
                  <h3 className="flex items-center gap-2 font-sans text-[14px] font-bold mb-1">
                    <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: m.cor_hex }} />
                    Maca {m.numero} · {m.nome} <span className="text-[12px] font-semibold text-[#4a5568] tabular-nums">({m.inativos.length})</span>
                  </h3>
                  <table className="w-full table-fixed text-[12px] border-collapse">
                    <thead>
                      <tr className="text-[10px] text-[#4a5568] text-left">
                        <th className="font-semibold py-1">Consulente</th>
                        <th className="font-semibold py-1 w-[38%]">Motivo</th>
                        <th className="font-semibold py-1 text-right w-14">Desde</th>
                        <th className="font-semibold py-1 text-right hidden sm:table-cell w-16">Sessões</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.inativos.map((x) => (
                        <tr key={x.id} className="linha-impressa border-t border-[#0f1f3d1f] align-top">
                          <td className="py-1.5 pr-2 leading-tight">
                            <span className="font-semibold">{x.nome}</span>
                            {x.telefone && <span className="block text-[10px] text-[#4a5568] tabular-nums">{x.telefone}</span>}
                          </td>
                          <td className="py-1.5 pr-2 leading-tight">{x.motivo}{x.dialogoPendente && <span className="block text-[10px] text-[#8a5a00]">aguardando diálogo</span>}</td>
                          <td className="py-1.5 text-right tabular-nums">{dataCurta(x.desde)}</td>
                          <td className="py-1.5 text-right tabular-nums hidden sm:table-cell">{x.sessoes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          )}
        </Folha>
      )}

      {/* 3. Pendentes de diálogo */}
      {aba === "dialogo" && !carregandoPend && (
        <Folha titulo="Pendentes de diálogo fraterno"
          resumo={`${pendentes?.length ?? 0} ${(pendentes?.length ?? 0) === 1 ? "pessoa" : "pessoas"} esperando desde ${dataCurta(limiteDialogo)} · da espera mais antiga para a mais recente · quem espera há mais de 2 meses fica arquivado`}>
          {(pendentes?.length ?? 0) === 0 ? <p className="text-sm">Ninguém esperando diálogo.</p> : (
            <div className="space-y-4">
              {gruposDialogo.map((g) => (
                <section key={g.chave} className="bloco-maca">
                  <h3 className="font-sans text-[14px] font-bold mb-1">{g.rotulo} <span className="text-[12px] font-semibold text-[#4a5568] tabular-nums">({g.itens.length})</span></h3>
                  <table className="w-full table-fixed text-[12px] border-collapse">
                    <thead>
                      <tr className="text-[10px] text-[#4a5568] text-left">
                        <th className="font-semibold py-1">Consulente</th>
                        <th className="font-semibold py-1 hidden sm:table-cell w-[24%]">Última maca</th>
                        <th className="font-semibold py-1 hidden sm:table-cell w-[20%]">Dialogador</th>
                        <th className="font-semibold py-1 text-right w-14">Desde</th>
                        <th className="font-semibold py-1 w-12 text-center">Feito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.itens.map((p) => (
                        <tr key={p.id} className="linha-impressa border-t border-[#0f1f3d1f] align-top">
                          <td className="py-1.5 pr-2 leading-tight">
                            <span className="font-semibold">{p.nome}</span>
                            <span className="block text-[10px] text-[#4a5568] tabular-nums">
                              {p.telefone}
                              {p.maca && <span className="sm:hidden">{p.telefone ? " · " : ""}Maca {p.maca.numero} {p.maca.nome} · {p.sessoes}</span>}
                            </span>
                          </td>
                          <td className="py-1.5 pr-2 hidden sm:table-cell">{p.maca ? <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.maca.cor_hex }} />{p.maca.numero} {p.maca.nome}</span> : "–"}</td>
                          <td className="py-1.5 pr-2 hidden sm:table-cell">{p.dialogador ?? "–"}</td>
                          <td className="py-1.5 text-right tabular-nums">{dataCurta(p.desde)}</td>
                          <td className="py-1.5 text-center"><span className="inline-block h-4 w-4 rounded-[3px] align-middle shadow-[inset_0_0_0_1.5px_#0f1f3d80]" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          )}
        </Folha>
      )}
    </div>
  );
}
