import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buscarTudo } from "@/lib/paginar";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Users, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MacaCategoriaTag } from "@/lib/maca-categoria";
import { CabecalhoPagina } from "@/compartilhado";
import {
  ATENDIMENTO_DATES_ISO,
  formatDataCurta,
  formatDataExtenso,
  getAtendimentoDatesIsoAteHoje,
  diaLabelFromIso,
} from "@/lib/atendimento-dates";

export const Route = createFileRoute("/medium/")({
  component: () => (
    <RequireAuth roles={["medium", "admin"]}>
      <LancarSessao />
    </RequireAuth>
  ),
});

function diaDaData(iso: string): "terca" | "sabado" {
  return diaLabelFromIso(iso) === "Sábado" ? "sabado" : "terca";
}

function LancarSessao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessaoIso, setSessaoIso] = useState<string | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  // Datas válidas até hoje (mais recentes primeiro)
  const datasValidas = useMemo(
    () => getAtendimentoDatesIsoAteHoje().slice().reverse(),
    [],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["lancar-sessao", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: assigned, error: e1 } = await supabase
        .from("maca_mediuns")
        .select("maca_id")
        .eq("user_id", user!.id);
      if (e1) throw e1;
      const ids = (assigned ?? []).map((r) => r.maca_id);
      if (!ids.length) return { macas: [], lancadasPorData: new Map<string, Set<string>>(), presencasPorData: new Map<string, number>() };

      const { data: macas, error: e2 } = await supabase
        .from("macas")
        .select("id, numero, nome, dia, categoria, cor_hex, lotacao_max")
        .in("id", ids)
        .eq("ativa", true)
        .order("numero");
      if (e2) throw e2;

      const { data: desigs } = await supabase
        .from("designacoes")
        .select("id, maca_id")
        .eq("status", "ativa")
        .in("maca_id", ids);
      const ocupacao = new Map<string, number>();
      (desigs ?? []).forEach((d) => ocupacao.set(d.maca_id, (ocupacao.get(d.maca_id) ?? 0) + 1));

      const { data: sessoes } = await supabase
        .from("sessoes")
        .select("id, data")
        .in("data", ATENDIMENTO_DATES_ISO);
      const dataBySessao = new Map((sessoes ?? []).map((s) => [s.id, s.data]));

      const presencas = await buscarTudo((de, ate) => supabase
        .from("presencas")
        .select("id, sessao_id, designacoes(maca_id)")
        .in("sessao_id", (sessoes ?? []).map((s) => s.id))
        .order("id")
        .range(de, ate));

      const lancadasPorData = new Map<string, Set<string>>();
      const presencasPorData = new Map<string, number>();
      const presencasPorDataMaca = new Map<string, number>();
      for (const p of (presencas ?? []) as any[]) {
        const macaId = p.designacoes?.maca_id;
        const dataIso = dataBySessao.get(p.sessao_id);
        if (!macaId || !dataIso || !ids.includes(macaId)) continue;
        if (!lancadasPorData.has(dataIso)) lancadasPorData.set(dataIso, new Set());
        lancadasPorData.get(dataIso)!.add(macaId);
        presencasPorData.set(dataIso, (presencasPorData.get(dataIso) ?? 0) + 1);
        const k = `${dataIso}|${macaId}`;
        presencasPorDataMaca.set(k, (presencasPorDataMaca.get(k) ?? 0) + 1);
      }

      return {
        macas: (macas ?? []).map((m) => ({ ...m, ocupacao: ocupacao.get(m.id) ?? 0 })),
        lancadasPorData,
        presencasPorData,
        presencasPorDataMaca,
      } as any;
    },
  });

  const macas = (data?.macas ?? []) as Array<{
    id: string; numero: number; nome: string; dia: string; categoria: string;
    cor_hex: string; lotacao_max: number; ocupacao: number;
  }>;

  const resumoDatas = useMemo(() => {
    const lancadas: Map<string, Set<string>> = data?.lancadasPorData ?? new Map();
    return datasValidas.map((iso) => {
      const dia = diaDaData(iso);
      const minhasDoDia = macas.filter((m) => m.dia === dia);
      const feitas = Array.from(lancadas.get(iso) ?? []).filter((id) =>
        minhasDoDia.some((m) => m.id === id),
      ).length;
      const total = minhasDoDia.length;
      const estado: "pendente" | "parcial" | "concluida" =
        feitas === 0 ? "pendente" : feitas < total ? "parcial" : "concluida";
      return { iso, dia, feitas, total, estado, presencas: data?.presencasPorData?.get(iso) ?? 0 };
    }).filter((r) => r.total > 0);
  }, [datasValidas, macas, data]);

  const pendentes = resumoDatas.filter((r) => r.estado !== "concluida");
  const concluidas = resumoDatas.filter((r) => r.estado === "concluida");
  const listaConcluidas = verTodas ? concluidas : concluidas.slice(0, 4);

  // ---------- Passo 1: escolher a sessão ----------
  if (!sessaoIso) {
    return (
      <>
        <CabecalhoPagina
          titulo={<span className="inline-flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Lançar sessão</span>}
          descricao="Qual sessão você vai lançar? Só terças e sábados. As pendentes aparecem primeiro."
        />
        <div className="space-y-6">

        {isLoading && (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && macas.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Você não está atribuído a nenhuma maca. Fale com a administração.
          </Card>
        )}

        {!isLoading && macas.length > 0 && (
          <>
            <SessaoGrupo
              titulo={`Pendentes de lançamento (${pendentes.length})`}
              vazio="Nenhuma sessão pendente. Tudo em dia."
              itens={pendentes}
              onEscolher={setSessaoIso}
            />
            <SessaoGrupo
              titulo="Já lançadas"
              vazio="Nenhuma sessão lançada ainda."
              itens={listaConcluidas}
              onEscolher={setSessaoIso}
            />
            {concluidas.length > listaConcluidas.length && (
              <Button variant="outline" className="w-full" onClick={() => setVerTodas(true)}>
                Escolher outra data
              </Button>
            )}
          </>
        )}
        </div>
      </>
    );
  }

  // ---------- Passo 2: escolher a maca ----------
  const dia = diaDaData(sessaoIso);
  const macasDoDia = macas.filter((m) => m.dia === dia);
  const lancadas: Set<string> = data?.lancadasPorData?.get(sessaoIso) ?? new Set();

  return (
    <>
      <CabecalhoPagina
        titulo="Lançar sessão"
        descricao={formatDataExtenso(sessaoIso)}
        acoes={
          <Button
            variant="outline"
            aria-label="Voltar para a escolha da sessão"
            onClick={() => setSessaoIso(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        }
      />
      <div className="space-y-6">

      <p className="text-sm text-muted-foreground">
        Escolha a maca para fazer a chamada. {lancadas.size} de {macasDoDia.length} macas já lançadas nesta sessão.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {macasDoDia.map((m) => {
          const lancada = lancadas.has(m.id);
          const lancados = data?.presencasPorDataMaca?.get(`${sessaoIso}|${m.id}`) ?? 0;
          const pct = Math.min(100, Math.round((m.ocupacao / Math.max(1, m.lotacao_max)) * 100));
          return (
            <button
              key={m.id}
              onClick={() =>
                navigate({
                  to: "/medium/maca/$id",
                  params: { id: m.id },
                  search: { data: sessaoIso },
                })
              }
              className="text-left"
            >
              <Card className="p-4 border-2 h-full hover:shadow-md transition-shadow" style={{ borderColor: m.cor_hex }}>
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-lg flex items-center justify-center text-lg font-bold text-primary-foreground shrink-0"
                    style={{ backgroundColor: m.cor_hex }}
                  >
                    {m.numero}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      <span className="truncate">{m.nome}</span>
                      <MacaCategoriaTag numero={m.numero} categoria={m.categoria} />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Users className="h-3 w-3" />
                      {m.ocupacao}/{m.lotacao_max} designados · {lancados} lançados
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2">
                  {lancada ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Lançada</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Pendente</Badge>
                  )}
                </div>
              </Card>
            </button>
          );
        })}
      </div>
      </div>
    </>
  );
}

function SessaoGrupo({
  titulo,
  vazio,
  itens,
  onEscolher,
}: {
  titulo: string;
  vazio: string;
  itens: Array<{ iso: string; feitas: number; total: number; estado: string; presencas: number }>;
  onEscolher: (iso: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold font-['Playfair_Display'] text-foreground">{titulo}</h2>
      {itens.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">{vazio}</Card>
      ) : (
        itens.map((s) => (
          <button key={s.iso} onClick={() => onEscolher(s.iso)} className="w-full text-left">
            <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{formatDataCurta(s.iso)}</div>
                <div className="text-xs text-muted-foreground">
                  {s.estado === "pendente"
                    ? `Nenhum registro · ${s.total} maca${s.total === 1 ? "" : "s"}`
                    : s.estado === "parcial"
                      ? `Parcial · ${s.feitas} de ${s.total} macas lançadas`
                      : `${s.presencas} registros · ${s.total} maca${s.total === 1 ? "" : "s"}`}
                </div>
              </div>
              {s.estado === "pendente" && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Pendente</Badge>
              )}
              {s.estado === "parcial" && (
                <Badge variant="outline" className="bg-sky-100 text-sky-800 border-sky-300">Parcial</Badge>
              )}
              {s.estado === "concluida" && (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Concluída</Badge>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Card>
          </button>
        ))
      )}
    </section>
  );
}
