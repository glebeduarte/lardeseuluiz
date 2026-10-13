import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useState } from "react";
import { MacaCategoriaTag } from "@/lib/maca-categoria";
import { friendlyDbError } from "@/lib/db-errors";
import { useConfirm } from "@/components/ConfirmDialog";
import { ArrowLeft } from "lucide-react";
import { CabecalhoPagina } from "@/compartilhado";
import { cn } from "@/lib/utils";
import { useEscolhaMaca, buscarMacasAtivas, encerrarPorTroca } from "@/components/EscolhaMacaDialog";

export const Route = createFileRoute("/dialogo/$consulenteId/designar")({
  component: () => (
    <RequireAuth roles={["recepcao", "admin"]}>
      <Designar />
    </RequireAuth>
  ),
});

function Designar() {
  const { consulenteId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [escolherMaca, escolhaEl] = useEscolhaMaca();
  const [busy, setBusy] = useState(false);
  const [dia, setDia] = useState<"terca" | "sabado">("terca");
  const [soIndicadas, setSoIndicadas] = useState(true);

  const { data: consulente } = useQuery({
    queryKey: ["consulente-designar", consulenteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulentes")
        .select("nome, encaminhamento_maca, encaminhamento_maca_categoria")
        .eq("id", consulenteId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const categoriaIndicada = consulente?.encaminhamento_maca_categoria ?? null;

  const { data: macas } = useQuery({
    queryKey: ["macas-designar"],
    queryFn: async () => {
      const { data: macas, error } = await supabase.from("macas").select("*").eq("ativa", true).order("numero");
      if (error) throw error;
      const { data: ativas } = await supabase.from("designacoes").select("maca_id").eq("status", "ativa");
      const counts = new Map<string, number>();
      ativas?.forEach((d) => counts.set(d.maca_id, (counts.get(d.maca_id) ?? 0) + 1));
      return macas.map((m) => ({ ...m, ativos: counts.get(m.id) ?? 0 }));
    },
  });

  const visiveis = (macas ?? [])
    .filter((m) => m.dia === dia)
    .filter((m) => !soIndicadas || !categoriaIndicada || m.categoria === categoriaIndicada);

  const designar = async (maca_id: string, lotacao_max: number, ativos: number, nomeMaca: string) => {
    if (ativos >= lotacao_max) {
      toast.error(`${nomeMaca} já está na lotação máxima de ${lotacao_max} consulentes.`);
      return;
    }
    setBusy(true);
    let ativasList: Awaited<ReturnType<typeof buscarMacasAtivas>>;
    try { ativasList = await buscarMacasAtivas(consulenteId); }
    catch (e: any) { setBusy(false); return toast.error(friendlyDbError(e)); }
    if (ativasList.some((a) => a.maca_id === maca_id)) {
      setBusy(false);
      return toast.error("Consulente já está designado nesta maca.");
    }
    let escolha: "adicionar" | "trocar" | null = null;
    if (ativasList.length > 0) {
      escolha = await escolherMaca({ nome: consulente?.nome ?? "O consulente", atuais: ativasList.map((a) => a.nome), nova: nomeMaca });
      if (!escolha) { setBusy(false); return; }
    } else if (!(await confirm({
      title: `Designar para ${nomeMaca}?`,
      description: `${consulente?.nome ?? "O consulente"} passará a integrar esta maca. Ocupação ficará em ${ativos + 1}/${lotacao_max}.`,
      tone: "info",
      confirmLabel: "Designar",
    }))) {
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("designacoes").insert({
      consulente_id: consulenteId,
      maca_id,
      dialogador_id: user?.id,
      status: "ativa",
    });
    if (error) { setBusy(false); return toast.error(friendlyDbError(error)); }
    if (escolha === "trocar") {
      try { await encerrarPorTroca(ativasList.map((a) => a.id)); }
      catch (e: any) { toast.error(friendlyDbError(e)); }
    }
    setBusy(false);
    await supabase.from("consulentes").update({ dialogo_pendente: false }).eq("id", consulenteId);

    const anteriores = ativasList.map((a) => a.nome).join(", ");
    toast.success(
      escolha === "trocar" ? `Consulente trocado para ${nomeMaca}` : escolha === "adicionar" ? `Maca ${nomeMaca} adicionada` : `Consulente designado para ${nomeMaca}`,
      {
        description: escolha === "trocar"
          ? `Saiu de ${anteriores} e agora está somente em ${nomeMaca}.`
          : escolha === "adicionar"
          ? `O consulente agora está em ${anteriores} e ${nomeMaca}.`
          : `Lotação atualizada: ${ativos + 1}/${lotacao_max} consulentes`,
      },
    );
    navigate({ to: "/consulentes/$id", params: { id: consulenteId } });
  };

  return (
    <>
      {escolhaEl}
      <CabecalhoPagina
        titulo="Designar maca"
        descricao={<>Consulente: <strong className="text-foreground">{consulente?.nome}</strong></>}
        acoes={
          <Button variant="outline" onClick={() => navigate({ to: "/consulentes/$id", params: { id: consulenteId } })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        }
      />
      <div className="space-y-6">

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={dia} onValueChange={(v) => setDia(v as "terca" | "sabado")}>
          <TabsList>
            <TabsTrigger value="terca">Terça-feira</TabsTrigger>
            <TabsTrigger value="sabado">Sábado</TabsTrigger>
          </TabsList>
        </Tabs>
        {categoriaIndicada && (
          <Button
            variant={soIndicadas ? "default" : "outline"}
            size="sm"
            onClick={() => setSoIndicadas((s) => !s)}
          >
            {soIndicadas
              ? `Mostrando só macas ${categoriaIndicada === "externa" ? "externas" : "internas"}`
              : "Mostrar todas as macas do dia"}
          </Button>
        )}
      </div>

      {categoriaIndicada && (
        <p className="text-sm text-muted-foreground">
          Encaminhamento do diálogo: <strong>Maca {categoriaIndicada === "externa" ? "Externa" : "Interna (saúde)"}</strong>
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {visiveis.map((m) => {
          const lotada = m.ativos >= m.lotacao_max;
          const quase = !lotada && m.ativos >= m.lotacao_max - 1;
          return (
            <Card key={m.id} className="p-3 border-2" style={{ borderColor: m.cor_hex }}>
              <div
                className="rounded h-14 mb-2 flex items-center justify-center font-bold text-xl text-white"
                style={{ backgroundColor: m.cor_hex, textShadow: "0 1px 2px rgba(0,0,0,.5)" }}
              >
                {m.numero}
              </div>
              <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                <span>{m.nome}</span>
                <MacaCategoriaTag numero={m.numero} categoria={m.categoria} />
              </div>
              {m.finalidade && (
                <p className="mt-0.5 text-xs text-muted-foreground">{m.finalidade}</p>
              )}
              <div className="mb-2 mt-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={
                      lotada
                        ? "bg-destructive/10 text-destructive border-destructive/40"
                        : quase
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300"
                    }
                  >
                    {m.ativos}/{m.lotacao_max}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {lotada ? "Lotada" : quase ? "Quase cheia" : `${m.lotacao_max - m.ativos} vagas`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      lotada ? "bg-destructive" : quase ? "bg-amber-500" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, (m.ativos / Math.max(1, m.lotacao_max)) * 100)}%` }}
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={busy || lotada}
                onClick={() => designar(m.id, m.lotacao_max, m.ativos, `Maca ${m.numero} · ${m.nome}`)}
              >
                {lotada ? "Lotada" : "Designar"}
              </Button>
            </Card>
          );
        })}
        {visiveis.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">
            Nenhuma maca disponível com esses critérios.
          </p>
        )}
      </div>
      </div>
    </>
  );
}
