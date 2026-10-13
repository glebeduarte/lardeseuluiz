import { Skeleton } from "@/components/ui/skeleton";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
import { AppLayout } from "./AppLayout";
import { Button } from "@/components/ui/button";
import { LogOut, Clock } from "lucide-react";
import type { ReactNode } from "react";

export function RequireAuth({
  children,
  roles,
  denyRoles,
}: {
  children: ReactNode;
  roles?: AppRole[];
  denyRoles?: AppRole[];
}) {
  const { user, loading, roles: realRoles, effectiveRoles, mustChangePassword, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-4" aria-busy="true" aria-label="Carregando aplicação">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (mustChangePassword && pathname !== "/trocar-senha") return <Navigate to="/trocar-senha" />;

  // Usuário sem nenhum papel: tela de espera, sem menu nem qualquer outra informação
  if (realRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Cadastro recebido</h1>
            <p className="text-muted-foreground">
              Seu cadastro foi registrado com sucesso. Em breve um administrador irá habilitar
              sua função no sistema. Você receberá acesso assim que isso for feito.
            </p>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  const hasAllowedRole = roles ? roles.some((r) => effectiveRoles.includes(r)) : true;
  // denyRoles só bloqueia quando o usuário não possui também algum papel permitido
  // (ex.: alguém que é apenas médium não pode entrar na recepção, mas quem é
  // recepção + médium deve continuar acessando a recepção normalmente).
  const hasDeniedRole =
    denyRoles?.some((r) => effectiveRoles.includes(r)) &&
    !effectiveRoles.includes("admin") &&
    !hasAllowedRole;

  if (hasDeniedRole || (roles && !hasAllowedRole)) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-muted-foreground mt-2">
            Você não possui permissão para acessar esta área.
          </p>
        </div>
      </AppLayout>
    );
  }
  return <AppLayout>{children}</AppLayout>;
}
