import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Search, X, GraduationCap, ListChecks, HandHeart, CalendarDays, HeartPulse, UserRound, Sprout,
  Building2, HeartHandshake, Home, Megaphone, UserPlus, Users, FileText, Wallet, Vote, BookOpen,
  ClipboardList, MessageCircle, Stethoscope, BarChart3, Globe, Library, CalendarCheck, Settings, Ticket,
} from "lucide-react";
import type { AreasLsl } from "./BarraSistemas";

// "O que você quer fazer?": um botão sempre à mão em todas as áreas logadas.
// Lista, em palavras do dia a dia, só o que a pessoa pode fazer, e leva direto para lá.

type Cor = "verde" | "azul" | "dourado" | "laranja" | "roxo" | "rosa" | "cinza";

export interface AtividadeLsl {
  id: string;
  rotulo: string;
  ajuda: string;
  href: string;
  grupo: "Para mim" | "Na casa" | "No atendimento" | "Nos cursos" | "Na gestão";
  cor: Cor;
  icone: ComponentType<{ className?: string }>;
  palavras?: string;
  mostrar?: (a: AreasCompletas) => boolean;
}

type AreasCompletas = AreasLsl & {
  admin?: boolean;
  direcao?: boolean;
  permissoes?: string[];
  atendimento_papeis?: string[];
  rifas?: { opera?: boolean; vende?: boolean };
};

const pode = (a: AreasCompletas, perm: string) => !!a.admin || !!a.permissoes?.includes(perm);
const papel = (a: AreasCompletas, ...ps: string[]) => !!a.atendimento_papeis?.some((p) => p === "admin" || ps.includes(p));

