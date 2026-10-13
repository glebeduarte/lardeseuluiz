// Chamamento: jornada de frequentador a voluntário (Processo de adesão de novos voluntários do Lar de Seu Luiz).
// Ciclos bimestrais: chamamento e entrevistas, curso "O Trabalho Voluntário na Casa Espírita", estágio de 8 semanas,
// avaliação final e integração oficial.

export type Etapa = "interesse" | "curso" | "estagio" | "avaliacao" | "integracao" | "voluntario" | "colaborador" | "pausado" | "desligado";

export const ETAPAS_JORNADA: { etapa: Etapa; rotulo: string; curto: string; ajuda: string }[] = [
  { etapa: "interesse", rotulo: "Chamamento e entrevista", curto: "Entrevista", ajuda: "Procurou a recepção. A Secretaria de Acolhimento faz a entrevista inicial." },
  { etapa: "curso", rotulo: "Curso O Trabalho Voluntário", curto: "Curso", ajuda: "Formação no sábado pela manhã, com matrícula automática na Formação." },
  { etapa: "estagio", rotulo: "Estágio probatório", curto: "Estágio", ajuda: "8 semanas com tutor, rodízio de áreas e checkpoint na semana 4." },
  { etapa: "avaliacao", rotulo: "Avaliação final", curto: "Avaliação", ajuda: "Tutor e coordenadores avaliam os critérios e decidem." },
  { etapa: "integracao", rotulo: "Integração oficial", curto: "Integração", ajuda: "Boas-vindas na roda de preparação antes da reunião pública." },
  { etapa: "voluntario", rotulo: "Voluntário", curto: "Voluntário", ajuda: "Integrado à escala regular de trabalho." },
];

export const ETAPA_LABEL: Record<Etapa, string> = {
  interesse: "Aguardando entrevista", curso: "No curso", estagio: "Em estágio", avaliacao: "Em avaliação",
  integracao: "Aguardando integração", voluntario: "Voluntário", colaborador: "Colaborador financeiro", pausado: "Pausado", desligado: "Desligado",
};
export const ETAPA_COR: Record<Etapa, string> = {
  interesse: "bg-amber-100 text-amber-800 border-amber-300",
  curso: "bg-sky-100 text-sky-800 border-sky-300",
  estagio: "bg-primary/10 text-primary border-primary/20",
  avaliacao: "bg-amber-100 text-amber-800 border-amber-300",
  integracao: "bg-emerald-100 text-emerald-800 border-emerald-300",
  voluntario: "bg-emerald-100 text-emerald-800 border-emerald-300",
  colaborador: "bg-muted text-muted-foreground border-border",
  pausado: "bg-muted text-muted-foreground border-border",
  desligado: "bg-muted text-muted-foreground border-border",
};

export const PROXIMA: Partial<Record<Etapa, Etapa>> = {
  interesse: "curso", curso: "estagio", estagio: "avaliacao", avaliacao: "integracao", integracao: "voluntario", pausado: "estagio",
};
export const ACAO_PROXIMA: Partial<Record<Etapa, string>> = {
  interesse: "Entrevista feita: seguir para o curso",
  curso: "Curso concluído: iniciar o estágio",
  estagio: "Estágio concluído: ir para a avaliação",
  avaliacao: "Aprovado: preparar a integração",
  integracao: "Confirmar a integração oficial",
  pausado: "Retomar o estágio",
};
export const ETAPAS_ABERTAS: Etapa[] = ["interesse", "curso", "estagio", "avaliacao", "integracao", "pausado"];

export const ORIGEM_LABEL: Record<string, string> = { reuniao: "Reunião pública", site: "Site", indicacao: "Indicação", outro: "Outro" };

export const AREAS_INTERESSE = ["Acolhimento", "Atendimento espiritual", "Evangelização", "Ações sociais", "Comunicação", "Infraestrutura", "Secretaria", "Outra"];

/** Áreas permitidas no estágio e o rodízio sugerido (2 semanas em cada). Passes, mediunidade e evangelização não entram. */
export const AREAS_ESTAGIO = ["Recepção e acolhimento", "Servir água", "Limpeza e organização", "Apoio logístico", "Observação de atividades", "Área de preferência"];
export const RODIZIO = (semana: number) =>
  semana <= 2 ? "Recepção e acolhimento" : semana <= 4 ? "Apoio logístico" : semana <= 6 ? "Limpeza e organização" : "Área de preferência";

export const CRITERIOS: { chave: string; rotulo: string }[] = [
  { chave: "assiduidade", rotulo: "Assiduidade (presença em pelo menos 75% dos trabalhos)" },
  { chave: "pontualidade", rotulo: "Pontualidade" },
  { chave: "postura", rotulo: "Postura fraterna e respeitosa" },
  { chave: "receptividade", rotulo: "Receptividade a orientações" },
  { chave: "integracao", rotulo: "Integração com a equipe" },
  { chave: "discricao", rotulo: "Discrição e sigilo" },
  { chave: "alinhamento", rotulo: "Alinhamento com os valores da casa" },
];
export const DECISOES: Record<string, string> = {
  aprovado: "Aprovado", mais_tempo: "Precisa de mais tempo", redirecionado: "Redirecionar para outra área", desligado: "Desligamento respeitoso",
};

