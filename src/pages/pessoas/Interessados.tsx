import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SITUACOES: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  entrevista_marcada: "Entrevista marcada",
  encaminhado: "Encaminhado ao curso",
  encerrado: "Encerrado",
};

export default function Interessados() {
  const qc = useQueryClient();
  const lista = useQuery({
    queryKey: ["interessados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("interesses_voluntariado").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const mudar = useMutation({
    mutationFn: async ({ id, situacao }: { id: string; situacao: string }) => {
      const { error } = await supabase.from("interesses_voluntariado").update({ situacao }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interessados"] }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Interessados no voluntariado</h1>
        <p className="text-muted-foreground">Pessoas que se apresentaram pelo site. O Acolhimento faz o primeiro contato e marca a entrevista.</p>
      </div>
      {lista.data?.length === 0 && <p className="text-muted-foreground">Ninguém se apresentou ainda.</p>}
      <ul className="flex flex-col gap-3">
        {lista.data?.map((i) => (
          <li key={i.id} className="rounded-lg border bg-card p-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{i.nome}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{new Date(i.criado_em).toLocaleDateString("pt-BR")}</span>
            </div>
            <span className="text-sm text-muted-foreground select-all">{[i.email, i.telefone].filter(Boolean).join(" · ")}</span>
            {i.areas_interesse?.length > 0 && <span className="text-sm">Áreas: {i.areas_interesse.join(", ")}</span>}
            {i.disponibilidade && <span className="text-sm">Disponibilidade: {i.disponibilidade}</span>}
            {i.mensagem && <p className="text-sm text-muted-foreground whitespace-pre-line">{i.mensagem}</p>}
            <label className="flex items-center gap-2 text-sm" htmlFor={`sit-${i.id}`}>
              Situação
              <select id={`sit-${i.id}`} className="rounded-md border border-input bg-card px-2 py-1 text-sm" value={i.situacao}
                onChange={(e) => mudar.mutate({ id: i.id, situacao: e.target.value })}>
                {Object.entries(SITUACOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
