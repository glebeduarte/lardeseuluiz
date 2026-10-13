import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Conteúdo dinâmico do site: palestras (Cadastro de Palestras), eventos publicados (/app/eventos)
// e ações sociais (/app/projetos). Tudo é editado na área administrativa e aparece aqui sozinho.

export type Palestra = { id: string; dia_semana: string; data: string; hora: string; palestrante: string; tema: string };
export type EventoSite = {
  id: string; title: string; description: string | null; event_type: string; event_date: string;
  start_time: string | null; end_time: string | null; location: string | null; speaker: string | null;
};
export type Projeto = {
  id: string; name: string; slug: string; summary: string | null; description: string | null; content: string | null;
  cover_url: string | null; tags: string[]; schedule: string | null; accepts_volunteers: boolean; status: string;
};

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function usePalestras(opts: { desde?: string; limite?: number } = {}) {
  return useQuery({
    queryKey: ["site-palestras", opts],
    queryFn: async () => {
      let q = supabase.from("palestras").select("*").order("data").order("hora");
      if (opts.desde) q = q.gte("data", opts.desde);
      if (opts.limite) q = q.limit(opts.limite);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Palestra[];
    },
  });
}

export function useEventosSite(desde?: string) {
  return useQuery({
    queryKey: ["site-eventos", desde],
    queryFn: async () => {
      let q = supabase.from("site_events").select("*").eq("is_published", true).order("event_date");
      if (desde) q = q.gte("event_date", desde);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EventoSite[];
    },
  });
}

export function useProjetos() {
  return useQuery({
    queryKey: ["site-projetos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects" as never).select("*").eq("is_public", true).order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as Projeto[];
    },
  });
}

export function useProjeto(slug?: string) {
  return useQuery({
    queryKey: ["site-projeto", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects" as never).select("*").eq("slug", slug!).eq("is_public", true).maybeSingle();
      if (error) throw error;
      return data as unknown as Projeto | null;
    },
  });
}
