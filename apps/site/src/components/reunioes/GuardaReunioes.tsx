import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAreasLsl } from "@/compartilhado";

/** Reuniões: admin, gestão e direção (a mesma regra vale no banco, em governanca.pode_ver_reunioes). */
export function usePodeReunioes() {
  const { user, loading } = useAuth();
  const areas = useAreasLsl(supabase, user?.id) as { admin?: boolean; gestao?: boolean; direcao?: boolean } | null;
  return {
    carregando: loading || (!!user && !areas),
    logado: !!user,
    pode: !!(areas?.admin || areas?.gestao || areas?.direcao),
  };
}

export default function GuardaReunioes({ children }: { children: ReactNode }) {
  const d = usePodeReunioes();
  const local = useLocation();
  if (d.carregando) {
    return <AppLayout><div className="flex items-center justify-center py-32 text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div></AppLayout>;
  }
  if (!d.logado) return <Navigate to={`/login?voltar=${encodeURIComponent(local.pathname)}`} replace />;
  if (d.pode) return <>{children}</>;
  return (
    <AppLayout>
      <div className="max-w-xl mx-auto text-center py-20 space-y-4 px-4">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
        <h1 className="font-['Playfair_Display'] text-2xl font-bold">Área da gestão e da direção</h1>
        <p className="text-muted-foreground">As pautas e os registros das reuniões ficam disponíveis para a gestão e a direção da casa.</p>
      </div>
    </AppLayout>
  );
}
