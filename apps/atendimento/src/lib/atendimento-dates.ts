// Datas de "Atendimento ao Público".
// Terças (semanal) importadas do calendário oficial:
// https://calendario.lardeseuluiz.com.br/ (a partir de 07/07/2026).
// Sábados quinzenais iniciando em 11/07/2026 (alternando).
export const ATENDIMENTO_DATES_TERCA_ISO: string[] = [
  "2026-07-07",
  "2026-07-14",
  "2026-07-21",
  "2026-07-28",
  "2026-08-04",
  "2026-08-11",
  "2026-08-18",
  "2026-08-25",
  "2026-09-01",
  "2026-09-08",
  "2026-09-15",
  "2026-09-22",
  "2026-09-29",
  "2026-10-06",
  "2026-10-13",
  "2026-10-20",
  "2026-10-27",
  "2026-11-03",
  "2026-11-10",
  "2026-11-17",
  "2026-11-24",
  "2026-12-01",
  "2026-12-08",
];

export const ATENDIMENTO_DATES_SABADO_ISO: string[] = [
  "2026-07-11",
  "2026-07-25",
  "2026-08-08",
  "2026-08-22",
  "2026-09-05",
  "2026-09-19",
  "2026-10-03",
  "2026-10-17",
  "2026-10-31",
  "2026-11-14",
  "2026-11-28",
  "2026-12-12",
];

// Mantido para compatibilidade: união de todas as datas.
export const ATENDIMENTO_DATES_ISO: string[] = [
  ...ATENDIMENTO_DATES_TERCA_ISO,
  ...ATENDIMENTO_DATES_SABADO_ISO,
];

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const ATENDIMENTO_DATES_TERCA: Date[] = ATENDIMENTO_DATES_TERCA_ISO.map(toDate);
export const ATENDIMENTO_DATES_SABADO: Date[] = ATENDIMENTO_DATES_SABADO_ISO.map(toDate);
export const ATENDIMENTO_DATES: Date[] = ATENDIMENTO_DATES_ISO.map(toDate);

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isAtendimentoDate(date: Date): boolean {
  return ATENDIMENTO_DATES_ISO.includes(toIso(date));
}

export type DiaAtendimento = "terca" | "sabado";

export function getAtendimentoDatesByDia(dia?: DiaAtendimento | string | null): Date[] {
  if (dia === "sabado") return ATENDIMENTO_DATES_SABADO;
  if (dia === "terca") return ATENDIMENTO_DATES_TERCA;
  return ATENDIMENTO_DATES;
}

export function getAtendimentoDatesIsoByDia(dia?: DiaAtendimento | string | null): string[] {
  if (dia === "sabado") return ATENDIMENTO_DATES_SABADO_ISO;
  if (dia === "terca") return ATENDIMENTO_DATES_TERCA_ISO;
  return ATENDIMENTO_DATES_ISO;
}

export function isAtendimentoDateForDia(date: Date, dia?: DiaAtendimento | string | null): boolean {
  return getAtendimentoDatesIsoByDia(dia).includes(toIso(date));
}

// Todas as datas válidas de atendimento até hoje (inclusive).
export function getAtendimentoDatesIsoAteHoje(hoje: Date = new Date()): string[] {
  const hojeIso = toIso(hoje);
  return ATENDIMENTO_DATES_ISO.filter((d) => d <= hojeIso).sort();
}

// Próxima data válida de atendimento a partir de hoje (exclusive de datas passadas).
export function getProximaAtendimentoDateIso(hoje: Date = new Date()): string | undefined {
  const hojeIso = toIso(hoje);
  return [...ATENDIMENTO_DATES_ISO].sort().find((d) => d >= hojeIso);
}

export function isDiaDeAtendimento(hoje: Date = new Date()): boolean {
  return ATENDIMENTO_DATES_ISO.includes(toIso(hoje));
}

export function formatDataExtenso(iso: string): string {
  const d = toDate(iso);
  const s = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDataCurta(iso: string): string {
  const d = toDate(iso);
  const semana = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `${semana.charAt(0).toUpperCase() + semana.slice(1)}, ${d.toLocaleDateString("pt-BR")}`;
}

export function diaLabelFromIso(iso: string): "Terça-feira" | "Sábado" {
  return toDate(iso).getDay() === 6 ? "Sábado" : "Terça-feira";
}

// Última data de atendimento válida até hoje (ou a primeira futura, se nenhuma passou).
export function getUltimaAtendimentoDateByDia(dia?: DiaAtendimento | string | null, hoje: Date = new Date()): Date | undefined {
  const datas = getAtendimentoDatesByDia(dia);
  const hojeIso = toIso(hoje);
  let ultima: Date | undefined;
  for (const d of datas) {
    if (toIso(d) <= hojeIso) ultima = d;
    else break;
  }
  return ultima ?? datas[0];
}

// Quantas sessões de atendimento (do dia da maca) ocorreram desde o encerramento.
export function sessoesDesdeEncerramento(
  closedAt: string | null | undefined,
  dia?: DiaAtendimento | string | null,
  ref: Date = new Date()
): number {
  if (!closedAt) return 0;
  const closedIso = closedAt.slice(0, 10);
  const refIso = toIso(ref);
  return getAtendimentoDatesIsoByDia(dia).filter((d) => d > closedIso && d <= refIso).length;
}

// Após 6 sessões inativo, o consulente sai da listagem da maca (fica arquivado).
export const SESSOES_ATE_ARQUIVAR = 6;

// Atendimento quinzenal: o consulente comparece a cada duas datas válidas do dia da maca,
// contadas a partir da data-base (primeiro atendimento / início na maca).
export function isDataEsperadaQuinzenal(
  isoAtual: string,
  isoBase: string | null | undefined,
  dia?: DiaAtendimento | string | null
): boolean {
  if (!isoBase) return true;
  const datas = getAtendimentoDatesIsoByDia(dia);
  const iAtual = datas.indexOf(isoAtual);
  if (iAtual < 0) return true;
  let iBase = datas.indexOf(isoBase);
  if (iBase < 0) {
    // data-base fora do calendário: usa a primeira data válida a partir dela
    iBase = datas.findIndex((d) => d >= isoBase);
    if (iBase < 0) return true;
  }
  return Math.abs(iAtual - iBase) % 2 === 0;
}

export function isDesignacaoArquivada(
  status: string,
  closedAt: string | null | undefined,
  dia?: DiaAtendimento | string | null,
  ref: Date = new Date()
): boolean {
  if (status === "ativa") return false;
  return sessoesDesdeEncerramento(closedAt, dia, ref) >= SESSOES_ATE_ARQUIVAR;
}
