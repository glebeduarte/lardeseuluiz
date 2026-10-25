import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/acoes";

// Painel único de acessos: tudo passa pelas funções governanca.painel_* (o banco confere quem pode mexer em quê).

export type Sistema = "atendimento" | "formacao" | "governanca";

export type Direitos = { governanca: boolean; atendimento: boolean; formacao: boolean; criar_acesso: boolean; algum: boolean };

export type PessoaLista = { id: string; nome: string; email: string | null; telefone: string | null; foto: string | null; tem_login: boolean; voluntario: boolean; papeis: number };

export type Curso = {
  id: string; titulo: string; status: string; inicio: string | null; facilita: boolean;
  turmas: { id: string; nome: string }[];
  matricula: { id: string; status: string; turma: string } | null;
};

export type Acessos = {
  direitos: Direitos;
  pessoa: { id: string; nome: string; email: string | null; telefone: string | null; foto: string | null; user_id: string | null; tem_cpf: boolean; tipos: string[] };
  atendimento: { papeis: string[]; via_funcao: string[]; ativo: boolean; macas: { numero: number; nome: string; dia: string | null; cor: string | null }[] };
  formacao: { papeis: string[]; via_funcao: string[]; cursos: Curso[] };
  governanca: {
    papeis: string[]; modulos: string[];
    funcoes: { id: string; funcao: string; funcao_id: string; categoria: string; contexto: string; contexto_nome: string | null; inicio: string }[];
    secretarias: { id: string; nome: string; papel: "coordenador" | "participante" | null }[];
    rifas: { id: string; titulo: string; status: string; vende: boolean }[];
    opcoes_funcoes: { id: string; nome: string; categoria: string }[];
    opcoes_projetos: { id: string; nome: string }[];
  };
  historico: { quando: string; sistema: Sistema; acao: string; detalhe: Record<string, string | null>; por: string }[];
};

export const PAPEIS: Record<Sistema, { id: string; nome: string; ajuda: string }[]> = {
  atendimento: [
    { id: "recepcao", nome: "Acolhimento", ajuda: "Recebe quem chega, procura a ficha e encaminha para a maca" },
    { id: "dialogador", nome: "Dialogador", ajuda: "Faz o Diálogo Fraterno e cadastra o consulente" },
    { id: "medium", nome: "Médium", ajuda: "Faz a chamada da sua maca e escreve as observações" },
    { id: "admin", nome: "Administrador do Atendimento", ajuda: "Macas, sessões, equipe e relatórios" },
  ],
  formacao: [
    { id: "student", nome: "Aluno", ajuda: "Entra nos cursos em que está matriculado" },
    { id: "admin", nome: "Administrador dos cursos", ajuda: "Cria cursos, turmas, aulas e lança presença" },
  ],
  governanca: [
    { id: "trabalhador", nome: "Voluntário", ajuda: "Entra na Governança e vê as suas secretarias, tarefas e escalas" },
    { id: "gestor", nome: "Gestor", ajuda: "Vê pessoas, associados, frequentadores e relatórios da Casa" },
    { id: "admin", nome: "Administrador geral", ajuda: "Pode tudo, inclusive mexer nos acessos das três áreas" },
  ],
};

export const NOME_SISTEMA: Record<Sistema, string> = { atendimento: "Atendimento", formacao: "Formação", governanca: "Governança" };

export const MODULOS: Record<string, string> = {
  modulo_macas: "Macas", modulo_passes: "Passes", modulo_dialogo: "Diálogo", modulo_recepcao: "Recepção",
  modulo_formacao: "Formação", modulo_secretaria: "Secretarias", modulo_projetos: "Ações sociais", modulo_saude: "Saúde",
  modulo_gestao: "Gestão", modulo_financeiro: "Financeiro", modulo_admin: "Administração",
};

export const TIPO_PESSOA: Record<string, string> = {
  trabalhador: "Voluntário", frequentador: "Frequentador", assistido: "Assistido", beneficiario_social: "Beneficiário social", doador: "Doador",
};

export const DIA: Record<string, string> = { terca: "terça", sabado: "sábado", segunda: "segunda", quarta: "quarta", quinta: "quinta", sexta: "sexta", domingo: "domingo" };

/** Rótulo curto de um papel, para selos. */
export function nomePapel(sistema: Sistema, papel: string) {
  return PAPEIS[sistema].find((p) => p.id === papel)?.nome ?? papel;
}

const mensagem = (e: unknown) => {
  const m = (e as { message?: string })?.message || "Não foi possível salvar.";
  return m.replace(/^.*?ERROR:\s*/, "");
};

export function usePainelDireitos(ativo = true) {
  return useQuery({
    queryKey: ["painel-direitos"],
    enabled: ativo,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("painel_direitos");
      if (error) throw error;
      return data as Direitos;
    },
  });
}

export function usePainelPessoas(busca: string, ativo = true) {
  return useQuery({
    queryKey: ["painel-pessoas", busca],
    enabled: ativo,
    queryFn: async () => {
      const { data, error } = await db.rpc("painel_pessoas", { p_busca: busca || null, p_limite: 60 });
      if (error) throw error;
      return (data ?? []) as PessoaLista[];
    },
  });
}

export function usePainelAcessos(personId?: string) {
  return useQuery({
    queryKey: ["painel-acessos", personId],
    enabled: !!personId,
    queryFn: async () => {
      const { data, error } = await db.rpc("painel_acessos", { p_person: personId });
      if (error) throw error;
      return data as Acessos;
    },
  });
}

/** Chama uma função de gravação do painel e já troca os dados da tela pelo retorno (que é o painel atualizado). */
export function useGravarAcesso(personId?: string) {
  const qc = useQueryClient();
  return async (funcao: string, args: Record<string, unknown>, sucesso?: string) => {
    const { data, error } = await db.rpc(funcao, { p_person: personId, ...args });
    if (error) { toast.error(mensagem(error)); return false; }
    qc.setQueryData(["painel-acessos", personId], data);
    qc.invalidateQueries({ queryKey: ["painel-pessoas"] });
    try { sessionStorage.removeItem("lsl:areas"); } catch { /* sem armazenamento */ }
    if (sucesso) toast.success(sucesso);
    return true;
  };
}

/** Cria o login da pessoa (função admin-create-user) com o papel básico da Governança. */
export async function criarAcesso(pessoa: Acessos["pessoa"], email: string, senha: string) {
  const emailLimpo = email.trim().toLowerCase();
  if (!pessoa.email || pessoa.email.toLowerCase() !== emailLimpo) {
    const { error } = await supabase.from("people").update({ email: emailLimpo }).eq("id", pessoa.id);
    if (error) throw new Error(mensagem(error));
  }
  const papel = pessoa.tipos.includes("trabalhador") ? "trabalhador" : "aluno";
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { email: emailLimpo, password: senha, full_name: pessoa.nome, role: papel },
  });
  if (error) throw new Error(mensagem(error));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as { ok: true; user_id: string; ja_existia: boolean; mensagem: string };
}
