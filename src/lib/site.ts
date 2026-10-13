import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Atividade = {
  id: string;
  titulo: string;
  descricao: string | null;
  dia_semana: number;
  recorrencia: "semanal" | "quinzenal" | "mensal";
  inicio: string;
  fim: string;
  online: boolean;
  ativa: boolean;
  publico: boolean;
  ordem: number;
  atividade_blocos: Bloco[];
};
export type Bloco = { id: string; titulo: string; categoria: string; inicio: string; fim: string; ordem: number };

export type Evento = {
  id: string;
  tipo: "palestra" | "evento" | "acao_social" | "curso" | "estudo";
  titulo: string;
  descricao: string | null;
  data: string;
  inicio: string | null;
  fim: string | null;
  palestrante: string | null;
  local: string | null;
  area_id: string | null;
  publicado: boolean;
};

export type Area = {
  id: string;
  tipo: "direcao" | "secretaria" | "projeto" | "equipe";
  nome: string;
  slug: string;
  resumo: string | null;
  descricao: string | null;
  conteudo: string | null;
  imagem_url: string | null;
  etiquetas: string[];
  aceita_candidaturas: boolean;
  ordem: number;
};

export const DIAS = ["Domingos", "Segundas", "Terças", "Quartas", "Quintas", "Sextas", "Sábados"];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const RECORRENCIA: Record<string, string> = { semanal: "", quinzenal: "quinzenais", mensal: "mensais" };
export const TIPO_EVENTO: Record<string, string> = {
  palestra: "Palestra",
  evento: "Evento",
  acao_social: "Ação social",
  curso: "Curso",
  estudo: "Estudo",
};

export function nomeDia(a: Pick<Atividade, "dia_semana" | "recorrencia">) {
  const sufixo = RECORRENCIA[a.recorrencia];
  return sufixo ? `${DIAS[a.dia_semana]} ${sufixo}` : DIAS[a.dia_semana];
}

export const hora = (t: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
};
export const diaDoMes = (d: string) => new Date(d + "T12:00").getDate().toString().padStart(2, "0");
export const mesCurto = (d: string) =>
  new Date(d + "T12:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
export const diaSemana = (d: string) => new Date(d + "T12:00").toLocaleDateString("pt-BR", { weekday: "long" });
export const hojeISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function useSiteConfig() {
  return useQuery({
    queryKey: ["site_config"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_config").select("chave, valor");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.chave, r.valor])) as Record<string, string>;
    },
  });
}

export function useAtividades(todas = false) {
  return useQuery({
    queryKey: ["atividades", todas],
    queryFn: async () => {
      let q = supabase
        .from("atividades")
        .select("*, atividade_blocos(*)")
        .order("ordem");
      if (!todas) q = q.eq("ativa", true).eq("publico", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Atividade[]).map((a) => ({
        ...a,
        atividade_blocos: [...a.atividade_blocos].sort((x, y) => x.ordem - y.ordem),
      }));
    },
  });
}

export function useEventos({ desde, limite, todos = false }: { desde?: string; limite?: number; todos?: boolean } = {}) {
  return useQuery({
    queryKey: ["eventos", desde, limite, todos],
    queryFn: async () => {
      let q = supabase.from("eventos").select("*").order("data").order("inicio");
      if (desde) q = q.gte("data", desde);
      if (!todos) q = q.eq("publicado", true);
      if (limite) q = q.limit(limite);
      const { data, error } = await q;
      if (error) throw error;
      return data as Evento[];
    },
  });
}

export function useProjetos() {
  return useQuery({
    queryKey: ["projetos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, tipo, nome, slug, resumo, descricao, conteudo, imagem_url, etiquetas, aceita_candidaturas, ordem")
        .eq("tipo", "projeto")
        .eq("ativa", true)
        .eq("publica", true)
        .order("ordem");
      if (error) throw error;
      return data as Area[];
    },
  });
}

export function useArea(slug: string | undefined) {
  return useQuery({
    queryKey: ["area", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, tipo, nome, slug, resumo, descricao, conteudo, imagem_url, etiquetas, aceita_candidaturas, ordem")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as Area | null;
    },
  });
}
