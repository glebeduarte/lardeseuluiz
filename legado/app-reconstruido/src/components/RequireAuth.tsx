import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function Carregando() {
  return (
    <div className="min-h-[50vh] grid place-items-center text-muted-foreground" role="status">
      Carregando…
    </div>
  );
}

/** Exige login. Com `permissao`, exige também essa permissão. */
export function RequireAuth({ children, permissao }: { children: ReactNode; permissao?: string }) {
  const { session, carregando, pode } = useAuth();
  const local = useLocation();

  if (carregando) return <Carregando />;
  if (!session) return <Navigate to={`/entrar?voltar=${encodeURIComponent(local.pathname)}`} replace />;
  if (permissao && !pode(permissao)) {
    return (
      <div className="container max-w-xl py-16 flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Área restrita</h1>
        <p className="text-muted-foreground">
          Sua conta não tem acesso a esta área. Se você atua nela, peça à coordenação para atribuir a função correspondente.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
