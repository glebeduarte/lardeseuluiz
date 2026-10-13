import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, UserPlus, Check, X, AlertCircle, Info, Radio } from "lucide-react";
import { getOrCreateTodaySessao } from "@/lib/sessao";
import { useAuth } from "@/lib/auth";
import { AtribuirConsulenteDialog } from "@/components/AtribuirConsulenteDialog";
import { cn } from "@/lib/utils";
import { MacaCategoriaTag } from "@/lib/maca-categoria";
import { isDesignacaoArquivada } from "@/lib/atendimento-dates";
import { CabecalhoPagina } from "@/compartilhado";
import { LinkRota } from "@/components/LinkRota";

export const Route = createFileRoute("/recepcao/maca/$id")({
  component: () => (
    <RequireAuth roles={["recepcao", "dialogador", "admin"]} denyRoles={["medium"]}>
      <MacaRecepcao />
    </RequireAuth>
  ),
});

function MacaRecepcao() {
  const { id } = Route.useParams();
  const { isDialogador } = useAuth();

  const { data: maca } = useQuery({
    queryKey: ["maca", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("macas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sessao } = useQuery({
    queryKey: ["sessao-hoje"],
    queryFn: () => getOrCreateTodaySessao(),
  });

  const { data: lista, refetch } = useQuery({
    queryKey: ["maca-lista-recepcao", id, sessao?.id, maca?.dia],
    enabled: !!sessao,
    queryFn: async () => {
      const { data: desigsRaw, error } = await supabase
        .from("designacoes")
        .select("id, sessoes_realizadas, sessoes_totais, status, closure_reason, closed_at, consulente_id, created_at, consulentes(id, nome, telefone, ideias_suicidas, dialogo_pendente)")
        .eq("maca_id", id)
        .in("status", ["ativa", "cancelada"])
        .order("created_at");
      if (error) throw error;
      const desigs = (desigsRaw ?? []).filter(
        (d: any) =>
          (d.status === "ativa" || d.closure_reason !== "transferencia") &&
          !isDesignacaoArquivada(d.status, d.closed_at, maca?.dia)
      );
      const ids = desigs.map((d) => d.id);
      let presencas: Array<{ designacao_id: string; status: string }> = [];
      if (ids.length && sessao) {
        const { data: p } = await supabase
          .from("presencas")
          .select("designacao_id, status")
          .eq("sessao_id", sessao.id)
          .in("designacao_id", ids);
        presencas = p ?? [];
      }
      const pMap = new Map(presencas.map((p) => [p.designacao_id, p.status]));
      const mapped = desigs.map((d) => ({ ...d, presenca: pMap.get(d.id) ?? null }));
      mapped.sort((a, b) => {
        const aInativo = a.status !== "ativa" ? 1 : 0;
        const bInativo = b.status !== "ativa" ? 1 : 0;
        if (aInativo !== bInativo) return aInativo - bInativo;
        return (a.created_at ?? "").localeCompare(b.created_at ?? "");
      });
      return mapped;
    },
  });

  useEffect(() => {
    if (!sessao) return;
    const ch = supabase
      .channel(`presencas-recep-${sessao.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "presencas", filter: `sessao_id=eq.${sessao.id}` }, () => {
        refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessao, refetch]);

  if (!maca)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando maca">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );

  const statusBadge = (p: string | null) => {
    if (p === "presente") return <Badge variant="outline" className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-300"><Check className="h-3 w-3" />Presente</Badge>;
    if (p === "ausente") return <Badge variant="outline" className="gap-1 bg-amber-100 text-amber-800 border-amber-300"><X className="h-3 w-3" />Falta</Badge>;
    if (p === "falta_justificada") return <Badge variant="outline" className="gap-1 bg-amber-100 text-amber-800 border-amber-300"><X className="h-3 w-3" />Falta justificada</Badge>;
    if (p === "emergencia") return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Emergência</Badge>;
    if (p === "atendimento_distancia") return <Badge variant="outline" className="gap-1 bg-sky-100 text-sky-800 border-sky-300"><Radio className="h-3 w-3" />À distância</Badge>;
    return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Aguardando</Badge>;
  };

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/recepcao", rotulo: "Voltar para acolhimento" }}
        Link={LinkRota}
        titulo={
          <span className="inline-flex items-center gap-3 flex-wrap">
            {/* A cor da maca é dado do usuário */}
            <span
              className="rounded-lg h-11 w-11 inline-flex items-center justify-center font-sans font-bold text-xl shrink-0"
              style={{ backgroundColor: maca.cor_hex, color: "#fff" }}
            >
              {maca.numero}
            </span>
            {maca.nome}
            <MacaCategoriaTag numero={maca.numero} categoria={maca.categoria} className="font-sans" />
          </span>
        }
        descricao={`Sessão ${sessao?.data ?? ""}`}
        acoes={
          <AtribuirConsulenteDialog
            macaId={maca.id}
            macaNome={maca.nome}
            trigger={
              <Button>
                <UserPlus className="h-4 w-4 mr-2" /> Atribuir consulente
              </Button>
            }
          />
        }
      />
      <div className="space-y-6">
      <div className="rounded-md border border-sky-300 bg-sky-100 px-3 py-2 text-xs text-sky-800 flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          O acolhimento apenas confere o nome e entrega a ficha do consulente. A presença é registrada pelo
          <strong> médium responsável</strong> da maca.
        </span>
      </div>

      <div className="space-y-2">
        {lista?.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Nenhum consulente designado para esta maca.
          </div>
        )}
        {lista?.map((d) => {
          const c = d.consulentes as { id: string; nome: string; telefone: string; ideias_suicidas: boolean; dialogo_pendente: boolean } | null;
          const inativo = d.status !== "ativa";
          const realizados = d.sessoes_realizadas + (d.presenca === "presente" ? 0 : 1);
          const total = d.sessoes_totais ?? 15;
          const restantes = total - realizados;
          const encerrado = !inativo && realizados >= total;
          const proximoFim = !encerrado && !inativo && restantes <= 1;
          const cardBorder = inativo ? "border-muted-foreground/30" : encerrado ? "border-sky-300" : proximoFim ? "border-amber-300" : "";
          const cardBg = inativo ? "bg-muted/40" : encerrado ? "bg-sky-50" : proximoFim ? "bg-amber-50" : "";
          return (
            <Card key={d.id} className={cn("p-4 flex items-center justify-between flex-wrap gap-2", cardBorder, cardBg, inativo && "opacity-70")}>
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <div>
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    <span>
                      {inativo && <span className="text-muted-foreground">[inativo] </span>}
                      {c?.nome}
                      {inativo && <span className="text-muted-foreground"> *</span>}
                    </span>
                    {c?.ideias_suicidas && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" /> Alerta
                      </Badge>
                    )}
                    {c?.dialogo_pendente && !inativo && (
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">Diálogo pendente</Badge>
                    )}
                    {inativo && (
                      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                        Inativo
                      </Badge>
                    )}
                    {encerrado && (
                      <Badge variant="outline" className="text-xs bg-sky-100 text-sky-800 border-sky-300">
                        Encerrado
                      </Badge>
                    )}
                    {proximoFim && (
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                        Próximo do término
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sessão {realizados}/{total}
                    {isDialogador && c?.telefone && ` · ${c.telefone}`}
                  </div>
                </div>
              </div>
              <div>{inativo ? <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Inativo</Badge> : statusBadge(d.presenca)}</div>
            </Card>
          );
        })}
      </div>
      </div>
    </>
  );
}
