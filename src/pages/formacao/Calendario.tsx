import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { hojeISO } from "@/lib/site";
import { cn } from "@/lib/utils";

type Entrada = { id: string; codigo_curso: string; data: string | null; rotulo_data: string; ordem: number; roteiro: string; tema: string; modulo: string; facilitador: string; tipo: string };

export default function Calendario() {
  const { codigo } = useParams<{ codigo?: string }>();
  const lista = useQuery({
    queryKey: ["calendario", codigo],
    queryFn: async () => {
      let q = supabase.from("calendario_estudos").select("*").order("data", { nullsFirst: false }).order("ordem");
      if (codigo && codigo !== "esde") q = q.eq("codigo_curso", codigo);
      const { data, error } = await q;
      if (error) throw error;
      return data as Entrada[];
    },
  });
  const hoje = hojeISO();
  const codigos = [...new Set(lista.data?.map((e) => e.codigo_curso))];

  return (
    <SiteLayout>
      <Secao eyebrow="Formação" titulo="Calendário de estudos" intro="Datas, roteiros e facilitadores dos encontros do ESDE. Quintas-feiras, das 19h30 às 21h, pelo Google Meet.">
        {lista.isLoading && <p className="text-muted-foreground">Carregando calendário…</p>}
        {codigos.map((c) => (
          <div key={c} className="flex flex-col gap-3">
            {codigos.length > 1 && <h2 className="text-2xl font-semibold">{c}</h2>}
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Módulo e roteiro</th><th className="px-4 py-3 font-medium">Tema</th><th className="px-4 py-3 font-medium">Facilitação</th></tr>
                </thead>
                <tbody className="divide-y">
                  {lista.data?.filter((e) => e.codigo_curso === c).map((e) => (
                    <tr key={e.id} className={cn(e.data && e.data < hoje && "text-muted-foreground", e.tipo !== "aula" && "bg-accent/40")}>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">{e.rotulo_data}</td>
                      <td className="px-4 py-3">{[e.modulo, e.roteiro].filter(Boolean).join(" · ")}</td>
                      <td className="px-4 py-3">{e.tema}</td>
                      <td className="px-4 py-3">{e.facilitador}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Secao>
    </SiteLayout>
  );
}
