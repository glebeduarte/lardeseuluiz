// Plataforma unificada: o Atendimento roda só no navegador. As operações que antes eram "server functions"
// do TanStack Start chamam a função "atendimento-equipe" do Supabase, com a sessão de quem está logado.
// Mantém a mesma forma de uso das telas originais: useServerFn(fn) e fn({ data }).
import { supabase } from "@/integrations/supabase/client";

export function chamarEquipe<T>(acao: string) {
  return async ({ data }: { data?: unknown } = {}): Promise<T> => {
    const { data: res, error } = await supabase.functions.invoke("atendimento-equipe", { body: { acao, data } });
    if (error) {
      let mensagem = error.message;
      try {
        const corpo = await (error as { context?: Response }).context?.json();
        if (corpo?.error) mensagem = corpo.error;
      } catch { /* mantém a mensagem padrão */ }
      throw new Error(mensagem);
    }
    if (res?.error) throw new Error(res.error);
    return res as T;
  };
}

export function useServerFn<F>(fn: F): F {
  return fn;
}