export const ATIVIDADES: AtividadeLsl[] = [
  // Para todos
  { id: "cursos", rotulo: "Ver meus cursos", ajuda: "Aulas, materiais e o seu progresso", href: "/formacao/dashboard", grupo: "Para mim", cor: "verde", icone: GraduationCap, palavras: "curso aula esde estudo assistir" },
  { id: "tarefas", rotulo: "Ver minhas tarefas", ajuda: "O que você precisa fazer nas secretarias", href: "/app/perfil?aba=tarefas", grupo: "Para mim", cor: "azul", icone: ListChecks, palavras: "tarefa fazer pendente atividade", mostrar: (a) => !!a.governanca },
  { id: "escalas", rotulo: "Ver minhas escalas", ajuda: "Os dias em que você ajuda nas ações sociais", href: "/app/perfil?aba=acoes", grupo: "Para mim", cor: "laranja", icone: CalendarCheck, palavras: "escala dia confirmar presença sopa" },
  { id: "onde", rotulo: "Onde eu ajudo", ajuda: "Suas secretarias, funções e projetos", href: "/app/perfil?aba=casa", grupo: "Para mim", cor: "dourado", icone: HandHeart, palavras: "secretaria função projeto vínculo" },
  { id: "jornada", rotulo: "Minha jornada de voluntário", ajuda: "Entrevista, curso, estágio e integração", href: "/app/perfil?aba=jornada", grupo: "Para mim", cor: "rosa", icone: Sprout, palavras: "voluntário chamamento estágio entrevista" },
  { id: "dados", rotulo: "Atualizar meus dados", ajuda: "Telefone, endereço, foto e aniversário", href: "/app/perfil?aba=dados", grupo: "Para mim", cor: "cinza", icone: UserRound, palavras: "perfil telefone foto endereço senha dados" },
  { id: "frequencia", rotulo: "Ver minha frequência", ajuda: "Presenças nas aulas dos cursos", href: "/formacao/minha-frequencia", grupo: "Para mim", cor: "verde", icone: ClipboardList, palavras: "presença falta frequência" },
  { id: "agenda", rotulo: "Ver a agenda da casa", ajuda: "Palestras e trabalhos da semana", href: "/agenda", grupo: "Para mim", cor: "azul", icone: CalendarDays, palavras: "agenda palestra horário semana" },
  { id: "acoes-site", rotulo: "Participar de uma ação social", ajuda: "Sopa Solidária, Natal das Crianças e outras", href: "/#acoes", grupo: "Para mim", cor: "laranja", icone: HeartHandshake, palavras: "ação social participar ajudar sopa natal feijoada" },
  { id: "biblioteca", rotulo: "Abrir a biblioteca", ajuda: "Livros e materiais de estudo", href: "/formacao/biblioteca", grupo: "Nos cursos", cor: "verde", icone: Library, palavras: "livro biblioteca material" },
  { id: "explorar", rotulo: "Me inscrever num curso", ajuda: "Veja os cursos com inscrição aberta", href: "/formacao/explore", grupo: "Nos cursos", cor: "verde", icone: BookOpen, palavras: "inscrição novo curso matrícula" },

  // Na casa (Governança)
  { id: "secretarias", rotulo: "Abrir minhas secretarias", ajuda: "Pessoas, responsabilidades e tarefas", href: "/app/secretarias", grupo: "Na casa", cor: "azul", icone: Building2, palavras: "secretaria equipe", mostrar: (a) => !!a.governanca },
  { id: "registrar", rotulo: "Registrar o que eu fiz", ajuda: "Anote uma tarefa feita para a casa", href: "/app/secretarias", grupo: "Na casa", cor: "azul", icone: ListChecks, palavras: "registrar anotar feito tarefa nova", mostrar: (a) => !!a.governanca },
  { id: "painel", rotulo: "Ver o painel da casa", ajuda: "Resumo da Governança", href: "/app", grupo: "Na casa", cor: "cinza", icone: BarChart3, palavras: "painel resumo dashboard início", mostrar: (a) => !!a.governanca },
  { id: "eventos", rotulo: "Cadastrar palestra ou evento", ajuda: "O que aparece na agenda do site", href: "/app/eventos", grupo: "Na casa", cor: "azul", icone: Megaphone, palavras: "palestra evento agenda publicar", mostrar: (a) => !!a.governanca },
  { id: "documentos", rotulo: "Ver documentos da casa", ajuda: "Estatuto, atas e relatórios", href: "/app/documentos", grupo: "Na casa", cor: "cinza", icone: FileText, palavras: "documento estatuto ata", mostrar: (a) => !!a.governanca },
  { id: "acoes", rotulo: "Organizar as ações sociais", ajuda: "Edições, escalas, entregas e relatórios", href: "/app/acoes", grupo: "Na casa", cor: "laranja", icone: HeartHandshake, palavras: "ação social edição escala entrega", mostrar: (a) => pode(a, "modulo_projetos") },
  { id: "familias", rotulo: "Ver as famílias atendidas", ajuda: "Cadastro das famílias das ações", href: "/app/familias", grupo: "Na casa", cor: "laranja", icone: Home, palavras: "família cesta cadastro", mostrar: (a) => pode(a, "modulo_projetos") },
  { id: "chamamento", rotulo: "Acompanhar novos voluntários", ajuda: "Chamamento: entrevistas, curso e estágio", href: "/app/chamamento", grupo: "Na casa", cor: "rosa", icone: UserPlus, palavras: "chamamento candidato novo voluntário entrevista", mostrar: (a) => pode(a, "modulo_recepcao") },
  { id: "frequentadores", rotulo: "Ver os frequentadores", ajuda: "Quem frequenta a casa", href: "/app/frequentadores", grupo: "Na casa", cor: "rosa", icone: Users, palavras: "frequentador cadastro", mostrar: (a) => pode(a, "modulo_recepcao") },

  { id: "vender-rifa", rotulo: "Vender números da rifa", ajuda: "Registre a venda pelo celular", href: "/app/rifas/vender", grupo: "Na casa", cor: "dourado", icone: Ticket, palavras: "rifa vender número bilhete", mostrar: (a) => !!a.rifas?.vende || !!a.rifas?.opera },
  { id: "rifas", rotulo: "Cuidar das rifas", ajuda: "Confirmar PIX, liberar números e sortear", href: "/app/rifas", grupo: "Na casa", cor: "dourado", icone: Ticket, palavras: "rifa pix pagamento sorteio", mostrar: (a) => !!a.rifas?.opera },

  // Atendimento
  { id: "recepcao", rotulo: "Receber quem chegou", ajuda: "Recepção do dia e fila das macas", href: "/atendimento/recepcao", grupo: "No atendimento", cor: "roxo", icone: ClipboardList, palavras: "recepção chegada fila senha", mostrar: (a) => papel(a, "recepcao") },
  { id: "dialogo", rotulo: "Fazer um Diálogo Fraterno", ajuda: "Registrar a conversa e encaminhar", href: "/atendimento/dialogo/novo", grupo: "No atendimento", cor: "roxo", icone: MessageCircle, palavras: "diálogo fraterno dialogador conversa", mostrar: (a) => papel(a, "dialogador") },
  { id: "medium", rotulo: "Atender na maca", ajuda: "A maca em que você trabalha hoje", href: "/atendimento/medium", grupo: "No atendimento", cor: "roxo", icone: Stethoscope, palavras: "maca médium passe tratamento", mostrar: (a) => papel(a, "medium") },
  { id: "consulentes", rotulo: "Procurar um consulente", ajuda: "Cadastro e histórico de atendimentos", href: "/atendimento/consulentes", grupo: "No atendimento", cor: "roxo", icone: HeartPulse, palavras: "consulente buscar histórico", mostrar: (a) => papel(a, "recepcao", "dialogador") },
  { id: "relatorios-atd", rotulo: "Ver relatórios do atendimento", ajuda: "Números dos dias de trabalho", href: "/atendimento/relatorios", grupo: "No atendimento", cor: "roxo", icone: BarChart3, palavras: "relatório número atendimento", mostrar: (a) => papel(a) },

  // Cursos (quem cuida)
  { id: "cursos-admin", rotulo: "Cuidar dos cursos", ajuda: "Turmas, aulas, alunos e presença", href: "/formacao/admin", grupo: "Nos cursos", cor: "verde", icone: GraduationCap, palavras: "turma aula aluno presença administrar", mostrar: (a) => !!a.formacao_admin },
  { id: "presenca", rotulo: "Lançar presença de uma aula", ajuda: "Chamada dos alunos", href: "/formacao/admin/attendance", grupo: "Nos cursos", cor: "verde", icone: CalendarCheck, palavras: "chamada presença lista", mostrar: (a) => !!a.formacao_admin },

  // Gestão
  { id: "financeiro", rotulo: "Lançar no financeiro", ajuda: "Entradas, saídas e prestação de contas", href: "/app/financeiro", grupo: "Na gestão", cor: "cinza", icone: Wallet, palavras: "dinheiro doação despesa financeiro", mostrar: (a) => pode(a, "modulo_financeiro") },
  { id: "assembleias", rotulo: "Organizar uma assembleia", ajuda: "Convocação, presença e ata", href: "/app/assembleias", grupo: "Na gestão", cor: "cinza", icone: Vote, palavras: "assembleia votação ata", mostrar: (a) => pode(a, "modulo_gestao") },
  { id: "pessoas", rotulo: "Procurar uma pessoa", ajuda: "Cadastro único de voluntários e associados", href: "/app/pessoas", grupo: "Na gestão", cor: "cinza", icone: Users, palavras: "pessoa voluntário associado cadastro buscar", mostrar: (a) => pode(a, "modulo_gestao") },
  { id: "funcoes", rotulo: "Dar acesso a alguém", ajuda: "Funções e o que cada uma pode abrir", href: "/app/configuracoes/funcoes", grupo: "Na gestão", cor: "cinza", icone: Settings, palavras: "acesso permissão função liberar", mostrar: (a) => pode(a, "modulo_admin") },
  { id: "site", rotulo: "Ir para o site", ajuda: "A página inicial do Lar", href: "/", grupo: "Para mim", cor: "cinza", icone: Globe, palavras: "site início página" },
];

