import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/acoes";

// Secretarias da Governança: página da secretaria e sistema de tarefas.
// Acesso: membros da secretaria, Direção (função "Direção" ativa) e administradores.
// Editar e apagar uma tarefa: quem criou ou a coordenação. Os demais membros mudam a situação, se colocam como responsáveis e comentam.

export type StatusTarefa = "a_fazer" | "fazendo" | "feita" | "cancelada";

export const STATUS: { valor: StatusTarefa; rotulo: string; cor: string; ponto: string }[] = [
  { valor: "a_fazer", rotulo: "A fazer", cor: "bg-sky-100 text-sky-800 border-sky-300", ponto: "bg-sky-500" },
  { valor: "fazendo", rotulo: "Fazendo", cor: "bg-amber-100 text-amber-800 border-amber-300", ponto: "bg-amber-500" },
  { valor: "feita", rotulo: "Feita", cor: "bg-emerald-100 text-emerald-800 border-emerald-300", ponto: "bg-emerald-500" },
];
export const STATUS_ROTULO: Record<StatusTarefa, string> = { a_fazer: "A fazer", fazendo: "Fazendo", feita: "Feita", cancelada: "Cancelada" };
export const STATUS_COR: Record<StatusTarefa, string> = {
  a_fazer: STATUS[0].cor, fazendo: STATUS[1].cor, feita: STATUS[2].cor, cancelada: "bg-muted text-muted-foreground border-border",
};

export interface SecretariaResumo {
  id: string; name: string; description: string | null; icon: string | null; is_active: boolean;
  sou_membro: boolean; sou_coordenador: boolean; membros: number; a_fazer: number; fazendo: number; feitas_30d: number;
}
export interface PessoaSecretaria {
  member_id: string; person_id: string; full_name: string; photo_url: string | null; phone: string | null;
  member_role: "coordenador" | "participante"; joined_at: string;
}
export interface Tarefa {
  id: string; secretaria_id: string; title: string; description: string | null; status: StatusTarefa;
  due_date: string | null; done_at: string | null; position: number; created_by: string | null; created_at: string; updated_at: string;
  secretaria_task_assignees?: { person_id: string }[];
}
export interface Atualizacao { id: string; task_id: string; person_id: string | null; kind: string; body: string | null; created_at: string }

export function useMinhasSecretarias() {
  return useQuery({
    queryKey: ["minhas-secretarias"],
    queryFn: async () => {
      const { data, error } = await db.rpc("minhas_secretarias");
      if (error) throw error;
      return (data ?? []) as SecretariaResumo[];
    },
  });
}

/** Secretaria, pessoas e o que a conta pode fazer nela. */
export function useSecretaria(id?: string) {
  const resumo = useMinhasSecretarias();
  const direcao = useQuery({
    queryKey: ["eh-direcao"],
    queryFn: async () => !!(await db.rpc("eh_direcao")).data,
  });
  const pessoas = useQuery({
    queryKey: ["secretaria-pessoas", id],
    enabled: !!id && !!resumo.data?.some((s) => s.id === id),
    queryFn: async () => {
      const { data, error } = await db.rpc("secretaria_pessoas", { p_sec: id });
      if (error) throw error;
      return (data ?? []) as PessoaSecretaria[];
    },
  });
  const sec = resumo.data?.find((s) => s.id === id) ?? null;
  return {
    sec,
    carregando: resumo.isLoading,
    semAcesso: !resumo.isLoading && !sec,
    pessoas: pessoas.data ?? [],
    souCoordenador: !!sec?.sou_coordenador,
    souMembro: !!sec?.sou_membro,
    direcao: !!direcao.data,
  };
}

export function useTarefas(secretariaId?: string) {
  return useQuery({
    queryKey: ["secretaria-tarefas", secretariaId],
    enabled: !!secretariaId,
    queryFn: async () => {
      const { data, error } = await db.from("secretaria_tasks").select("*, secretaria_task_assignees(person_id)")
        .eq("secretaria_id", secretariaId).order("position", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tarefa[];
    },
  });
}

const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const atrasada = (t: Pick<Tarefa, "due_date" | "status">) => !!t.due_date && t.status !== "feita" && t.due_date < hojeIso();
export const hoje = hojeIso;

export function dataAmigavel(d?: string | null) {
  if (!d) return "";
  const alvo = new Date(d.length === 10 ? d + "T12:00:00" : d);
  const diff = Math.round((new Date(alvo.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  return alvo.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function tempoAtras(d: string) {
  const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}
