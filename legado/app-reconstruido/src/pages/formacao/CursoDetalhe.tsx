import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ContaLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { CapaCurso } from "@/components/formacao/FormacaoUi";
import { SITUACAO_MATRICULA, duracao, useCurso, useMinhasMatriculas } from "@/lib/formacao";

export default function CursoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { session, pessoa } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useCurso(id);
  const minhas = useMinhasMatriculas(pessoa?.id);
  const minha = minhas.data?.find((m) => m.curso_id === id);

  const inscrever = useMutation({
    mutationFn: async () => {
      const { data: situacao, error } = await supabase.rpc("inscrever_em_curso", { p_curso: id });
      if (error) throw error;
      return situacao as string;
    },
    onSuccess: (situacao) => {
      qc.invalidateQueries({ queryKey: ["minhas-matriculas"] });
      if (situacao === "aprovada") navigate(`/formacao/curso/${id}`);
    },
  });

  if (isLoading) return <SiteLayout><p className="container py-16 text-muted-foreground">Carregando…</p></SiteLayout>;
  if (!data?.curso) return <SiteLayout><p className="container py-16">Curso não encontrado.</p></SiteLayout>;
  const { curso, modulos } = data;

  const acao = () => {
    if (!session) return <Button asChild><Link to={`/entrar?voltar=/cursos/${curso.id}`}>Entrar para se inscrever</Link></Button>;
    if (minha && ["aprovada", "concluida"].includes(minha.situacao)) return <Button asChild><Link to={`/formacao/curso/${curso.id}`}>Ir para o curso</Link></Button>;
    if (minha && minha.situacao === "pendente") return <Aviso tipo="ok">{SITUACAO_MATRICULA.pendente}. A coordenação vai analisar sua inscrição.</Aviso>;
    if (!curso.inscricoes_abertas) return <p className="text-muted-foreground">As inscrições deste curso estão encerradas.</p>;
    return (
      <Button onClick={() => inscrever.mutate()} disabled={inscrever.isPending}>
        {inscrever.isPending ? "Inscrevendo…" : "Quero me inscrever"}
      </Button>
    );
  };

  return (
    <SiteLayout>
      <Secao eyebrow={curso.publico === "voluntarios" ? "Curso para voluntários" : "Curso aberto"} titulo={curso.titulo} intro={curso.descricao ?? undefined}>
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-6 min-w-0">
            <CapaCurso src={curso.capa_url || curso.miniatura_url} titulo={curso.titulo} className="rounded-lg border max-h-80 aspect-[21/9]" />
            {curso.descricao_longa && <div className="whitespace-pre-line text-muted-foreground">{curso.descricao_longa}</div>}
            {curso.topicos.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">O que você vai estudar</h2>
                <ul className="list-disc pl-5 text-muted-foreground">{curso.topicos.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            )}
            {modulos.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Módulos</h2>
                <ol className="flex flex-col divide-y rounded-lg border bg-card">
                  {modulos.map((m, i) => (
                    <li key={m.id} className="flex gap-3 px-4 py-3">
                      <span className="font-display text-lg text-primary tabular-nums w-6 shrink-0">{i + 1}</span>
                      <div className="flex flex-col"><span className="font-medium">{m.titulo}</span>{m.descricao && <span className="text-sm text-muted-foreground">{m.descricao}</span>}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          <aside className="rounded-lg border border-t-4 border-t-lsl-dourado bg-card p-5 flex flex-col gap-4 h-fit lg:sticky lg:top-24">
            <dl className="grid gap-3 text-sm">
              {curso.horario && <div><dt className="text-muted-foreground">Quando</dt><dd className="font-medium">{curso.horario}</dd></div>}
              {curso.inicio && <div><dt className="text-muted-foreground">Período</dt><dd className="font-medium">{new Date(curso.inicio + "T12:00").toLocaleDateString("pt-BR")}{curso.fim && ` a ${new Date(curso.fim + "T12:00").toLocaleDateString("pt-BR")}`}</dd></div>}
              {curso.facilitadores && <div><dt className="text-muted-foreground">Facilitação</dt><dd className="font-medium">{curso.facilitadores}</dd></div>}
              {duracao(curso.duracao_minutos) && <div><dt className="text-muted-foreground">Duração estimada</dt><dd className="font-medium">{duracao(curso.duracao_minutos)}</dd></div>}
            </dl>
            {acao()}
            {inscrever.isError && <Aviso tipo="erro">{(inscrever.error as Error).message || "Não foi possível concluir a inscrição."}</Aviso>}
          </aside>
        </div>
      </Secao>
    </SiteLayout>
  );
}