const GRUPOS: AtividadeLsl["grupo"][] = ["Para mim", "Na casa", "No atendimento", "Nos cursos", "Na gestão"];

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface OQueFazerProps {
  areas: AreasLsl | null;
  /** Navegação interna do app atual. Retorne true se tratou o link. */
  navegar?: (href: string) => boolean;
}

export function OQueFazer({ areas, navegar }: OQueFazerProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
      const alvo = e.target as HTMLElement | null;
      const digitando = alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable);
      if (!digitando && (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"))) {
        e.preventDefault();
        setAberto(true);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setBusca("");
    const t = window.setTimeout(() => campo.current?.focus(), 60);
    const corpo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.clearTimeout(t); document.body.style.overflow = corpo; };
  }, [aberto]);

  const lista = useMemo(() => {
    const a = (areas ?? { logado: false }) as AreasCompletas;
    const visiveis = ATIVIDADES.filter((x) => !x.mostrar || x.mostrar(a));
    const q = semAcento(busca.trim());
    if (!q) return visiveis;
    const termos = q.split(/\s+/);
    return visiveis.filter((x) => {
      const texto = semAcento(`${x.rotulo} ${x.ajuda} ${x.palavras ?? ""}`);
      return termos.every((t) => texto.includes(t));
    });
  }, [areas, busca]);

  const ir = (href: string) => {
    setAberto(false);
    if (navegar?.(href)) return;
    window.location.href = href;
  };

  return (
    <>
      <button type="button" className="lsl-fazer-botao" onClick={() => setAberto(true)} aria-haspopup="dialog">
        <Search aria-hidden="true" />
        <span>O que você quer fazer?</span>
      </button>

      {aberto && (
        <div className="lsl-fazer" role="dialog" aria-modal="true" aria-labelledby="lsl-fazer-titulo">
          <div className="lsl-fazer__fundo" onClick={() => setAberto(false)} />
          <div className="lsl-fazer__painel">
            <div className="lsl-fazer__topo">
              <h2 id="lsl-fazer-titulo">O que você quer fazer?</h2>
              <button type="button" className="lsl-fazer__fechar" onClick={() => setAberto(false)} aria-label="Fechar"><X /></button>
            </div>
            <label className="lsl-fazer__busca">
              <Search aria-hidden="true" />
              <input
                ref={campo}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && lista[0]) ir(lista[0].href); }}
                placeholder="Escreva, por exemplo: tarefa, escala, curso"
                aria-label="Procurar uma atividade"
              />
            </label>
            <div className="lsl-fazer__lista">
              {lista.length === 0 && (
                <p className="lsl-fazer__vazio">Não achei nada com “{busca}”. Tente outra palavra, como “curso” ou “tarefa”.</p>
              )}
              {GRUPOS.map((g) => {
                const itens = lista.filter((x) => x.grupo === g);
                if (!itens.length) return null;
                return (
                  <section key={g}>
                    <h3>{g}</h3>
                    <ul>
                      {itens.map((x) => {
                        const Icone = x.icone;
                        return (
                          <li key={x.id}>
                            <a href={x.href} className="lsl-fazer__item" onClick={(e) => {
                              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                              e.preventDefault(); ir(x.href);
                            }}>
                              <span className={`lsl-fazer__icone lsl-cor-${x.cor}`}><Icone /></span>
                              <span className="lsl-fazer__texto">
                                <strong>{x.rotulo}</strong>
                                <small>{x.ajuda}</small>
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
