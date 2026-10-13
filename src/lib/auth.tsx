import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Pessoa = {
  id: string;
  nome: string;
  nome_social: string | null;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: Record<string, string> | null;
};

type AuthState = {
  session: Session | null;
  carregando: boolean;
  pessoa: Pessoa | null;
  permissoes: Set<string>;
  eh_admin: boolean;
  pode: (chave: string) => boolean;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [iniciado, setIniciado] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIniciado(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s);
      qc.invalidateQueries({ queryKey: ["eu"] });
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const userId = session?.user.id;

  const eu = useQuery({
    queryKey: ["eu", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [pessoa, perms, admin] = await Promise.all([
        supabase
          .from("pessoas")
          .select("id, nome, nome_social, email, telefone, data_nascimento, endereco")
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase.rpc("minhas_permissoes"),
        supabase.from("admins_plataforma").select("user_id").maybeSingle(),
      ]);
      if (pessoa.error) throw pessoa.error;
      if (perms.error) throw perms.error;
      return {
        pessoa: (pessoa.data as Pessoa | null) ?? null,
        permissoes: new Set<string>((perms.data as string[] | null) ?? []),
        eh_admin: !!admin.data,
      };
    },
  });

  const permissoes = eu.data?.permissoes ?? new Set<string>();
  const valor: AuthState = {
    session,
    carregando: !iniciado || (!!userId && eu.isLoading),
    pessoa: eu.data?.pessoa ?? null,
    permissoes,
    eh_admin: eu.data?.eh_admin ?? false,
    pode: (chave) => permissoes.has(chave),
    sair: async () => {
      await supabase.auth.signOut();
      qc.clear();
    },
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function traduzErroAuth(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered")) return "Já existe uma conta com este e-mail. Use Entrar ou Esqueci minha senha.";
  if (m.includes("password should be")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  return "Não foi possível concluir. Tente de novo em instantes.";
}
