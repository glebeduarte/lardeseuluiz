// Cadastro de médium já vinculado à maca (antes server function). Regra na função "atendimento-equipe" do Supabase.
import { chamarEquipe } from "@/lib/server-fn";

export const criarUsuarioMedium = chamarEquipe<{ userId: string; nome: string; email: string }>("criarUsuarioMedium") as (a: { data: { maca_id: string; nome: string; email: string; senha: string } }) => Promise<{ userId: string; nome: string; email: string }>;
