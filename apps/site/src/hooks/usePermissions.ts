import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ModulePermission =
  | "modulo_macas" | "modulo_passes" | "modulo_dialogo" | "modulo_recepcao"
  | "modulo_formacao" | "modulo_secretaria" | "modulo_projetos" | "modulo_saude"
  | "modulo_gestao" | "modulo_financeiro" | "modulo_admin";

interface PermissionsState {
  isAdmin: boolean;
  isGestor: boolean;
  permissions: Set<ModulePermission>;
  has: (p: ModulePermission) => boolean;
  /** Admin sees everything; gestor sees gestao/financeiro/secretaria/projetos by default */
  canAccess: (p: ModulePermission) => boolean;
  isLoading: boolean;
}

const GESTOR_DEFAULTS: ModulePermission[] = [
  "modulo_gestao", "modulo_financeiro", "modulo_secretaria",
  "modulo_projetos", "modulo_macas", "modulo_passes", "modulo_dialogo", "modulo_recepcao",
];

export function usePermissions(): PermissionsState {
  const { user, simulacao } = useAuth();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["user-permissions", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Roles
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles").select("role").eq("user_id", userId!);
      if (rolesErr) throw rolesErr;
      const roleSet = new Set((roles || []).map(r => r.role as string));
      const isAdmin = roleSet.has("admin");
      const isGestor = roleSet.has("gestor");

      // Person id
      const { data: people } = await supabase
        .from("people").select("id").eq("user_id", userId!).limit(1);
      const personId = people?.[0]?.id;

      let perms: ModulePermission[] = [];
      if (personId) {
        const { data: rows, error } = await supabase.rpc("get_person_permissions", { _person_id: personId });
        if (error) throw error;
        perms = (rows as any[]).map(r => (typeof r === "string" ? r : r.get_person_permissions)) as ModulePermission[];
      }
      return { isAdmin, isGestor, perms };
    },
  });

  // Durante o "Visualizar como", vale o papel e as permissões simulados
  const isAdmin = simulacao ? simulacao.roles.includes("admin") : !!data?.isAdmin;
  const isGestor = simulacao ? simulacao.roles.includes("gestor") : !!data?.isGestor;
  const permissions = new Set<ModulePermission>((simulacao ? simulacao.permissions : data?.perms || []) as ModulePermission[]);

  const has = (p: ModulePermission) => permissions.has(p);
  const canAccess = (p: ModulePermission) => {
    if (isAdmin) return true;
    if (isGestor && GESTOR_DEFAULTS.includes(p)) return true;
    return permissions.has(p);
  };

  return { isAdmin, isGestor, permissions, has, canAccess, isLoading: simulacao ? false : isLoading };
}
