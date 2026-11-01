import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Resetar senha a partir de Pessoas, com a mesma regra da Equipe do Atendimento:
// gera uma senha provisória, mostra para quem pediu e obriga a pessoa a criar outra no próximo acesso.
export default function ResetarSenhaPessoa({ pessoa, className }: {
  pessoa: { id: string; full_name: string; email: string | null; user_id: string | null };
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<{ email: string; senha: string } | null>(null);

  if (!pessoa.user_id) return null;

  const resetar = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("pessoas-resetar-senha", { body: { person_id: pessoa.id } });
      if (error) throw new Error(error.message);
      const r = data as { ok?: boolean; error?: string; email: string; senha: string };
      if (r?.error) throw new Error(r.error);
      setResultado({ email: r.email, senha: r.senha });
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao resetar senha");
    } finally {
      setBusy(false);
    }
  };

  const copiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.senha);
      toast.success("Senha copiada");
    } catch { toast.error("Não foi possível copiar. Anote a senha."); }
  };

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={busy} className={className ?? "text-amber-800 border-amber-300 hover:bg-amber-50 hover:text-amber-900"}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
            Resetar senha
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar senha?</AlertDialogTitle>
            <AlertDialogDescription>
              A senha de <b>{pessoa.full_name || pessoa.email}</b> será trocada por uma senha provisória nova, gerada agora e mostrada a você.
              No próximo acesso, a pessoa terá que criar uma senha própria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetar}>Resetar senha</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resultado} onOpenChange={(o) => { if (!o) setResultado(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Senha redefinida</AlertDialogTitle>
            <AlertDialogDescription>
              Entregue esta senha provisória para <b>{resultado?.email}</b>. Ela não será mostrada de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-3">
            <code className="flex-1 text-base font-semibold tracking-wide select-all">{resultado?.senha}</code>
            <Button variant="ghost" size="icon" onClick={copiar} aria-label="Copiar senha"><Copy className="w-4 h-4" /></Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setResultado(null)}>Pronto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
