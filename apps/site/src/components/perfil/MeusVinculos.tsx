import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, HeartHandshake, Crown, ChevronRight, ListChecks, CalendarDays, MessageCircle } from "lucide-react";
import { db } from "@/lib/acoes";

export type VinculoSecretaria = {
  id: string; nome: string; icone: string | null; papel: "coordenador" | "participante"; desde: string;
  coordenadores: string | null; membros: number; minhas_abertas: number; funcoes: string | null;
};
export type VinculoProjeto = {
  id: string; nome: string; slug: string | null; capa: string | null; status: string; grupo: string | null;
  coordena: boolean; funcoes: string | null; escalas: number; proxima: string | null;
};
export type Vinculos = { secretarias: VinculoSecretaria[]; projetos: VinculoProjeto[] };

/** Secretarias e projetos sociais a que a pessoa está ligada (membro, coordenação, função ou escala). */
export function useMeusVinculos(personId?: string | null) {
  return useQuery({
    queryKey: ["meus-vinculos", personId ?? "eu"],
    queryFn: async () => {
      const { data, error } = await db.rpc("meus_vinculos", personId ? { p_person: personId } : {});
      if (error) throw error;
      return (data ?? { secretarias: [], projetos: [] }) as Vinculos;
    },
  });
}

const dataCurta = (d?: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "") : "");

/** Cartão "Onde atuo" do perfil, na aba Governança. */
export default function MeusVinculos({ vinculos, operaAcoes }: { vinculos: Vinculos; operaAcoes: boolean }) {
  const { secretarias, projetos } = vinculos;
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="font-['Playfair_Display'] text-lg">Onde atuo na Casa</CardTitle>
        <CardDescription>Secretarias e projetos sociais de que você faz parte</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Secretarias</div>
          {secretarias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não participa de nenhuma secretaria. A coordenação de cada uma inclui os participantes.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {secretarias.map((s) => {
                const coord = s.papel === "coordenador";
                return (
                  <Link key={s.id} to={`/app/secretarias/${s.id}`}
                    className={`rounded-xl border p-4 flex items-start gap-3 hover:shadow-sm transition-shadow ${coord ? "border-2" : ""}`}
                    style={coord ? { borderColor: "hsl(var(--accent))", background: "hsl(var(--accent) / 0.06)" } : undefined}>
                    <span className="w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: "hsl(var(--primary) / 0.08)" }}>{s.icone || "📋"}</span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{s.nome}</span>
                        {coord
                          ? <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 gap-1"><Crown className="w-3 h-3" /> Coordenação</Badge>
                          : <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Membro</Badge>}
                      </div>
                      {s.funcoes && <div className="text-xs text-muted-foreground">Função: {s.funcoes}</div>}
                      {!coord && s.coordenadores && <div className="text-xs text-muted-foreground">Coordenação: {s.coordenadores}</div>}
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3 pt-0.5">
                        <span>{s.membros} pessoa{s.membros !== 1 ? "s" : ""}</span>
                        {s.minhas_abertas > 0 && <span className="inline-flex items-center gap-1 text-primary font-medium"><ListChecks className="w-3.5 h-3.5" /> {s.minhas_abertas} tarefa{s.minhas_abertas > 1 ? "s" : ""} minha{s.minhas_abertas > 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><HeartHandshake className="w-3.5 h-3.5" /> Projetos sociais</div>
          {projetos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não está em nenhum projeto social. <Link to="/#acoes" className="text-primary hover:underline">Conheça as ações</Link>.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projetos.map((p) => {
                const destino = p.coordena || operaAcoes ? `/app/acoes/${p.id}` : p.slug ? `/projetos/${p.slug}` : "/#acoes";
                return (
                  <div key={p.id} className={`rounded-xl border p-4 flex items-start gap-3 ${p.coordena ? "border-2" : ""}`}
                    style={p.coordena ? { borderColor: "hsl(var(--accent))", background: "hsl(var(--accent) / 0.06)" } : undefined}>
                    {p.capa ? <img src={p.capa} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : (
                      <span className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}><HeartHandshake className="w-5 h-5" /></span>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={destino} className="font-semibold hover:underline">{p.nome}</Link>
                        {p.coordena
                          ? <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 gap-1"><Crown className="w-3 h-3" /> Coordenação</Badge>
                          : <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">{p.funcoes ? "Equipe" : "Voluntário"}</Badge>}
                      </div>
                      {p.funcoes && <div className="text-xs text-muted-foreground">Função: {p.funcoes}</div>}
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3 pt-0.5">
                        {p.proxima && <span className="inline-flex items-center gap-1 text-primary font-medium"><CalendarDays className="w-3.5 h-3.5" /> Próxima escala {dataCurta(p.proxima)}</span>}
                        {p.escalas > 0 && <span>{p.escalas} escala{p.escalas > 1 ? "s" : ""}</span>}
                        {p.grupo && <a href={p.grupo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><MessageCircle className="w-3.5 h-3.5" /> Grupo</a>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
