import { supabase } from "@/integrations/supabase/client";

// Reuniões da Governança (tabela governanca.reunioes e bucket privado "reunioes").
// Pauta e anotações são blocos do editor (jsonb). Arquivos ficam em reunioes/<id da reunião>/...

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const BUCKET_REUNIOES = "reunioes";
export const LIMITE_ARQUIVO = 50 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Blocos = any[];

export interface ArquivoReuniao { caminho: string; nome: string; tamanho: number }

export interface Reuniao {
  id: string;
  titulo: string;
  data_hora: string | null;
  local: string | null;
  participantes: string[];
  pauta: Blocos | null;
  anotacoes: Blocos | null;
  transcricao_texto: string | null;
  transcricao_arquivo: ArquivoReuniao | null;
  criado_em: string;
  atualizado_em: string;
}

export type ResumoReuniao = Pick<Reuniao, "id" | "titulo" | "data_hora" | "local" | "participantes" | "atualizado_em">;

export async function listarReunioes(): Promise<ResumoReuniao[]> {
  const { data, error } = await db.from("reunioes")
    .select("id, titulo, data_hora, local, participantes, atualizado_em")
    .order("data_hora", { ascending: false, nullsFirst: true });
  if (error) throw error;
  return data ?? [];
}

export async function buscarReuniao(id: string): Promise<Reuniao | null> {
  const { data, error } = await db.from("reunioes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function criarReuniao(): Promise<string> {
  // Sugere a próxima hora cheia, para a pessoa só ajustar
  const quando = new Date();
  quando.setMinutes(0, 0, 0);
  quando.setHours(quando.getHours() + 1);
  const { data, error } = await db.from("reunioes")
    .insert({ titulo: "", data_hora: quando.toISOString(), local: "Sede do Lar" })
    .select("id").single();
  if (error) throw error;
  return data.id;
}

export async function salvarReuniao(id: string, campos: Partial<Reuniao>) {
  const { error } = await db.from("reunioes").update(campos).eq("id", id);
  if (error) throw error;
}

export async function excluirReuniao(id: string) {
  // Apaga primeiro os arquivos da pasta da reunião
  const pasta = supabase.storage.from(BUCKET_REUNIOES);
  const { data: arquivos } = await pasta.list(id, { limit: 1000 });
  if (arquivos?.length) await pasta.remove(arquivos.map((a) => `${id}/${a.name}`));
  const { error } = await db.from("reunioes").delete().eq("id", id);
  if (error) throw error;
}

const nomeSeguro = (nome: string) =>
  nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "arquivo";

/** Envia um arquivo para a pasta da reunião e devolve o caminho dentro do bucket. */
export async function enviarArquivoReuniao(reuniaoId: string, arquivo: File): Promise<string> {
  if (arquivo.size > LIMITE_ARQUIVO) throw new Error("O arquivo passa de 50 MB. Envie um arquivo menor ou cole o link dele.");
  const caminho = `${reuniaoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nomeSeguro(arquivo.name)}`;
  const { error } = await supabase.storage.from(BUCKET_REUNIOES).upload(caminho, arquivo, { contentType: arquivo.type || undefined });
  if (error) throw new Error(error.message);
  return caminho;
}

export async function removerArquivoReuniao(caminho: string) {
  await supabase.storage.from(BUCKET_REUNIOES).remove([caminho]);
}

// O bucket é privado. Dentro das anotações guardamos um endereço fixo do arquivo;
// na hora de mostrar, ele é trocado por um link assinado, que vale por 1 hora.
const PREFIXO = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET_REUNIOES}/`;
export const enderecoFixo = (caminho: string) => PREFIXO + caminho.split("/").map(encodeURIComponent).join("/");

const assinados = new Map<string, { url: string; vence: number }>();

export async function linkAssinado(caminho: string): Promise<string> {
  const guardado = assinados.get(caminho);
  if (guardado && guardado.vence > Date.now()) return guardado.url;
  const { data, error } = await supabase.storage.from(BUCKET_REUNIOES).createSignedUrl(caminho, 3600);
  if (error || !data) throw new Error(error?.message || "Não foi possível abrir o arquivo.");
  assinados.set(caminho, { url: data.signedUrl, vence: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

/** Usado pelo editor: endereços dos nossos arquivos viram link assinado; links de fora passam direto. */
export async function resolverEndereco(url: string): Promise<string> {
  if (!url.startsWith(PREFIXO)) return url;
  const caminho = url.slice(PREFIXO.length).split("/").map(decodeURIComponent).join("/");
  try { return await linkAssinado(caminho); } catch { return url; }
}

/** Nomes das pessoas cadastradas, para sugerir ao digitar os participantes. */
export async function nomesDePessoas(): Promise<string[]> {
  const { data } = await db.from("people").select("full_name").order("full_name").limit(2000);
  return ((data ?? []) as { full_name: string | null }[]).map((p) => (p.full_name || "").trim()).filter(Boolean);
}

// Data e hora no formato do campo <input type="datetime-local">, no horário do aparelho
export function paraCampoDataHora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const doCampoDataHora = (valor: string): string | null => (valor ? new Date(valor).toISOString() : null);

export function dataPorExtenso(iso: string | null): string {
  if (!iso) return "Sem data";
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, às ${hora}`;
}

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
