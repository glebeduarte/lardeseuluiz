import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/**
 * "Visualizar como": o administrador vê a interface como outro papel ou como uma pessoa específica,
 * para conferir o que cada um enxerga (menu, perfil, painéis). Só muda a interface: o banco continua
 * aplicando as permissões reais de quem está logado, e as alterações ficam bloqueadas durante a simulação.
 */
export interface Simulacao {
  rotulo: string;
  roles: string[];
  permissions: string[];
  /** Quando simula uma pessoa específica: a conta dela, usada nas páginas pessoais (perfil, meu painel). */
  userId?: string | null;
  personId?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Papéis efetivos (os simulados, durante a simulação). */
  roles: string[];
  /** Papéis reais de quem está logado. */
  realRoles: string[];
  isRealAdmin: boolean;
  simulacao: Simulacao | null;
  setSimulacao: (s: Simulacao | null) => void;
  /** Conta cujos dados pessoais as páginas mostram (a simulada, se houver). */
  effectiveUserId: string | null;
  signOut: () => Promise<void>;
}

const CHAVE = "lsl:visualizar-como";

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, roles: [], realRoles: [], isRealAdmin: false,
  simulacao: null, setSimulacao: () => {}, effectiveUserId: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function lerSimulacao(): Simulacao | null {
  try {
    const v = sessionStorage.getItem(CHAVE);
    return v ? (JSON.parse(v) as Simulacao) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [realRoles, setRealRoles] = useState<string[]>([]);
  const [simulacao, setSimulacaoState] = useState<Simulacao | null>(lerSimulacao);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setRealRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id)
      .then(({ data }) => setRealRoles(data?.map(r => r.role) || []));
  }, [user]);

  const isRealAdmin = realRoles.includes("admin");
  const ativa = isRealAdmin ? simulacao : null;

  const setSimulacao = (s: Simulacao | null) => {
    try {
      if (s) sessionStorage.setItem(CHAVE, JSON.stringify(s));
      else sessionStorage.removeItem(CHAVE);
    } catch { /* sem armazenamento: vale só nesta tela */ }
    setSimulacaoState(s);
  };

  const signOut = async () => { setSimulacao(null); await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      roles: ativa ? ativa.roles : realRoles,
      realRoles, isRealAdmin,
      simulacao: ativa, setSimulacao,
      effectiveUserId: ativa?.userId ?? user?.id ?? null,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
