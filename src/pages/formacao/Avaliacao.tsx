import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ContaLayout";
import { cn } from "@/lib/utils";

type Questao = { id: string; tipo: string; enunciado: string; alternativas: { id: string; text: string }[] | null; ordem: number };
type Resultado = { nota: number; aprovada: boolean; certas: number; total: number; tentativa: number };

export default function Avaliacao() {
  const { id } = useParams<{ id: string }>();
  const { pessoa } = useAuth();
  const qc = useQueryClient();
  const inicio = useRef(Date.now());
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [faltando, setFaltando] = useState(false);

  const aval = useQuery({
    queryKey: ["avaliacao", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("avaliacoes").select("id, titulo, descricao, nota_minima, max_tentativas, curso_id").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
  const questoes = useQuery({
    queryKey: ["questoes", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("questoes_para_responder", { p_avaliacao: id });
      if (error) throw error;
      return data as Questao[];
    },
  });
  const anteriores = useQuery({
    queryKey: ["tentativas", id, pessoa?.id],
    enabled: !!pessoa,
    queryFn: async () => {
      const { data } = await supabase.from("tentativas").select("numero, nota, aprovada, enviada_em").eq("avaliacao_id", id!).eq("pessoa_id", pessoa!.id).order("numero");
      return data ?? [];
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("enviar_avaliacao", {
        p_avaliacao: id, p_respostas: respostas, p_tempo_segundos: Math.round((Date.now() - inicio.current) / 1000),
      });
      if (error) throw error;
      return data as Resultado;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tentativas", id] }),
  });

  if (aval.isLoading || questoes.isLoading) return <p className="text-muted-foreground">Carregando avaliação…</p>;
  if (questoes.isError || !aval.data) return <Aviso tipo="erro">Esta avaliação não está disponível para você.</Aviso>;

  const usadas = anteriores.data?.length ?? 0;
  const esgotou = aval.data.max_tentativas != null && usadas >= aval.data.max_tentativas;
  const r = enviar.data;

  if (r) {
    return (
      <div className="max-w-2xl flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">{aval.data.titulo}</h1>
        <div className={cn("rounded-lg border p-6 flex flex-col gap-2", r.aprovada ? "border-secondary bg-secondary/10" : "bg-card")}>
          <span className="font-display text-5xl tabular-nums">{r.nota}%</span>
          <span>{r.certas} de {r.total} questões certas · tentativa {r.tentativa}</span>
          <span className="font-medium">{r.aprovada ? "Aprovado nesta avaliação." : `Para aprovação são necessários ${aval.data.nota_minima}%. Revise as aulas e tente de novo quando quiser.`}</span>
        </div>
        <Link to={`/formacao/curso/${aval.data.curso_id}`} className="text-primary hover:underline">Voltar ao curso</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link to={`/formacao/curso/${aval.data.curso_id}`} className="text-sm text-primary hover:underline w-fit">Voltar ao curso</Link>
        <h1 className="text-3xl font-semibold">{aval.data.titulo}</h1>
        {aval.data.descricao && <p className="text-muted-foreground">{aval.data.descricao}</p>}
        <p className="text-sm text-muted-foreground">
          Nota mínima {aval.data.nota_minima}%.{aval.data.max_tentativas ? ` Tentativas usadas: ${usadas} de ${aval.data.max_tentativas}.` : ""}
          {anteriores.data?.some((t) => t.aprovada) && " Você já foi aprovado nesta avaliação."}
        </p>
      </div>
      {esgotou ? (
        <Aviso tipo="erro">Você já usou todas as tentativas desta avaliação.</Aviso>
      ) : (
        <form className="flex flex-col gap-6" onSubmit={(e) => {
          e.preventDefault();
          const pend = (questoes.data ?? []).some((q) => q.tipo !== "dissertativa" && !respostas[q.id]);
          setFaltando(pend);
          if (!pend) enviar.mutate();
        }}>
          {questoes.data?.map((q, i) => (
            <fieldset key={q.id} className="rounded-lg border bg-card p-5 flex flex-col gap-3">
              <legend className="sr-only">Questão {i + 1}</legend>
              <p className="font-medium"><span className="text-primary tabular-nums mr-2">{i + 1}.</span>{q.enunciado}</p>
              <div className="flex flex-col gap-2">
                {(q.alternativas ?? []).map((a) => (
                  <label key={a.id} className={cn("flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer", respostas[q.id] === a.id ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                    <input type="radio" name={q.id} value={a.id} className="mt-1" checked={respostas[q.id] === a.id} onChange={() => setRespostas({ ...respostas, [q.id]: a.id })} />
                    <span>{a.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {faltando && <Aviso tipo="erro">Responda todas as questões antes de enviar.</Aviso>}
          {enviar.isError && <Aviso tipo="erro">{(enviar.error as Error).message || "Não foi possível enviar."}</Aviso>}
          <div><Button type="submit" disabled={enviar.isPending}>{enviar.isPending ? "Corrigindo…" : "Enviar respostas"}</Button></div>
        </form>
      )}
    </div>
  );
}
