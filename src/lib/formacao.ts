import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Curso = {
  id: string;
  titulo: string;
  descricao: string | null;
  descricao_longa: string | null;
  categoria: string | null;
  publico: "todos" | "voluntarios";
  situacao: "rascunho" | "publicado" | "arquivado";
  inscricoes_abertas: boolean;
  exige_aprovacao: boolean;
  linhas_estudo: string[];
  topicos: string[];
  inicio: string | null;
  fim: string | null;
  horario: string | null;
  facilitadores: string | null;
  duracao_minutos: number | null;
  capa_url: string | null;
  miniatura_url: string | null;
};
export type Modulo = { id: string; curso_id: string; titulo: string; descricao: string | null; ordem: number };
export type Aula = {
  id: string; modulo_id: string; titulo: string; descricao: string | null; video_url: string | null;
  miniatura_url: string | null; embed_url: string | null; embed_titulo: string | null; ordem: number;
};
export type Matricula = { id: string; pessoa_id: string; curso_id: string; turma_id: string | null; situacao: string; criado_em: string };

export const SITUACAO_MATRICULA: Record<string, string> = {
  pendente: "Aguardando aprovação",
  aprovada: "Matriculado",
  recusada: "Não aprovada",
  cancelada: "Cancelada",
  concluida: "Concluído",
};

export function useCursosPublicados() {
  return useQuery({
    queryKey: ["cursos", "publicados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cursos").select("*").eq("situacao", "publicado").order("titulo");
      if (error) throw error;
      return data as Curso[];
    },
  });
}

export function useCurso(id: string | undefined) {
  return useQuery({
    queryKey: ["curso", id],
    enabled: !!id,
    queryFn: async () => {
      const [curso, modulos] = await Promise.all([
        supabase.from("cursos").select("*").eq("id", id!).maybeSingle(),
        supabase.from("modulos").select("*").eq("curso_id", id!).order("ordem"),
      ]);
      if (curso.error) throw curso.error;
      return { curso: curso.data as Curso | null, modulos: (modulos.data ?? []) as Modulo[] };
    },
  });
}

export function useMinhasMatriculas(pessoaId: string | undefined) {
  return useQuery({
    queryKey: ["minhas-matriculas", pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select("*, cursos(id, titulo, miniatura_url, capa_url)")
        .eq("pessoa_id", pessoaId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as (Matricula & { cursos: Pick<Curso, "id" | "titulo" | "miniatura_url" | "capa_url"> })[];
    },
  });
}

/** Aulas de um curso (só retorna para quem está matriculado ou é da equipe). */
export function useAulasDoCurso(cursoId: string | undefined, modulos: Modulo[] | undefined) {
  return useQuery({
    queryKey: ["aulas-curso", cursoId],
    enabled: !!cursoId && !!modulos,
    queryFn: async () => {
      const ids = (modulos ?? []).map((m) => m.id);
      if (!ids.length) return [] as Aula[];
      const { data, error } = await supabase.from("aulas").select("*").in("modulo_id", ids).order("ordem");
      if (error) throw error;
      return data as Aula[];
    },
  });
}

/** Transforma links comuns de vídeo em endereço incorporável. */
export function urlIncorporavel(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/live/")) return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com") && !u.hostname.startsWith("player.")) return `https://player.vimeo.com/video${u.pathname}`;
    if (u.hostname.includes("drive.google.com")) return url.replace(/\/view.*$/, "/preview");
    return url;
  } catch {
    return null;
  }
}

export function duracao(min: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? m.toString().padStart(2, "0") : ""}` : `${m} min`;
}
