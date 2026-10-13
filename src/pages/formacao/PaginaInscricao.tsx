import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ContaLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useMinhasMatriculas, type Curso } from "@/lib/formacao";

type Pagina = {
  slug: string; titulo: string; subtitulo: string | null; info_dia: string | null; info_horario: string | null; info_formato: string | null;
  info_extra: string | null; texto_livre: string | null; curso_ids: string[]; mostrar_capas: boolean; capa_url: string | null;
  grupo_whatsapp: string | null; texto_agradecimento: string | null;
};

export default function PaginaInscricao() {
  const { slug } = useParams<{ slug: string }>();
  const { session, pessoa } = useAuth();
  const qc = useQueryClient();
  const [feito, setFeito] = useState(false);
  const minhas = useMinhasMatriculas(pessoa?.id);

  const pagina = useQuery({
    queryKey: ["pagina-inscricao", slug],
    queryFn: async () => {
      const { data: p } = await supabase.from("paginas_inscricao").select("*").eq("slug", slug!).maybeSingle();
      if (!p) return null;
      const { data: cursos } = await supabase.from("cursos").select("*").in("id", p.curso_ids);
      return { ...(p as Pagina), cursos: (cursos ?? []) as Curso[] };
    },
  });

  const inscrever = useMutation({
    mutationFn: async () => {
      for (const c of pagina.data!.cursos) {
        if (minhas.data?.some((m) => m.curso_id === c.id && m.situacao !== "cancelada")) continue;
        const { error } = await supabase.rpc("inscrever_em_curso", { p_curso: c.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { setFeito(true); qc.invalidateQueries({ queryKey: ["minhas-matriculas"] }); },
  });

  if (pagina.isLoading) return <SiteLayout><p className="container py-16 text-muted-foreground">Carregando…</p></SiteLayout>;
  const p = pagina.data;
  if (!p) return <SiteLayout><p className="container py-16">Página de inscrição não encontrada.</p></SiteLayout>;
  const jaInscrito = p.cursos.length > 0 && p.cursos.every((c) => minhas.data?.some((m) => m.curso_id === c.id && ["aprovada", "pendente", "concluida"].includes(m.situacao)));

  return (
    <SiteLayout>
      <Secao eyebrow="Inscrição" titulo={p.titulo} intro={p.subtitulo ?? undefined}>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4 min-w-0">
            {p.capa_url && <img src={p.capa_url} alt="" className="w-full rounded-lg border object-cover max-h-80" />}
            {p.texto_livre && <div className="whitespace-pre-line text-muted-foreground">{p.texto_livre}</div>}
            {p.mostrar_capas && p.cursos.map((c) => (
              <Link key={c.id} to={`/cursos/${c.id}`} className="rounded-lg border bg-card p-4 hover:border-primary">
                <span className="font-medium">{c.titulo}</span>
                {c.descricao && <p className="text-sm text-muted-foreground">{c.descricao}</p>}
              </Link>
            ))}
          </div>
          <aside className="rounded-lg border bg-card p-5 flex flex-col gap-4 h-fit">
            <dl className="grid gap-3 text-sm">
              {p.info_dia && <div><dt className="text-muted-foreground">Dia</dt><dd className="font-medium">{p.info_dia}</dd></div>}
              {p.info_horario && <div><dt className="text-muted-foreground">Horário</dt><dd className="font-medium">{p.info_horario}</dd></div>}
              {p.info_formato && <div><dt className="text-muted-foreground">Formato</dt><dd className="font-medium">{p.info_formato}</dd></div>}
              {p.info_extra && <div><dt className="text-muted-foreground">Informações</dt><dd className="font-medium">{p.info_extra}</dd></div>}
            </dl>
            {!session ? (
              <div className="flex flex-col gap-2">
                <Button asChild><Link to={`/cadastro`}>Criar conta para se inscrever</Link></Button>
                <Button asChild variant="outline"><Link to={`/entrar?voltar=/inscricao/${p.slug}`}>Já tenho conta</Link></Button>
              </div>
            ) : feito || jaInscrito ? (
              <>
                <Aviso tipo="ok">{p.texto_agradecimento || "Inscrição realizada. Os cursos aparecem na sua Minha área."}</Aviso>
                {p.grupo_whatsapp && <Button asChild variant="secondary"><a href={p.grupo_whatsapp} target="_blank" rel="noreferrer">Entrar no grupo do WhatsApp</a></Button>}
              </>
            ) : (
              <Button onClick={() => inscrever.mutate()} disabled={inscrever.isPending}>{inscrever.isPending ? "Inscrevendo…" : "Confirmar inscrição"}</Button>
            )}
            {inscrever.isError && <Aviso tipo="erro">{(inscrever.error as Error).message || "Não foi possível concluir a inscrição."}</Aviso>}
          </aside>
        </div>
      </Secao>
    </SiteLayout>
  );
}
