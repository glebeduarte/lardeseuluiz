import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, Lock, Ticket } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAreasLsl } from "@/compartilhado";

/** Direitos da pessoa nas rifas: quem coordena (opera) e quem só vende. */
export function useDireitosRifas() {
  const { user, loading } = useAuth();
  const areas = useAreasLsl(supabase, user?.id) as { rifas?: { opera?: boolean; vende?: boolean } } | null;
  return {
    carregando: loading || (!!user && !areas),
    logado: !!user,
    opera: !!areas?.rifas?.opera,
    vende: !!areas?.rifas?.vende,
  };
}

/**
 * Telas de coordenação das rifas (configurar, confirmar PIX, liberar, remover e sortear).
 * Vendedor que chegar aqui vê um aviso e o caminho para a tela de venda.
 */
export default function GuardaRifas({ children }: { children: ReactNode }) {
  const d = useDireitosRifas();
  if (d.carregando) {
    return <AppLayout><div className="flex items-center justify-center py-32 text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div></AppLayout>;
  }
  if (d.opera) return <>{children}</>;
  return (
    <AppLayout>
      <div className="max-w-xl mx-auto text-center py-20 space-y-4 px-4">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
        <h1 className="font-['Playfair_Display'] text-2xl font-bold">Área da coordenação das rifas</h1>
        <p className="text-muted-foreground">
          {d.vende
            ? "Aqui a coordenação configura a rifa, confirma os pagamentos e faz o sorteio. Para registrar suas vendas, use a tela de venda."
            : "Só a coordenação das rifas acessa esta área. Se você vai vender números, peça para a coordenação te cadastrar como vendedor."}
        </p>
        {d.vende && (
          <Button asChild className="h-11"><Link to="/app/rifas/vender"><Ticket className="w-4 h-4 mr-2" />Vender números</Link></Button>
        )}
      </div>
    </AppLayout>
  );
}
