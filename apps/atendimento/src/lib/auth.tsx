import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "recepcao" | "dialogador" | "admin" | "medium";

const VIEW_AS_KEY = "lsl:viewAsRole";

const ALL_ROLES: AppRole[] = ["recepcao", "dialogador", "admin", "medium"];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  effectiveRoles: AppRole[];
  viewAsRole: AppRole | null;
  setViewAsRole: (role: AppRole | null) => void;
  loading: boolean;
  isRealAdmin: boolean;
  isAdmin: boolean;
  isDialogador: boolean;
  isRecepcao: boolean;
  isMedium: boolean;
  mustChangePassword: boolean;
  comoChamar: string | null;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [comoChamar, setComoChamar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsRole, setViewAsRoleState] = useState<AppRole | null>(() => {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(VIEW_AS_KEY);
    return ALL_ROLES.includes(v as AppRole) ? (v as AppRole) : null;
  });

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data?.map((r) => r.role as AppRole)) ?? []);
  };

  const fetchMustChange = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("must_change_password, ativo, como_chamar").eq("id", userId).maybeSingle();
    setMustChangePassword(!!data?.must_change_password);
    setComoChamar(data?.como_chamar ?? null);
    if (data && data.ativo === false) {
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setTimeout(() => {
          fetchRoles(newSession.user.id);
          fetchMustChange(newSession.user.id);
        }, 0);
      } else {
        setRoles([]);
        setMustChangePassword(false);
        setComoChamar(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        Promise.all([fetchRoles(data.session.user.id), fetchMustChange(data.session.user.id)]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshRoles = async () => {
    if (session?.user) {
      await fetchRoles(session.user.id);
      await fetchMustChange(session.user.id);
    }
  };

  const isRealAdmin = roles.includes("admin");

  const effectiveRoles: AppRole[] =
    isRealAdmin && viewAsRole && viewAsRole !== "admin" ? [viewAsRole] : roles;

  const setViewAsRole = (role: AppRole | null) => {
    setViewAsRoleState(role);
    if (typeof window !== "undefined") {
      if (role && role !== "admin") {
        window.localStorage.setItem(VIEW_AS_KEY, role);
      } else {
        window.localStorage.removeItem(VIEW_AS_KEY);
      }
    }
  };

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    roles,
    effectiveRoles,
    viewAsRole: isRealAdmin ? viewAsRole : null,
    setViewAsRole,
    loading,
    isRealAdmin,
    isAdmin: effectiveRoles.includes("admin"),
    isDialogador: effectiveRoles.includes("dialogador") || effectiveRoles.includes("admin"),
    isRecepcao: effectiveRoles.includes("recepcao") || effectiveRoles.includes("admin"),
    isMedium: effectiveRoles.includes("medium") || effectiveRoles.includes("admin"),
    mustChangePassword,
    comoChamar,
    signOut: async () => {
      if (typeof window !== "undefined") window.localStorage.removeItem(VIEW_AS_KEY);
      setViewAsRoleState(null);
      setComoChamar(null);
      await supabase.auth.signOut();
    },
    refreshRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
