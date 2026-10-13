import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, ArrowRight, AlertTriangle, BadgeCheck, Printer } from "lucide-react";
import { diaFromDate, diaLabel, type DiaTrabalho } from "@/lib/sessao";
import { getAtendimentoDatesIsoByDia, formatDataCurta } from "@/lib/atendimento-dates";
import { cn } from "@/lib/utils";
import { CabecalhoPagina } from "@/compartilhado";
import { useAuth } from "@/lib/auth";
import { MacaCategoriaTag } from "@/lib/maca-categoria";

function toIsoHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


export const Route = createFileRoute("/recepcao/")({
  component: () => (
    <RequireAuth roles={["recepcao", "dialogador", "admin"]} denyRoles={["medium"]}>
      <RecepcaoIndex />
    </RequireAuth>
  ),
});

function RecepcaoIndex() {
  const { isDialogador, isAdmin } = useAuth();
  const [dia, setDia] = useState<DiaTrabalho>("terca");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "interna" | "externa" | "vaga">("todas");


  const { data: consulentes } = useQuery({
    queryKey: ["recepcao-consulentes", q],
    queryFn: async () => {
      if (!q || q.length < 2) return [];
      const { data, error } = await supabase
        .from("consulentes")
        .select("id, nome, telefone, data_nascimento, ideias_suicidas, dialogo_pendente, designacoes(status, sessoes_realizadas, sessoes_totais, macas(numero, nome, cor_hex))")
        .or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`)
        .order("nome")
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: q.length >= 2,
  });

  const { data: macas } = useQuery({
    queryKey: ["macas-recepcao", dia],
    queryFn: async () => {
      const { data: macas, error } = await supabase
        .from("macas")
        .select("*, maca_mediuns(user_id)")
        .eq("ativa", true)
        .eq("dia", dia)
        .order("numero");
      if (error) throw error;

      const { data: ativas } = await supabase
        .from("designacoes")
        .select("maca_id")
        .eq("status", "ativa");

      const counts = new Map<string, number>();
      ativas?.forEach((d) => counts.set(d.maca_id, (counts.get(d.maca_id) ?? 0) + 1));

      const userIds = Array.from(
        new Set(
          (macas ?? []).flatMap((m) =>
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

      return macas.map((m) => {
        const mediuns = ((m.maca_mediuns ?? []) as Array<{ user_id: string }>)
          .map((mm) => nameMap.get(mm.user_id) || "")
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        return { ...m, ativos: counts.get(m.id) ?? 0, mediuns };
      });
    },
  });

  const proximaSessaoIso =
    getAtendimentoDatesIsoByDia(dia).find((d) => d >= toIsoHoje()) ??
    getAtendimentoDatesIsoByDia(dia).slice(-1)[0];

  const macasFiltradas = (macas ?? []).filter((m) => {
    if (filtro === "interna") return m.categoria === "interna";
    if (filtro === "externa") return m.categoria === "externa";
    if (filtro === "vaga") return m.ativos < m.lotacao_max;
    return true;
  });

  return (
    <>
      <CabecalhoPagina
        titulo="Acolhimento"
        descricao={<>
          Identifique o consulente, designe a maca e entregue a ficha por ordem de chegada.
          A presença é registrada depois pelo médium responsável.
          {proximaSessaoIso && (
            <span className="mt-1 block font-medium text-primary">
              Sessão: {formatDataCurta(proximaSessaoIso)}
            </span>
          )}
        </>}
        acoes={
          <Link to="/recepcao/imprimir" className="shrink-0">
            <Button>
              <Printer className="h-4 w-4 mr-2" /> Imprimir lista de chegada
            </Button>
          </Link>
        }
      />
      <div className="space-y-6">

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 h-11"
          placeholder="Buscar consulente por nome ou telefone"
          aria-label="Buscar consulente por nome ou telefone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {q.length < 2 && (
        <div className="text-sm text-muted-foreground">Digite pelo menos 2 caracteres para buscar.</div>
      )}

      {consulentes && consulentes.length > 1 && (
        <div className="text-sm text-muted-foreground">
          {consulentes.length} resultados para “{q}”
          {proximaSessaoIso ? ` · sessão ${formatDataCurta(proximaSessaoIso).toLowerCase()}` : ""}
        </div>
      )}


      {consulentes && consulentes.length > 0 && (
        <div className="space-y-2">
          {consulentes.map((c) => {
            const designacoes = (c.designacoes as Array<{ status: string; sessoes_realizadas: number; sessoes_totais: number; macas: { numero: number; nome: string; cor_hex: string } | null }> | null) ?? [];
            const ativa = designacoes.find((d) => d.status === "ativa");
            const encerrado = !ativa && designacoes.length > 0;
            const proximoFim = ativa ? (ativa.sessoes_totais - ativa.sessoes_realizadas <= 1) : false;
            const cardBorder = encerrado ? "border-border" : proximoFim ? "border-amber-300" : "";
            const cardBg = encerrado ? "bg-muted" : proximoFim ? "bg-amber-50" : "";
            return (
              <Card key={c.id} className={cn("p-3 flex items-center justify-between gap-3 flex-wrap group cursor-pointer hover:border-primary/30 hover:shadow-md transition-shadow", cardBorder, cardBg)}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{c.nome}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {c.data_nascimento && (
                        <span>{new Date(`${c.data_nascimento}T00:00:00`).toLocaleDateString("pt-BR")}</span>
                      )}
                      {c.telefone}
                      {ativa?.macas && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: ativa.macas.cor_hex }}
                        >
                          Maca {ativa.macas.numero} · {ativa.macas.nome}
                        </span>
                      )}
                      {!ativa && <span>sem maca</span>}
                      {c.ideias_suicidas && (
                        <span className="inline-flex items-center gap-1 text-destructive font-medium">
                          <AlertTriangle className="h-3 w-3" />Alerta
                        </span>
                      )}
                      {c.dialogo_pendente && (
                        <span className="text-amber-800">Diálogo pendente</span>
                      )}
                      {encerrado && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                          Encerrado
                        </span>
                      )}
                      {proximoFim && (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
                          Próximo do término
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(isDialogador || isAdmin) && (
                    <Link to="/consulentes/$id" params={{ id: c.id }}>
                      <Button variant="outline" size="sm" className="h-11">
                        Ver ficha <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                  <Link to="/dialogo/$consulenteId/designar" params={{ consulenteId: c.id }}>
                    <Button size="sm" className="h-11">
                      <BadgeCheck className="h-4 w-4 mr-2" /> Designar maca
                    </Button>
                  </Link>
                </div>

              </Card>
            );
          })}
        </div>
      )}

      {q.length >= 2 && consulentes && consulentes.length === 0 && (
        <div className="text-sm text-muted-foreground">Nenhum consulente encontrado.</div>
      )}

      <hr className="border-border" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold font-['Playfair_Display'] text-foreground">Macas · {diaLabel(dia)}</h2>
          <p className="text-muted-foreground text-sm">
            Toque em uma maca para designar o consulente e ver quem já está designado.
          </p>
        </div>
        <Tabs value={dia} onValueChange={(v) => setDia(v as DiaTrabalho)}>
          <TabsList>
            <TabsTrigger value="terca">{diaLabel("terca")}</TabsTrigger>
            <TabsTrigger value="sabado">{diaLabel("sabado")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["todas", "Todas"],
          ["interna", "Interna"],
          ["externa", "Externa"],
          ["vaga", "Com vaga"],
        ] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFiltro(v)}
            aria-pressed={filtro === v}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filtro === v ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {macas && macasFiltradas.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Nenhuma maca para este filtro em {diaLabel(dia).toLowerCase()}.
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {macasFiltradas.map((m) => {
          const isLight = isLightHex(m.cor_hex);
          const lotada = m.ativos >= m.lotacao_max;
          const quaseCheia = !lotada && m.ativos >= m.lotacao_max - 1;
          const pct = Math.min(100, Math.round((m.ativos / Math.max(1, m.lotacao_max)) * 100));
          return (
            <Link key={m.id} to="/recepcao/maca/$id" params={{ id: m.id }}>
              <Card
                className={cn(
                  "p-4 h-full cursor-pointer hover:shadow-md transition-shadow border-2 group",
                  lotada && "opacity-90",
                )}
                style={{ borderColor: m.cor_hex, backgroundColor: m.cor_hex + "18" }}
              >
                <div
                  className="rounded-lg w-full h-16 mb-3 flex items-center justify-center text-2xl font-bold shadow-sm group-hover:shadow-md transition-shadow"
                  style={{ backgroundColor: m.cor_hex, color: isLight ? "#111" : "#fff" }}
                >
                  {m.numero}
                </div>
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2 flex-wrap">
                  <span>{m.nome}</span>
                  <MacaCategoriaTag numero={m.numero} categoria={m.categoria} />
                </div>

                {(lotada || quaseCheia) && (
                  <div
                    className={cn(
                      "mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      lotada
                        ? "bg-destructive/10 text-destructive border-destructive/40"
                        : "bg-amber-100 text-amber-800 border-amber-300",
                    )}
                  >
                    {lotada ? "Lotada" : "Quase cheia"}
                  </div>
                )}

                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" /> designados
                    </span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        lotada ? "text-destructive" : quaseCheia ? "text-amber-800" : "text-foreground",
                      )}
                    >
                      {m.ativos}/{m.lotacao_max}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", lotada ? "bg-destructive" : quaseCheia ? "bg-amber-500" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {lotada && (
                    <p className="mt-1 text-[11px] font-medium text-destructive">Não aceita novas designações</p>
                  )}
                </div>

                {m.mediuns.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2 line-clamp-2" title={m.mediuns.join(", ")}>
                    <span className="font-medium text-foreground/80">Médiuns: </span>
                    {m.mediuns.join(", ")}
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
      </div>
    </>
  );
}


function isLightHex(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}
