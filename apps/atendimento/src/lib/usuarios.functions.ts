// Operações de equipe do Atendimento (antes server functions). A regra de cada uma está na função
// "atendimento-equipe" do Supabase, que confere se quem chama é administrador do Atendimento.
import { chamarEquipe } from "@/lib/server-fn";

type Papel = "admin" | "dialogador" | "recepcao" | "medium";
export type NovoUsuario = {
  nome: string; email: string; telefone: string; data_nascimento: string; como_chamar?: string; senha: string; roles: Papel[];
};

export const criarUsuario = chamarEquipe<{ userId: string; email: string }>("criarUsuario") as (a: { data: NovoUsuario }) => Promise<{ userId: string; email: string }>;
export const importarUsuarios = chamarEquipe<{ sucesso: string[]; erros: { email: string; erro: string }[] }>("importarUsuarios") as (a: { data: { usuarios: NovoUsuario[] } }) => Promise<{ sucesso: string[]; erros: { email: string; erro: string }[] }>;
export const atualizarTelefone = chamarEquipe<{ ok: boolean }>("atualizarTelefone") as (a: { data: { user_id: string; telefone: string } }) => Promise<{ ok: boolean }>;
export const definirAtivoUsuario = chamarEquipe<{ ok: boolean }>("definirAtivoUsuario") as (a: { data: { user_id: string; ativo: boolean } }) => Promise<{ ok: boolean }>;
export const removerUsuario = chamarEquipe<{ ok: boolean }>("removerUsuario") as (a: { data: { user_id: string } }) => Promise<{ ok: boolean }>;
export const resetarSenhaUsuario = chamarEquipe<{ sucesso: string[]; erros: { user_id: string; erro: string }[]; senha?: string; senhas: Record<string, string> }>("resetarSenhaUsuario") as (a: { data: { user_ids: string[] } }) => Promise<{ sucesso: string[]; erros: { user_id: string; erro: string }[]; senha?: string; senhas: Record<string, string> }>;
export const concluirTrocaSenha = chamarEquipe<{ ok: boolean }>("concluirTrocaSenha") as (a?: { data?: unknown }) => Promise<{ ok: boolean }>;
