import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ClipboardCheck, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { urlIncorporavel, useAulasDoCurso, useCurso } from "@/lib/formacao";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SalaDeAula() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const { pessoa } = useAuth();
  const qc = useQueryClient();
  const curso = useCurso(id);
  const aulas = useAulasDoCurso(id, curso.data?.modulos);

  const feitas = useQuery({
    queryKey: ["progresso", id, pessoa?.id],
    enabled: !!pessoa && !!aulas.data,
    queryFn: async () => {
      const { data } = await supabase.from("progresso_aulas").select("aula_id").eq("pessoa_id", pessoa!.id).in("aula_id", aulas.data!.map((a) => a.id));
      return new Set((data ?? []).map((r) => r.aula_id));
    },
  });
  const avaliacoes = useQuery({
    queryKey: ["avaliacoes-curso", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("avaliacoes").select("id, titulo, nota_minima").eq("curso_id", id!).eq("situacao", "publicada");
      return data ?? [];
    },
  });

  const ordenadas = useMemo(() => {
    const ordemModulo = new Map(curso.data?.modulos.map((m, i) => [m.id, i]) ?? []);
    return [...(aulas.data ?? [])].sort((a, b) => (ordemModulo.get(a.modulo_id)! - ordemModulo.get(b.modulo_id)!) || a.ordem - b.ordem);
  }, [aulas.data, curso.data]);
  const atualId = params.get("aula") ?? ordenadas[0]?.id;
  const indice = ordenadas.findIndex((a) => a.id === atualId);
  const atual = ordenadas[indice];

  const anexos = useQuery({
    queryKey: ["anexos", atual?.id],
    enabled: !!atual,
    queryFn: async () => {
      const { data } = await supabase.from("anexos").select("*").eq("aula_id", atual!.id);
      return data ?? [];
    },
  });

  const marcar = useMutation({
    mutationFn: async (feita: boolean) => {
      if (feita) {
        const { error } = await supabase.from("progresso_aulas").delete().eq("pessoa_id", pessoa!.id).eq("aula_id", atual!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("progresso_aulas").insert({ pessoa_id: pessoa!.id, aula_id: atual!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progresso", id] }),
  });

  const [abrindo, setAbrindo] = useState<string | null>(null);
  async function baixar(caminho: string, nome: string) {
    setAbrindo(nome);
    if (caminho.startsWith("http")) window.open(caminho, "_blank", "noopener");
    else {
      const { data } = await supabase.storage.from("formacao-anexos").createSignedUrl(caminho, 300);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    }
    setAbrindo(null);
  }

  useEffect(() => window.scrollTo(0, 0), [atualId]);

  if (curso.isLoading || aulas.isLoading) return <p className="text-muted-foreground">Carregando curso…</p>;
  if (!curso.data?.curso) return <p>Curso não encontrado.</p>;
  if (!ordenadas.length) {
    return (
      <div className="flex flex-col gap-3 max-w-xl">
        <h1 className="text-2xl font-semibold">{curso.data.curso.titulo}</h1>
        <p className="text-muted-foreground">Você ainda não tem acesso às aulas deste curso, ou elas ainda não foram publicadas.</p>
        <Link to={`/cursos/${id}`} className="text-primary hover:underline">Ver página do curso</Link>
      </div>
    );
  }

  const total = ordenadas.length;
  const concluidas = ordenadas.filter((a) => feitas.data?.has(a.id)).length;
  const video = urlIncorporavel(atual?.embed_url || atual?.video_url || null);
  const feita = !!atual && !!feitas.data?.has(atual.id);
  const ir = (aulaId: string) => setParams({ aula: aulaId });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5 min-w-0">
        <div className="flex flex-col gap-1">
          <Link to="/minha-area" className="text-sm text-primary hover:underline w-fit">{curso.data.curso.titulo}</Link>
          <h1 className="text-2xl md:text-3xl font-semibold">{atual?.titulo}</h1>
        </div>
        {video && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
            <iframe src={video} title={atual?.embed_titulo || atual?.titulo} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          </div>
        )}
        {atual?.descricao && <div className="whitespace-pre-line text-muted-foreground">{atual.descricao}</div>}
        {anexos.data && anexos.data.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold">Materiais</h2>
            <ul className="flex flex-wrap gap-2">
              {anexos.data.map((a) => (
                <li key={a.id}>
                  <Button variant="outline" size="sm" onClick={() => baixar(a.url, a.nome)} disabled={abrindo === a.nome}>
                    <FileDown className="h-4 w-4" aria-hidden /> {a.nome}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button variant={feita ? "outline" : "secondary"} onClick={() => marcar.mutate(feita)} disabled={marcar.isPending}>
            {feita ? <><CheckCircle2 className="h-4 w-4" aria-hidden /> Aula concluída</> : "Marcar como concluída"}
          </Button>
          <div className="flex gap-2">
            {indice > 0 && <Button variant="ghost" onClick={() => ir(ordenadas[indice - 1].id)}>Aula anterior</Button>}
            {indice < total - 1 && <Button onClick={() => ir(ordenadas[indice + 1].id)}>Próxima aula</Button>}
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">{concluidas} de {total} aulas concluídas</span>
          <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-secondary" style={{ width: `${(concluidas / total) * 100}%` }} /></div>
        </div>
        <nav className="rounded-lg border bg-card divide-y" aria-label="Aulas do curso">
          {curso.data.modulos.map((m) => (
            <div key={m.id} className="py-2">
              <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.titulo}</p>
              <ul>
                {ordenadas.filter((a) => a.modulo_id === m.id).map((a) => (
                  <li key={a.id}>
                    <button onClick={() => ir(a.id)} className={cn("flex w-full items-start gap-2 px-4 py-1.5 text-left text-sm hover:bg-muted", a.id === atual?.id && "bg-primary/10 text-primary font-medium")}>
                      {feitas.data?.has(a.id) ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-secondary" aria-label="concluída" /> : <Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />}
                      <span>{a.titulo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {avaliacoes.data && avaliacoes.data.length > 0 && (
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
            <span className="font-semibold">Avaliações</span>
            {avaliacoes.data.map((a) => (
              <Link key={a.id} to={`/formacao/avaliacao/${a.id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ClipboardCheck className="h-4 w-4" aria-hidden /> {a.titulo}
              </Link>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
