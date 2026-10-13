import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { isDesignacaoArquivada } from "@/lib/atendimento-dates";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, ArrowLeft } from "lucide-react";
import { CabecalhoPagina } from "@/compartilhado";
import { LinkRota } from "@/components/LinkRota";
import { Link } from "@tanstack/react-router";
import { diaFromDate, diaLabel, type DiaTrabalho } from "@/lib/sessao";
import { getMacaCategoria } from "@/lib/maca-categoria";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recepcao/imprimir")({
  component: () => (
    <RequireAuth roles={["recepcao", "dialogador", "admin"]} denyRoles={["medium"]}>
      <RecepcaoImprimir />
    </RequireAuth>
  ),
});

type Designacao = {
  id: string;
  status: string;
  closure_reason: string | null;
  closed_at?: string | null;
  consulentes: { id: string; nome: string; trabalhador: boolean | null; tratamento_distancia: boolean | null } | null;
};

type MacaComConsulentes = {
  id: string;
  numero: number;
  nome: string;
  cor_hex: string;
  categoria: string | null;
  designacoes: Designacao[];
  mediuns: string[];
};

const SLOTS = 10;

function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // luminância percebida
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.75;
}


function RecepcaoImprimir() {
  const [dia, setDia] = useState<DiaTrabalho>(diaFromDate(new Date()));

  const { data: macas, isLoading } = useQuery({
    queryKey: ["recepcao-imprimir", dia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("macas")
        .select(
          "id, numero, nome, cor_hex, categoria, maca_mediuns(user_id), designacoes(id, status, closure_reason, closed_at, consulentes(id, nome, trabalhador, tratamento_distancia))"
        )
        .eq("ativa", true)
        .eq("dia", dia)
        .order("numero");
      if (error) throw error;

      const userIds = Array.from(
        new Set(
          (data ?? []).flatMap((m) =>
            ((m.maca_mediuns ?? []) as Array<{ user_id: string }>).map((mm) => mm.user_id)
          )
        )
      );
      const nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome, como_chamar")
          .in("id", userIds);
        profs?.forEach((p) => nameMap.set(p.id, p.como_chamar || p.nome || ""));
      }

      return (data ?? []).map((m) => ({
        ...m,
        mediuns: ((m.maca_mediuns ?? []) as Array<{ user_id: string }>)
          .map((mm) => nameMap.get(mm.user_id) || "")
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b)),
        designacoes: ((m.designacoes ?? []) as Designacao[])
          .filter((d) => {
            if (!d.consulentes) return false;
            if (d.status === "ativa") return true;
            if (isDesignacaoArquivada(d.status, d.closed_at, dia)) return false;
            if (d.status === "cancelada" && d.closure_reason !== "transferencia") return true;
            if (d.status === "concluida" && d.closure_reason === "alta") return true;
            return false;
          })
          .sort((a, b) => {
            const aIn = a.status !== "ativa" ? 1 : 0;
            const bIn = b.status !== "ativa" ? 1 : 0;
            if (aIn !== bIn) return aIn - bIn;
            return (a.consulentes?.nome ?? "").localeCompare(b.consulentes?.nome ?? "");
          }),
      })) as MacaComConsulentes[];
    },
  });

  const hoje = new Date().toLocaleDateString("pt-BR");

  const macasProcessadas = macas?.map((m) => {
    const itens = m.designacoes.map((d) => {
      const inativo = d.status !== "ativa";
      let label = "";
      if (inativo) {
        if (d.closure_reason === "alta") label = "[Inativo - Alta]";
        else if (d.closure_reason === "encaminhamento_dialogo") label = "[Inativo - Diálogo]";
        else if (d.closure_reason === "falta") label = "[Inativo - Ausência]";
        else label = "[Inativo]";
      }
      return {
        nome: d.consulentes?.nome ?? "",
        trabalhador: !!d.consulentes?.trabalhador,
        distancia: !!d.consulentes?.tratamento_distancia,
        inativo,
        label,
      };
    });
    return { ...m, ativos: itens.filter((i) => !i.inativo), inativos: itens.filter((i) => i.inativo) };
  });

  const FolhaHeader = ({ titulo }: { titulo: string }) => (
    <header className="flex items-end justify-between border-b border-black/40 pb-1 mb-2">
      <h2 className="text-base font-bold leading-tight">
        {titulo} · {diaLabel(dia)}
      </h2>
      <p className="text-[10px]">Impresso em {hoje}</p>
    </header>
  );

  type Item = { nome: string; trabalhador: boolean; distancia: boolean; inativo: boolean; label: string };

  const renderMaca = (m: (typeof macasProcessadas extends (infer U)[] | undefined ? U : never), itens: Item[], countOverride?: number) => {
    const slots = Array.from({ length: SLOTS }, (_, i) => itens[i] ?? { nome: "", trabalhador: false, distancia: false, inativo: false, label: "" });
    const count = countOverride ?? itens.length;
    const headerTextColor = isLightColor(m.cor_hex) ? "#000" : "#fff";
    return (
      <section key={m.id} className="print-maca border border-black/50 rounded overflow-hidden">
        <header
          className="px-2 py-0.5 font-semibold text-[11px] flex justify-between"
          style={{ backgroundColor: m.cor_hex, color: headerTextColor }}
        >
          <span>Maca {m.numero} - {m.nome} ({(m.categoria === "interna" || m.categoria === "externa" ? m.categoria : getMacaCategoria(m.numero)) === "externa" ? "Externa" : "Interna"})</span>
          <span className="opacity-90">{count}/{SLOTS}</span>
        </header>
        {m.mediuns.length > 0 && (
          <div className="px-2 py-0.5 text-[9px] text-black/70 border-b border-black/30 truncate" title={m.mediuns.join(", ")}>
            <span className="font-semibold">Médiuns:</span> {m.mediuns.join(", ")}
          </div>
        )}
        <ol className="text-[10px]">
          {slots.map((it, i) => (
            <li
              key={i}
              className="flex items-end gap-1 px-1.5 border-b border-black/30 last:border-0"
              style={{ height: "7mm" }}
            >
              <span className={cn("flex-1 leading-none pb-0.5 truncate", it.inativo && "text-black/50")}>
                {it.nome ? `${it.distancia ? "[dist] " : ""}${it.trabalhador ? "[trab] " : ""}${it.label ? it.label + " " : ""}${it.nome}${it.inativo ? " *" : ""}` : ""}
              </span>
              <span className="w-8 border-l border-black/40 leading-none pb-0.5 pl-1 text-black/60 text-[9px]">&nbsp;</span>
            </li>
          ))}
        </ol>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { width: 100% !important; padding: 0 !important; box-shadow: none !important; }
          .print-maca { break-inside: avoid; }
          .print-sheet-break { break-before: page; }
        }
      `}</style>

      {/* Cabeçalho só na tela; a folha impressa continua igual */}
      <div className="no-print">
        <CabecalhoPagina
          voltar={{ href: "/recepcao", rotulo: "Voltar" }}
          Link={LinkRota}
          titulo="Lista para impressão"
          descricao={`Consulentes por maca · ${diaLabel(dia)}`}
          acoes={
            <>
              <Tabs value={dia} onValueChange={(v) => setDia(v as DiaTrabalho)}>
                <TabsList>
                  <TabsTrigger value="terca">{diaLabel("terca")}</TabsTrigger>
                  <TabsTrigger value="sabado">{diaLabel("sabado")}</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir
              </Button>
            </>
          }
        />
      </div>

      {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Carregando…</p>}

      {!isLoading && macas && macas.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhuma maca cadastrada para {diaLabel(dia).toLowerCase()}.</p>
      )}

      {!isLoading && (macasProcessadas?.length ?? 0) > 0 && (
        <>
          {/* Folha 1: Ativos */}
          <div
            className="print-area bg-white text-black mx-auto"
            style={{ width: "194mm", padding: "6mm", boxShadow: "0 0 0 1px var(--border)" }}
          >
            <FolhaHeader titulo="Consulentes ATIVOS por Maca" />
            <div className="grid grid-cols-3 gap-1.5">
              {macasProcessadas?.map((m) => renderMaca(m, m.ativos))}
            </div>
          </div>

          {/* Folha 2: Inativos */}
          <div
            className="print-area print-sheet-break bg-white text-black mx-auto mt-4"
            style={{ width: "194mm", padding: "6mm", boxShadow: "0 0 0 1px var(--border)" }}
          >
            <FolhaHeader titulo="Consulentes INATIVOS por Maca" />
            <div className="grid grid-cols-3 gap-1.5">
              {macasProcessadas
                ?.filter((m) => m.inativos.length > 0)
                .map((m) => renderMaca(m, m.inativos, m.inativos.length))}
            </div>
            {macasProcessadas?.every((m) => m.inativos.length === 0) && (
              <p className="text-sm">Nenhum consulente inativo neste dia.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
