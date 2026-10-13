import { useCallback, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type EscolhaMaca = "adicionar" | "trocar" | null;

type State = { nome: string; atuais: string[]; nova: string; resolve: (v: EscolhaMaca) => void } | null;

/** Pergunta se o consulente deve ser adicionado a mais uma maca ou trocado de maca. */
export function useEscolhaMaca(): [
  (o: { nome: string; atuais: string[]; nova: string }) => Promise<EscolhaMaca>,
  ReactNode,
] {
  const [st, setSt] = useState<State>(null);
  const ask = useCallback(
    (o: { nome: string; atuais: string[]; nova: string }) =>
      new Promise<EscolhaMaca>((resolve) => setSt({ ...o, resolve })),
    [],
  );
  const close = (v: EscolhaMaca) => {
    st?.resolve(v);
    setSt(null);
  };
  const el = (
    <AlertDialog open={!!st} onOpenChange={(o) => { if (!o) close(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Consulente já está em outra maca</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                <strong>{st?.nome}</strong> já está em: <strong>{st?.atuais.join(", ")}</strong>.
              </p>
              <p>O que deseja fazer com a nova maca <strong>{st?.nova}</strong>?</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Trocar de maca:</strong> sai da(s) maca(s) atual(is) e passa somente para {st?.nova}.</li>
                <li><strong>Adicionar maca:</strong> continua na(s) atual(is) e também ficará em {st?.nova}.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => close(null)}>Cancelar</AlertDialogCancel>
          <Button variant="outline" onClick={() => close("adicionar")}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar maca
          </Button>
          <Button onClick={() => close("trocar")}>
            <ArrowRightLeft className="h-4 w-4 mr-1" /> Trocar de maca
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return [ask, el];
}

/** Busca as designações ativas do consulente com o nome da maca. */
export async function buscarMacasAtivas(consulenteId: string) {
  const { data, error } = await supabase
    .from("designacoes")
    .select("id, maca_id, macas(nome)")
    .eq("consulente_id", consulenteId)
    .eq("status", "ativa");
  if (error) throw error;
  return (data ?? []).map((d: any) => ({ id: d.id as string, maca_id: d.maca_id as string, nome: (d.macas?.nome ?? "maca") as string }));
}

/** Encerra as designações anteriores por troca de maca. */
export async function encerrarPorTroca(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("designacoes")
    .update({ status: "cancelada", closed_at: new Date().toISOString(), closure_reason: "troca_maca" })
    .in("id", ids);
  if (error) throw error;
}
