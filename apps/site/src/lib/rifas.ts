import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/acoes";

// Rifa digital: números escolhidos no site ou vendidos por voluntários, PIX conferido à mão pela coordenação
// e sorteio presencial. Tabelas em governanca.raffles, raffle_orders, raffle_tickets e raffle_sellers.

export type RifaStatus = "rascunho" | "vendendo" | "encerrada" | "sorteada";
export type PedidoStatus = "reservado" | "pago" | "cancelado";

export const RIFA_STATUS: Record<RifaStatus, string> = {
  rascunho: "Em preparação", vendendo: "Vendendo", encerrada: "Vendas encerradas", sorteada: "Sorteada",
};
export const RIFA_COR: Record<RifaStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  vendendo: "bg-emerald-100 text-emerald-800 border-emerald-300",
  encerrada: "bg-amber-100 text-amber-800 border-amber-300",
  sorteada: "bg-sky-100 text-sky-800 border-sky-300",
};
export const PEDIDO_STATUS: Record<PedidoStatus, string> = { reservado: "Esperando PIX", pago: "Pago", cancelado: "Liberado" };
export const PEDIDO_COR: Record<PedidoStatus, string> = {
  reservado: "bg-amber-100 text-amber-800 border-amber-300",
  pago: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelado: "bg-muted text-muted-foreground border-border",
};

export interface Rifa {
  id: string; slug: string; title: string; prize: string; prize_items: string[]; prize_value: string | null; description: string | null; cover_url: string | null;
  ticket_price: number; total_numbers: number; max_per_order: number;
  pix_key: string | null; pix_name: string | null; pix_city: string | null; whatsapp: string | null;
  draw_date: string | null; draw_place: string | null; rules: string | null; authorization_note: string | null;
  project_id: string | null; status: RifaStatus; winner_number: number | null; winner_order_id: string | null;
  drawn_at: string | null; draw_notes: string | null; created_at: string; created_by?: string | null;
}
export interface Pedido {
  id: string; raffle_id: string; code: string; buyer_name: string; buyer_phone: string; buyer_email: string | null;
  channel: "site" | "vendedor"; seller_person_id: string | null; received_by_seller: boolean; status: PedidoStatus;
  amount: number; paid_at: string | null; canceled_at: string | null; cancel_reason: string | null; notes: string | null; created_at: string;
  raffle_tickets?: { number: number; ativo: boolean }[];
}
export interface RifaPublica {
  id: string; slug: string; titulo: string; premio: string; itens_premio: string[] | null; valor_premio: string | null; descricao: string | null; capa: string | null;
  preco: number; total: number; max_por_pedido: number; status: RifaStatus;
  data_sorteio: string | null; local_sorteio: string | null; regras: string | null; autorizacao: string | null;
  whatsapp: string | null; pix_chave: string | null; pix_nome: string | null; pix_cidade: string | null;
  numeros: [number, "r" | "p"][];
  ganhador: { numero: number; data: string; nome: string | null } | null;
}
export interface Reserva { codigo: string; valor: number; status: PedidoStatus; numeros: number[] }

export const reais = (v: number | string) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pad = (n: number, total: number) => String(n).padStart(String(total).length, "0");
export const soDigitos = (t: string) => (t || "").replace(/\D/g, "");
export const linkWhats = (tel: string, msg?: string) => {
  let d = soDigitos(tel);
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
};
export const dataBR = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "";
/** Mensagens do banco vêm como "Erro: texto"; mostra só o texto. */
export const erroAmigavel = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e);
  return m.replace(/^.*?ERROR:\s*/i, "");
};

export function useRifaPublica(slug?: string) {
  return useQuery({
    queryKey: ["rifa-publica", slug],
    enabled: !!slug,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("rifa_publica", { p_slug: slug });
      if (error) throw error;
      return data as RifaPublica | null;
    },
  });
}

export function useRifasPublicas() {
  return useQuery({
    queryKey: ["rifas-publicas"],
    queryFn: async () => {
      const { data, error } = await db.rpc("rifas_publicas");
      if (error) throw error;
      return (data ?? []) as { slug: string; titulo: string; premio: string; capa: string | null; preco: number; total: number; status: RifaStatus; data_sorteio: string | null; vendidos: number }[];
    },
  });
}

/* ───── PIX copia e cola (BR Code estático, padrão do Banco Central) ───── */

const campo = (id: string, valor: string) => id + String(valor.length).padStart(2, "0") + valor;
const limpar = (t: string, max: number) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .\-@]/g, "").toUpperCase().trim().slice(0, max);

function crc16(texto: string) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Chave PIX no formato que o banco espera: e-mail e chave aleatória como estão, telefone com +55, CPF/CNPJ só números. */
export function normalizarChave(chave: string) {
  const k = chave.trim();
  if (k.includes("@")) return k.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  const d = soDigitos(k);
  if (k.startsWith("+")) return "+" + d;
  if (/[()\s]/.test(k) && d.length >= 10) return "+" + (d.startsWith("55") && d.length >= 12 ? d : "55" + d);
  return d || k;
}

/** Monta o código "PIX copia e cola" com chave, valor e o código do pedido como identificador. */
export function pixCopiaECola({ chave, nome, cidade, valor, identificador }: { chave: string; nome: string; cidade: string; valor: number; identificador: string }) {
  const k = normalizarChave(chave);
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", k);
  const txid = identificador.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor.toFixed(2)) +
    campo("58", "BR") +
    campo("59", limpar(nome, 25) || "LAR DE SEU LUIZ") +
    campo("60", limpar(cidade, 15) || "NISIA FLORESTA") +
    campo("62", campo("05", txid)) +
    "6304";
  return corpo + crc16(corpo);
}

/** Mensagem de WhatsApp para quem reservou e ainda não pagou: números, valor e o PIX copia e cola pronto. */
export function mensagemCobranca({ nome, codigo, titulo, numeros, total, valor, chave, recebedor, cidade, slug }: {
  nome: string; codigo: string; titulo: string; numeros: number[]; total: number; valor: number;
  chave: string | null; recebedor: string | null; cidade: string | null; slug?: string | null;
}) {
  const primeiro = nome.trim().split(/\s+/)[0] || nome;
  const lista = numeros.map((n) => pad(n, total)).join(", ");
  const partes = [
    `Olá, ${primeiro}! Sua reserva *${codigo}* na ${titulo} está guardada.`,
    `Números: ${lista}`,
    `Valor: *${reais(valor)}*`,
  ];
  if (chave) {
    const codigoPix = pixCopiaECola({ chave, nome: recebedor || "LAR DE SEU LUIZ", cidade: cidade || "NISIA FLORESTA", valor, identificador: codigo });
    partes.push(
      "",
      "Para pagar, copie o código abaixo e cole no app do seu banco, em *Pix copia e cola*. O valor já vem preenchido:",
      "",
      codigoPix,
      "",
      `Se preferir, use a chave PIX ${normalizarChave(chave)}${recebedor ? ` (${recebedor})` : ""}.`,
    );
  } else if (slug) {
    partes.push("", `Para pagar pelo PIX: ${window.location.origin}/rifas/${slug}`);
  }
  partes.push("", "Depois é só responder esta mensagem com o comprovante. Obrigado por ajudar o Lar de Seu Luiz!");
  return partes.join("\n");
}
