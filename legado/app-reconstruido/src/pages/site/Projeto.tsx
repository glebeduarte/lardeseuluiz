import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { ListaEventos } from "@/components/site/Agenda";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ContaLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { hojeISO, useArea, type Evento } from "@/lib/site";

export default function Projeto() {
  const { slug } = useParams<{ slug: string }>();
  const { data: area, isLoading } = useArea(slug);
  const { session, pessoa } = useAuth();
  const qc = useQueryClient();
  const [mensagem, setMensagem] = useState("");

  const datas = useQuery({
    queryKey: ["eventos-area", area?.id],
    enabled: !!area,
    queryFn: async () => {
      const { data } = await supabase.from("eventos").select("*").eq("area_id", area!.id).eq("publicado", true).gte("data", hojeISO()).order("data");
      return (data ?? []) as Evento[];
    },
  });

  const minha = useQuery({
    queryKey: ["minha-candidatura", area?.id, pessoa?.id],
    enabled: !!area && !!pessoa,
    queryFn: async () => {
      const { data } = await supabase
        .from("candidaturas_acoes")
        .select("id, situacao")
        .eq("area_id", area!.id)
        .eq("pessoa_id", pessoa!.id)
        .in("situacao", ["pendente", "aprovada"])
        .maybeSingle();
      return data;
    },
  });

  const candidatar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("candidaturas_acoes").insert({
        pessoa_id: pessoa!.id,
        area_id: area!.id,
        mensagem: mensagem.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["minha-candidatura"] }),
  });

  if (isLoading) return <SiteLayout><p className="container py-16 text-muted-foreground">Carregando…</p></SiteLayout>;
  if (!area || area.tipo !== "projeto") {
    return (
      <SiteLayout>
        <div className="container py-16 flex flex-col gap-3">
          <h1 className="text-3xl font-semibold">Projeto não encontrado</h1>
          <Link to="/#acoes" className="text-primary hover:underline">Ver todas as ações sociais</Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Secao eyebrow="Ação social" titulo={area.nome} intro={area.resumo ?? undefined}>
        <Link to="/#acoes" className="flex items-center gap-1 text-sm text-primary hover:underline w-fit">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Todas as ações
        </Link>
        {area.conteudo && <div className="max-w-2xl whitespace-pre-line text-muted-foreground">{area.conteudo}</div>}
        {datas.data && datas.data.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold">Próximas datas</h2>
            <ListaEventos eventos={datas.data} />
          </div>
        )}
      </Secao>

      {area.aceita_candidaturas && (
        <Secao eyebrow="Participe" titulo="Quero ajudar nesta ação" tom="card"
          intro="Frequentadores e voluntários podem se candidatar. A coordenação do projeto confirma a participação.">
          {!session ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild><Link to={`/entrar?voltar=/projetos/${area.slug}`}>Entrar para participar</Link></Button>
              <Button asChild variant="outline"><Link to="/cadastro">Criar conta</Link></Button>
            </div>
          ) : minha.data ? (
            <Aviso tipo="ok">
              {minha.data.situacao === "aprovada"
                ? "Sua participação está confirmada. A coordenação vai combinar os detalhes com você."
                : "Recebemos sua candidatura. A coordenação vai entrar em contato."}
            </Aviso>
          ) : (
            <div className="flex flex-col gap-3 max-w-xl">
              <label htmlFor="msg-candidatura" className="text-sm font-medium">Quer contar algo para a coordenação? (opcional)</label>
              <textarea
                id="msg-candidatura"
                rows={3}
                maxLength={1000}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Disponibilidade, experiência, como gostaria de ajudar"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
              {candidatar.isError && <Aviso tipo="erro">Não foi possível registrar. Tente de novo.</Aviso>}
              <div>
                <Button variant="secondary" disabled={candidatar.isPending || !pessoa} onClick={() => candidatar.mutate()}>
                  {candidatar.isPending ? "Enviando…" : "Quero participar"}
                </Button>
              </div>
            </div>
          )}
        </Secao>
      )}
    </SiteLayout>
  );
}
