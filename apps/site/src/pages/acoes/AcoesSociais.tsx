import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, HeartHandshake, Stethoscope, ChevronRight, Settings2, Home } from "lucide-react";
import { db, dataLongaBR, hoje, EDICAO_LABEL, EDICAO_COR, type Edicao } from "@/lib/acoes";

interface ProjetoAcao {
  id: string; name: string; slug: string | null; status: string; cover_url: string | null; schedule: string | null;
  summary: string | null; is_public: boolean; has_health_records: boolean;
}

export default function AcoesSociais() {
  const { data, isLoading } = useQuery({
    queryKey: ["acoes-painel"],
    queryFn: async () => {
      const [{ data: projetos, error }, { data: edicoes }, { data: familias }, { data: candidaturas }] = await Promise.all([
        db.from("projects").select("id, name, slug, status, cover_url, schedule, summary, is_public, has_health_records").neq("status", "encerrado").order("display_order").order("name"),
        db.from("project_editions").select("*").gte("starts_on", hoje()).neq("status", "cancelada").order("starts_on"),
        db.from("project_families").select("project_id").is("left_on", null),
        db.from("edition_applications").select("edition_id").eq("status", "pendente"),
      ]);
      if (error) throw error;
      return {
        projetos: (projetos ?? []) as ProjetoAcao[],
        edicoes: (edicoes ?? []) as Edicao[],
        familias: (familias ?? []) as { project_id: string }[],
        candidaturas: (candidaturas ?? []) as { edition_id: string }[],
      };
    },
  });

  const projetos = data?.projetos ?? [];
  const proxima = (id: string) => data?.edicoes.find((e) => e.project_id === id);
  const qtdFamilias = (id: string) => data?.familias.filter((f) => f.project_id === id).length ?? 0;
  const edicoesDo = (id: string) => new Set(data?.edicoes.filter((e) => e.project_id === id).map((e) => e.id));
  const pendentes = (id: string) => {
    const s = edicoesDo(id);
    return data?.candidaturas.filter((c) => s.has(c.edition_id)).length ?? 0;
  };
  const totalEdicoes = data?.edicoes.length ?? 0;
  const totalPendentes = data?.candidaturas.length ?? 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Ações Sociais</h1>
            <p className="text-sm text-muted-foreground">Edições, escala de voluntários, famílias atendidas e relatórios de cada ação.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/app/familias"><Home className="w-4 h-4 mr-2" /> Famílias</Link></Button>
            <Button variant="outline" asChild><Link to="/app/projetos"><Settings2 className="w-4 h-4 mr-2" /> Cadastro dos projetos</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Resumo icon={HeartHandshake} label="Ações em andamento" valor={projetos.length} />
          <Resumo icon={CalendarDays} label="Próximas edições" valor={totalEdicoes} />
          <Resumo icon={Users} label="Candidaturas a avaliar" valor={totalPendentes} destaque={totalPendentes > 0} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
        ) : projetos.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma ação em andamento. Cadastre em <Link className="underline" to="/app/projetos">Projetos sociais</Link>.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projetos.map((p) => {
              const e = proxima(p.id);
              const pend = pendentes(p.id);
              return (
                <Link key={p.id} to={`/app/acoes/${p.id}`} className="group">
                  <Card className="overflow-hidden h-full transition-shadow group-hover:shadow-md">
                    <div className="flex">
                      {p.cover_url ? (
                        <img src={p.cover_url} alt="" className="w-28 sm:w-36 object-cover shrink-0" />
                      ) : (
                        <div className="w-28 sm:w-36 shrink-0 flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                          <HeartHandshake className="w-8 h-8 text-[hsl(var(--primary))]" />
                        </div>
                      )}
                      <CardContent className="p-4 flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{p.name}</div>
                            {p.schedule && <div className="text-xs text-muted-foreground">{p.schedule}</div>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.is_public && <Badge variant="outline" className="text-[10px]">No site</Badge>}
                          {p.has_health_records && <Badge variant="outline" className="text-[10px] gap-1"><Stethoscope className="w-3 h-3" /> Saúde</Badge>}
                          {pend > 0 && <Badge className="text-[10px] bg-[hsl(var(--accent))] text-[hsl(var(--primary-dark))] hover:bg-[hsl(var(--accent))]">{pend} candidatura{pend > 1 ? "s" : ""}</Badge>}
                        </div>
                        <div className="text-sm">
                          {e ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-muted-foreground">Próxima:</span>
                              <span className="font-medium">{dataLongaBR(e.starts_on)}</span>
                              <Badge variant="outline" className={`text-[10px] ${EDICAO_COR[e.status]}`}>{EDICAO_LABEL[e.status]}</Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Nenhuma edição marcada</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{qtdFamilias(p.id)} família{qtdFamilias(p.id) !== 1 ? "s" : ""} acompanhada{qtdFamilias(p.id) !== 1 ? "s" : ""}</div>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Resumo({ icon: Icon, label, valor, destaque }: { icon: any; label: string; valor: number; destaque?: boolean }) {
  return (
    <Card className={destaque ? "border-[hsl(var(--accent))]" : ""}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{valor}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
