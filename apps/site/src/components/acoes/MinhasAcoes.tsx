import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartHandshake, Check } from "lucide-react";
import { toast } from "sonner";
import { db, dataLongaBR, CANDIDATURA_LABEL, CANDIDATURA_COR, type CandidaturaStatus } from "@/lib/acoes";

type Escala = { id: string; task: string | null; shift: string | null; confirmed: boolean; edicao: string; data: string; hora: string | null; local: string | null; projeto: string };
type Pedido = { id: string; status: CandidaturaStatus; edicao: string; data: string; projeto: string };

/** "Minhas ações sociais" no perfil único: escalas para confirmar e pedidos de participação. */
export default function MinhasAcoes({ simulandoOutraPessoa }: { simulandoOutraPessoa?: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["minhas-acoes"],
    enabled: !simulandoOutraPessoa,
    queryFn: async () => {
      const { data, error } = await db.rpc("minhas_acoes");
      if (error) throw error;
      return data as { escalas: Escala[]; candidaturas: Pedido[] };
    },
  });
  const confirmar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("edition_shifts").update({ confirmed: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["minhas-acoes"] }); toast.success("Presença confirmada. Obrigado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const escalas = data?.escalas ?? [];
  const pedidos = (data?.candidaturas ?? []).filter((c) => c.status !== "aprovada");

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="font-['Playfair_Display'] flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-[hsl(var(--primary))]" /> Minhas ações sociais
        </CardTitle>
        <CardDescription>Escalas em que você está e pedidos de participação</CardDescription>
      </CardHeader>
      <CardContent>
        {simulandoOutraPessoa ? (
          <p className="text-sm text-muted-foreground text-center py-6">As escalas de outra pessoa não aparecem na simulação.</p>
        ) : escalas.length === 0 && pedidos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Você ainda não está em nenhuma escala. Veja as <Link to="/#eventos" className="underline">ações sociais da Casa</Link> e peça para participar.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {escalas.map((e) => (
              <li key={e.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-foreground">{e.projeto}</div>
                  <div className="text-xs text-muted-foreground">{dataLongaBR(e.data)}{e.hora ? ` · ${e.hora}` : ""}{e.local ? ` · ${e.local}` : ""}</div>
                  {(e.task || e.shift) && <div className="text-xs mt-1">{[e.task, e.shift].filter(Boolean).join(" · ")}</div>}
                </div>
                {e.confirmed ? (
                  <Badge variant="outline" className="text-xs shrink-0 bg-emerald-100 text-emerald-800 border-emerald-300">Confirmado</Badge>
                ) : (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => confirmar.mutate(e.id)}><Check className="w-4 h-4 mr-1" /> Confirmar</Button>
                )}
              </li>
            ))}
            {pedidos.map((c) => (
              <li key={c.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-foreground">{c.projeto}</div>
                  <div className="text-xs text-muted-foreground">{dataLongaBR(c.data)} · pedido de participação</div>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${CANDIDATURA_COR[c.status]}`}>{CANDIDATURA_LABEL[c.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
