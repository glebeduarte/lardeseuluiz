import { BookOpen, Globe, HandHeart, HeartHandshake, Landmark, Settings, Sprout, Users, type LucideIcon } from "lucide-react";

export type Modulo = {
  rota: string;
  nome: string;
  descricao: string;
  icone: LucideIcon;
  /** Aparece para quem tem qualquer uma destas permissões. Vazio: todos os voluntários. */
  permissoes: string[];
  disponivel: boolean;
};

/** Módulos da plataforma. Cada um aparece no menu só para quem tem permissão. */
export const MODULOS: Modulo[] = [
  {
    rota: "/formacao",
    nome: "Formação",
    descricao: "Cursos, turmas e presenças",
    icone: BookOpen,
    permissoes: ["formacao.gerir", "formacao.acompanhar", "formacao.evangelizacao"],
    disponivel: false,
  },
  {
    rota: "/atendimento",
    nome: "Atendimento",
    descricao: "Diálogo Fraterno, passes e macas",
    icone: HeartHandshake,
    permissoes: ["atendimento.acolhimento", "atendimento.dialogo", "atendimento.maca", "atendimento.passe", "atendimento.coordenar", "atendimento.relatorios"],
    disponivel: false,
  },
  {
    rota: "/acoes",
    nome: "Ações sociais",
    descricao: "Projetos, famílias e escalas",
    icone: HandHeart,
    permissoes: ["acoes.operar", "acoes.familias", "acoes.saude"],
    disponivel: false,
  },
  {
    rota: "/governanca",
    nome: "Governança",
    descricao: "Associados, financeiro e assembleias",
    icone: Landmark,
    permissoes: ["governanca.associados", "governanca.financeiro", "governanca.assembleias", "governanca.documentos", "governanca.relatorios"],
    disponivel: false,
  },
  {
    rota: "/pessoas",
    nome: "Pessoas",
    descricao: "Cadastros, cargos e funções",
    icone: Users,
    permissoes: ["pessoas.ler"],
    disponivel: true,
  },
  {
    rota: "/interessados",
    nome: "Voluntariado",
    descricao: "Interessados que se apresentaram pelo site",
    icone: Sprout,
    permissoes: ["chamamento.entrevistar"],
    disponivel: true,
  },
  {
    rota: "/painel-site",
    nome: "Site",
    descricao: "Agenda, programação, ações e mensagens",
    icone: Globe,
    permissoes: ["site.publicar"],
    disponivel: true,
  },
  {
    rota: "/configuracoes",
    nome: "Configurações",
    descricao: "Funções, permissões e áreas",
    icone: Settings,
    permissoes: ["plataforma.configurar"],
    disponivel: false,
  },
];

export function modulosVisiveis(pode: (chave: string) => boolean) {
  return MODULOS.filter((m) => m.permissoes.some(pode));
}
