// Cliente do site e da Governança na plataforma unificada do Lar de Seu Luiz.
// Mesmo projeto Supabase e mesma sessão de login das outras áreas; as tabelas da Governança ficam no schema "governanca".
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'governanca' as 'public' },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// "Visualizar como": enquanto o administrador simula outro papel, gravações ficam bloqueadas,
// para que nada seja alterado em nome de outra pessoa por engano.
const simulando = () => {
  try { return !!sessionStorage.getItem("lsl:visualizar-como"); } catch { return false; }
};
const ERRO_SIMULACAO = { message: "Simulação ativa: saia do \"Visualizar como\" para fazer alterações.", details: "", hint: "", code: "SIMULACAO" };
const bloqueado = (): unknown => {
  const resultado = { data: null, error: ERRO_SIMULACAO, count: null, status: 403, statusText: "Simulação" };
  const proxy: unknown = new Proxy(function () {}, {
    get: (_alvo, prop) => (prop === "then" ? (ok: (v: unknown) => unknown) => Promise.resolve(resultado).then(ok) : () => proxy),
    apply: () => proxy,
  });
  return proxy;
};
const fromOriginal = supabase.from.bind(supabase);
(supabase as unknown as { from: unknown }).from = (tabela: string) => {
  const consulta = fromOriginal(tabela as never) as unknown as Record<string, unknown>;
  if (!simulando()) return consulta;
  for (const m of ["insert", "update", "upsert", "delete"]) consulta[m] = bloqueado;
  return consulta;
};
const storageFromOriginal = supabase.storage.from.bind(supabase.storage);
(supabase.storage as unknown as { from: unknown }).from = (bucket: string) => {
  const b = storageFromOriginal(bucket) as unknown as Record<string, unknown>;
  if (!simulando()) return b;
  for (const m of ["upload", "update", "remove", "move"]) b[m] = async () => ({ data: null, error: ERRO_SIMULACAO });
  return b;
};
