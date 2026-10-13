import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Páginas administrativas do site (ex.: Cadastro de Palestras): só para a gestão (admin ou gestor).
// No original o Cadastro de Palestras ficava aberto a qualquer visitante.
const RequireGestao = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const papeis = useQuery({
    queryKey: ["papeis-gestao", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return (data ?? []).map((r) => r.role as string);
    },
  });
  if (loading || (user && papeis.isLoading)) return null;
  if (!user) return <Navigate to={`/login?voltar=${encodeURIComponent(location.pathname)}`} replace />;
  if (!papeis.data?.some((r) => r === "admin" || r === "gestor")) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

export default RequireGestao;
