import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Trash2, Loader2, MessageSquareText, CheckCircle2 } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Obs = {
  id: string;
  conteudo: string;
  created_at: string;
  autor_id: string | null;
  autor_nome: string | null;
};

export function ConsulenteObservacoes({ consulenteId }: { consulenteId: string }) {
  const { user, isAdmin } = useAuth();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  const queryKey = ["consulente-observacoes", consulenteId];

  const { data: observacoes, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulente_observacoes")
        .select("id, conteudo, created_at, autor_id")
        .eq("consulente_id", consulenteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(
        new Set((data ?? []).map((o) => o.autor_id).filter((x): x is string => !!x))
      );
      const nomeMap = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", ids);
        (profs ?? []).forEach((p) => nomeMap.set(p.id, p.nome));
      }
      return (data ?? []).map((o) => ({
        ...o,
        autor_nome: o.autor_id ? nomeMap.get(o.autor_id) ?? null : null,
      })) as Obs[];
    },
  });

  const adicionar = async () => {
    const conteudo = novo.trim();
    if (!conteudo) return;
    if (!user?.id) return toast.error("Usuário não autenticado.");
    setSalvando(true);
    const { error } = await supabase.from("consulente_observacoes").insert({
      consulente_id: consulenteId,
      autor_id: user.id,
      conteudo,
    });
    setSalvando(false);
    if (error) return toast.error(error.message);
    setNovo("");
    setSalvoComSucesso(true);
    setTimeout(() => setSalvoComSucesso(false), 2000);
    toast.success("Observação adicionada");
    qc.invalidateQueries({ queryKey });
  };

  const remover = async (id: string) => {
    if (!(await confirm({
      title: "Remover observação?",
      description: "Esta observação será excluída do histórico do consulente.",
      tone: "danger",
      confirmLabel: "Remover",
    }))) return;
    const { error } = await supabase.from("consulente_observacoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Observação removida");
    qc.invalidateQueries({ queryKey });
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-['Playfair_Display'] text-lg">Observações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              placeholder="Adicionar uma observação compartilhada (visível ao diálogo e aos médiuns)..."
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              rows={3}
              className={salvoComSucesso ? "border-emerald-500 ring-1 ring-emerald-500/30 transition-all" : ""}
            />
            {salvoComSucesso && (
              <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-600 animate-in fade-in zoom-in duration-300" />
            )}
          </div>
          <div className="flex justify-end items-center gap-2">
            {salvoComSucesso && (
              <span className="text-xs text-emerald-800 animate-in fade-in slide-in-from-right-2 duration-300">
                Observação salva
              </span>
            )}
            <Button size="sm" onClick={adicionar} disabled={salvando || !novo.trim()}>
              {salvando ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Adicionar observação"
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {isLoading && (
            <div className="space-y-3 py-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!isLoading && (!observacoes || observacoes.length === 0) && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <MessageSquareText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma observação registrada</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                As observações adicionadas aqui serão visíveis ao diálogo e aos médiuns durante o atendimento.
              </p>
            </div>
          )}

          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Atualizando...
            </div>
          )}

          {observacoes?.map((o) => {
            const podeRemover = isAdmin || o.autor_id === user?.id;
            return (
              <div
                key={o.id}
                className="border-l-2 border-primary/30 pl-3 py-2 bg-muted/30 rounded-r"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {o.autor_nome ?? "Usuário"}
                    </span>{" "}
                    · {fmt(o.created_at)}
                  </div>
                  {podeRemover && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remover(o.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap mt-1">{o.conteudo}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
