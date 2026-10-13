import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Ações sociais: projetos (governanca.projects) com edições, escala de voluntários, famílias atendidas,
// entregas e, nos projetos de saúde, atendimentos com consentimento LGPD.
// As tabelas novas ainda não estão nos tipos gerados, por isso o acesso passa por `db`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export type EdicaoStatus = "planejada" | "inscricoes_abertas" | "realizada" | "cancelada";
export type CandidaturaStatus = "pendente" | "aprovada" | "recusada";

export const EDICAO_LABEL: Record<EdicaoStatus, string> = {
  planejada: "Planejada",
  inscricoes_abertas: "Inscrições abertas",
  realizada: "Realizada",
  cancelada: "Cancelada",
};
export const EDICAO_COR: Record<EdicaoStatus, string> = {
  planejada: "bg-amber-100 text-amber-800 border-amber-300",
  inscricoes_abertas: "bg-emerald-100 text-emerald-800 border-emerald-300",
  realizada: "bg-sky-100 text-sky-800 border-sky-300",
  cancelada: "bg-muted text-muted-foreground border-border",
};
export const CANDIDATURA_LABEL: Record<CandidaturaStatus, string> = { pendente: "Pendente", aprovada: "Aprovada", recusada: "Recusada" };
export const CANDIDATURA_COR: Record<CandidaturaStatus, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-300",
  aprovada: "bg-emerald-100 text-emerald-800 border-emerald-300",
  recusada: "bg-muted text-muted-foreground border-border",
};

export interface Edicao {
  id: string; project_id: string; title: string; starts_on: string; ends_on: string | null; start_time: string | null;
  location: string | null; status: EdicaoStatus; volunteers_needed: number | null; goal: string | null; notes: string | null;
}
export interface Familia {
  id: string; name: string; responsible_person_id: string | null; phone: string | null; address: { texto?: string } | null;
  neighborhood: string | null; members_count: number | null; notes: string | null; is_active: boolean;
  consent_given_at: string | null; consent_registered_by: string | null;
}
export interface PessoaBasica { id: string; full_name: string; phone: string | null }

export const dataBR = (d?: string | null) => (d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR") : "");
export const dataLongaBR = (d?: string | null) => {
  if (!d) return "";
  const s = new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Busca de pessoas para escala, famílias e saúde (só nome e telefone). */
export function useBuscaPessoas(busca: string) {
  return useQuery({
    queryKey: ["pessoas-basico", busca],
    enabled: busca.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await db.rpc("pessoas_basico", { p_busca: busca.trim() });
      if (error) throw error;
      return (data ?? []) as PessoaBasica[];
    },
  });
}

/** Nomes das pessoas citadas numa lista (escala, candidaturas, saúde). */
export function useNomesPessoas(ids: (string | null | undefined)[]) {
  const unicos = Array.from(new Set(ids.filter(Boolean))) as string[];
  return useQuery({
    queryKey: ["pessoas-nomes", unicos.sort().join(",")],
    enabled: unicos.length > 0,
    queryFn: async () => {
      const { data, error } = await db.rpc("pessoas_basico", { p_ids: unicos });
      if (error) throw error;
      const mapa: Record<string, PessoaBasica> = {};
      for (const p of (data ?? []) as PessoaBasica[]) mapa[p.id] = p;
      return mapa;
    },
  });
}

/** Pessoa da conta logada (ou da pessoa simulada no "Visualizar como"). */
export function useMinhaPessoa(userId?: string | null, personId?: string | null) {
  return useQuery({
    queryKey: ["minha-pessoa", userId, personId],
    enabled: !!(userId || personId),
    queryFn: async () => {
      const q = personId
        ? supabase.from("people").select("id, full_name").eq("id", personId)
        : supabase.from("people").select("id, full_name").eq("user_id", userId!);
      const { data } = await q.limit(1);
      return (data?.[0] ?? null) as { id: string; full_name: string } | null;
    },
  });
}
