import { useEffect, useState } from "react";
import type { Palestra } from "@/lib/site-dados";

// A semana da casa. Os horários são os mesmos publicados na seção de horários do site.
// dia: 0 domingo ... 6 sábado. inicio e fim em minutos desde a meia-noite (horário de Brasília/Recife).
export type Trabalho = {
  id: string;
  dia: number;
  rotuloDia: string;
  nome: string;
  inicio: number;
  fim: number;
  horario: string;
  descricao: string;
  online?: boolean;
  /** Sábados não acontecem toda semana: só contam quando há palestra marcada na agenda. */
  sabado?: "quinzenal" | "mensal";
};

const h = (hora: number, min = 0) => hora * 60 + min;

export const SEMANA: Trabalho[] = [
  {
    id: "terca", dia: 2, rotuloDia: "Terça", nome: "Tratamento Espiritual e Atendimento",
    inicio: h(14), fim: h(18, 30), horario: "14h às 18h30",
    descricao: "Diálogo fraterno, palestra, atendimento nas macas, passes e água fluidificada. Aberto ao público.",
  },
  {
    id: "quinta", dia: 4, rotuloDia: "Quinta, online", nome: "Estudo Doutrinário (ESDE)",
    inicio: h(19, 30), fim: h(21), horario: "19h30 às 21h", online: true,
    descricao: "Estudo da Doutrina Espírita pelo Google Meet, para os voluntários da casa.",
  },
  {
    id: "sexta", dia: 5, rotuloDia: "Sexta", nome: "Desobsessão e Atendimento Espiritual",
    inicio: h(15, 30), fim: h(18, 45), horario: "15h30 às 18h45",
    descricao: "Macas, diálogo fraterno, evangelho, palestra e passes. Aberto ao público.",
  },
  {
    id: "sabado", dia: 6, rotuloDia: "Sábado, quinzenal", nome: "Tratamento Espiritual e Atendimento",
    inicio: h(14, 30), fim: h(19), horario: "14h30 às 19h", sabado: "quinzenal",
    descricao: "O mesmo acolhimento das terças, em sábados alternados. Confira as datas na agenda.",
  },
  {
    id: "cafe", dia: 6, rotuloDia: "Sábado, mensal", nome: "CaFÉ & AMor",
    inicio: h(16), fim: h(18), horario: "16h às 18h", sabado: "mensal",
    descricao: "Conversa sobre espiritualidade e psicologia: mediunidade, autoconhecimento e maturidade emocional.",
  },
];

const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Hora atual no fuso do Lar (America/Recife, sem horário de verão).
function agoraNoLar() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(new Date());
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    dia: dias.indexOf(v("weekday")),
    minutos: Number(v("hour")) * 60 + Number(v("minute")),
    iso: `${v("year")}-${v("month")}-${v("day")}`,
  };
}

function somarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const horaCurta = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;

export type SituacaoCasa =
  | { tipo: "aberta"; trabalho: Trabalho; texto: string }
  | { tipo: "online"; trabalho: Trabalho; texto: string }
  | { tipo: "fechada"; trabalho: Trabalho | null; texto: string; quando: string };

/** Diz se a casa está aberta agora e, se não estiver, quando abre de novo (presencial). */
export function situacaoDaCasa(palestras: Palestra[]): SituacaoCasa {
  const agora = agoraNoLar();
  const sabadosComAgenda = new Set(palestras.filter((p) => /s[áa]b/i.test(p.dia_semana)).map((p) => p.data));
  const acontece = (t: Trabalho, iso: string) => !t.sabado || sabadosComAgenda.has(iso);

  for (const t of SEMANA) {
    if (t.dia === agora.dia && acontece(t, agora.iso) && agora.minutos >= t.inicio && agora.minutos < t.fim) {
      if (t.online) return { tipo: "online", trabalho: t, texto: `Estudo online acontecendo agora, até ${horaCurta(t.fim)}` };
      return { tipo: "aberta", trabalho: t, texto: `A casa está aberta agora, até ${horaCurta(t.fim)}` };
    }
  }

  for (let n = 0; n < 15; n++) {
    const iso = somarDias(agora.iso, n);
    const dia = (agora.dia + n) % 7;
    const doDia = SEMANA
      .filter((t) => !t.online && t.dia === dia && acontece(t, iso) && (n > 0 || t.inicio > agora.minutos))
      .sort((a, b) => a.inicio - b.inicio);
    if (doDia.length) {
      const t = doDia[0];
      const quando = n === 0 ? "hoje" : n === 1 ? "amanhã" : DIAS_LONGOS[dia];
      return { tipo: "fechada", trabalho: t, quando, texto: `A casa abre ${quando}, às ${horaCurta(t.inicio)}` };
    }
  }
  return { tipo: "fechada", trabalho: null, quando: "", texto: "Confira os próximos dias na agenda" };
}

/** Atualiza a situação a cada minuto, para quem deixa a página aberta. */
export function useSituacaoDaCasa(palestras: Palestra[]) {
  const [s, setS] = useState(() => situacaoDaCasa(palestras));
  useEffect(() => {
    setS(situacaoDaCasa(palestras));
    const id = window.setInterval(() => setS(situacaoDaCasa(palestras)), 60_000);
    return () => window.clearInterval(id);
  }, [palestras]);
  return s;
}

export const diaDeHojeNoLar = () => agoraNoLar().dia;