export interface Ciclo {
  id: string; name: string; starts_on: string; interviews_until: string | null; course_on: string | null; course_id: string | null;
  internship_starts_on: string | null; internship_ends_on: string | null; evaluation_on: string | null; integration_on: string | null;
  status: "planejado" | "em_andamento" | "encerrado"; notes: string | null;
}

export interface Candidato {
  id: string; person_id: string; cycle_id: string | null; etapa: Etapa; origem: string; areas_interesse: string[];
  disponibilidade: string | null; motivacao: string | null; submission_id: string | null;
  entrevista_em: string | null; entrevistador_id: string | null; entrevista: Record<string, string | boolean | undefined>;
  tutor_id: string | null; termo_assinado_em: string | null; estagio_inicio: string | null; checkpoint1_em: string | null; checkpoint1: string | null;
  avaliacao: { criterios?: Record<string, boolean>; parecer?: string; decisao?: string }; avaliado_em: string | null;
  funcao_final_id: string | null; secretaria_final_id: string | null; integrado_em: string | null; motivo_saida: string | null;
  created_at: string; updated_at: string;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const somar = (base: string, dias: number) => { const d = new Date(base + "T12:00:00"); d.setDate(d.getDate() + dias); return iso(d); };
const proximoSabado = (base: string) => { const d = new Date(base + "T12:00:00"); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); return iso(d); };

/** Datas sugeridas de um ciclo a partir do início (cronograma do ciclo bimestral). */
export function datasDoCiclo(inicio: string) {
  const curso = proximoSabado(somar(inicio, 14)); // Mês 1, semana 3 (sábado)
  const estagioInicio = somar(curso, 2); // segunda depois do curso
  const estagioFim = somar(estagioInicio, 8 * 7 - 1);
  const avaliacao = somar(estagioFim, 1);
  return {
    interviews_until: somar(inicio, 13), course_on: curso, internship_starts_on: estagioInicio,
    internship_ends_on: estagioFim, evaluation_on: avaliacao, integration_on: somar(avaliacao, 6),
  };
}

export const dataCurta = (d?: string | null) => (d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR") : "");
export const diasDesde = (d?: string | null) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0);
/** Semana do estágio (1 a 8) a partir da data de início. */
export const semanaDoEstagio = (inicio?: string | null) =>
  inicio ? Math.min(12, Math.max(1, Math.floor((Date.now() - new Date(inicio + "T12:00:00").getTime()) / (7 * 86400000)) + 1)) : 1;

export type MinhaJornada = {
  id: string; etapa: Etapa; criado_em: string; entrevista_em: string | null; termo_assinado_em: string | null; estagio_inicio: string | null;
  integrado_em: string | null; tutor: string | null; funcao: string | null; presencas: number; registros: number;
  ciclo: { nome: string; curso_em: string | null; estagio_inicio: string | null; estagio_fim: string | null; avaliacao_em: string | null; integracao_em: string | null; curso_id: string | null } | null;
} | null;

/** Próximo passo explicado para a própria pessoa. */
export function proximoPasso(j: NonNullable<MinhaJornada>): string {
  const c = j.ciclo;
  switch (j.etapa) {
    case "interesse": return j.entrevista_em ? "Entrevista feita. Em breve você recebe a data do curso." : "A Secretaria de Acolhimento vai marcar a sua entrevista inicial.";
    case "curso": return c?.curso_em ? `Curso O Trabalho Voluntário na Casa Espírita no sábado, ${dataCurta(c.curso_em)}, pela manhã.` : "Você está inscrito no curso O Trabalho Voluntário na Casa Espírita.";
    case "estagio": return `Estágio em andamento${j.tutor ? ` com ${j.tutor}` : ""}${j.estagio_inicio ? `: semana ${semanaDoEstagio(j.estagio_inicio)} de 8` : ""}.`;
    case "avaliacao": return "Estágio concluído. A avaliação final com o seu tutor vem a seguir.";
    case "integracao": return c?.integracao_em ? `Aprovado! A integração oficial será em ${dataCurta(c.integracao_em)}, na roda antes da reunião pública.` : "Aprovado! A integração oficial será na roda antes da próxima reunião pública.";
    case "voluntario": return `Bem-vindo à equipe${j.funcao ? ` como ${j.funcao}` : ""}.`;
    case "pausado": return "Sua jornada está pausada. A Secretaria de Acolhimento vai combinar a retomada com você.";
    case "colaborador": return "Obrigado por colaborar com a Casa.";
    default: return "A porta continua aberta para uma nova tentativa quando você quiser.";
  }
}
