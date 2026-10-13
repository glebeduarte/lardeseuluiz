import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bed,
  Users,
  UserPlus,
  Sparkles,
  Stethoscope,
  ClipboardList,
  Settings,
  Shield,
  MessagesSquare,
  Headset,
  CalendarDays,
  Printer,
  KeyRound,
  ArrowRight,
  Check,
} from "lucide-react";
import logoLSL from "@/assets/logo-lsl.png";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recursos")({
  head: () => ({
    meta: [
      { title: "Recursos e Funcionalidades — Sistema de Macas" },
      {
        name: "description",
        content:
          "Conheça todos os recursos do Sistema de Macas do Centro Espiritualista Lar de Seu Luiz: cadastro de consulentes, gestão de macas, acolhimento, atendimento e mais.",
      },
      { property: "og:title", content: "Recursos e Funcionalidades — Sistema de Macas" },
      {
        property: "og:description",
        content:
          "Visão completa do que o Sistema de Macas é capaz de fazer, em linguagem simples.",
      },
    ],
  }),
  component: RecursosPage,
});

type Accent = "blue" | "teal" | "gold" | "red";

const ACCENT_BAR: Record<Accent, string> = {
  blue: "bg-brand-blue",
  teal: "bg-brand-teal",
  gold: "bg-brand-gold",
  red: "bg-brand-red",
};
const ACCENT_ICON: Record<Accent, string> = {
  blue: "bg-brand-blue-muted text-brand-blue",
  teal: "bg-brand-teal-muted text-brand-teal-dark",
  gold: "bg-brand-gold-muted text-brand-gold-dark",
  red: "bg-brand-red-muted text-brand-red",
};

const perfis: { icon: typeof Shield; title: string; desc: string; accent: Accent }[] = [
  {
    icon: Shield,
    title: "Administrador",
    desc: "Gerencia usuários, macas e acompanha o histórico de todos os atendimentos.",
    accent: "red",
  },
  {
    icon: MessagesSquare,
    title: "Dialogador",
    desc: "Realiza o Diálogo Fraterno, cadastra novos consulentes e os designa para uma maca.",
    accent: "teal",
  },
  {
    icon: Headset,
    title: "Acolhimento",
    desc: "Organiza a chegada do dia, marca presença e encaminha consulentes para as macas.",
    accent: "blue",
  },
  {
    icon: Sparkles,
    title: "Médium",
    desc: "Atende na sua maca, vê a fila de consulentes e registra observações do atendimento.",
    accent: "gold",
  },
];

const recursos: {
  icon: typeof Bed;
  title: string;
  accent: Accent;
  items: string[];
}[] = [
  {
    icon: Users,
    title: "Cadastro de consulentes",
    accent: "teal",
    items: [
      "Ficha completa com dados pessoais, contato e endereço",
      "Motivos do atendimento e relato do consulente",
      "Informações sensíveis (saúde, medicamentos) com acesso restrito",
      "Encaminhamentos e indicações feitas pela casa",
      "Histórico de atendimentos anteriores",
      "Edição da ficha pelo administrador a qualquer momento",
    ],
  },
  {
    icon: MessagesSquare,
    title: "Diálogo Fraterno",
    accent: "teal",
    items: [
      "Cadastro do consulente no primeiro contato",
      "Registro do motivo da busca e das orientações dadas",
      "Designação direta para uma maca e dia de trabalho",
      "Atendimento de consulentes já existentes, complementando a ficha",
    ],
  },
  {
    icon: Bed,
    title: "Gestão de macas",
    accent: "blue",
    items: [
      "Cadastro com número, nome, cor e capacidade máxima",
      "Definição do dia da semana em que cada maca trabalha",
      "Classificação como interna ou externa",
      "Designação dos médiuns responsáveis por cada maca",
      "Ativação ou desativação sem perder o histórico",
      "Criação rápida de um novo médium já vinculado à maca",
    ],
  },
  {
    icon: Settings,
    title: "Gestão de usuários",
    accent: "red",
    items: [
      "Cadastro individual com nome, e-mail, telefone e nascimento",
      "Importação em massa por planilha (com modelo para download)",
      "Atribuição de um ou mais perfis por usuário",
      "Ativação, desativação ou remoção de usuários",
      "Atualização de dados de contato a qualquer momento",
    ],
  },
  {
    icon: ClipboardList,
    title: "Acolhimento do dia",
    accent: "blue",
    items: [
      "Visão de todas as macas em funcionamento no dia",
      "Identificação clara por cor, número e categoria",
      "Marcação de chegada de cada consulente",
      "Encaminhamento para a maca quando o médium estiver pronto",
      "Impressão da relação de macas e consulentes",
    ],
  },
  {
    icon: Stethoscope,
    title: "Atendimento na maca",
    accent: "gold",
    items: [
      "Acesso restrito à(s) maca(s) do médium",
      "Fila de consulentes com ordem de chegada",
      "Leitura das informações relevantes da ficha",
      "Registro de observações do atendimento",
      "Alta do consulente, liberando a vaga na maca",
    ],
  },
  {
    icon: CalendarDays,
    title: "Histórico de sessões",
    accent: "red",
    items: [
      "Consulta das sessões por dia e por maca",
      "Visualização das observações registradas pelos médiuns",
      "Acompanhamento da frequência e do fluxo de atendimentos",
    ],
  },
  {
    icon: KeyRound,
    title: "Acesso e segurança",
    accent: "blue",
    items: [
      "Login individual com e-mail e senha",
      "Cadastro de usuários controlado pelo administrador",
      "Troca de senha disponível para todos os usuários",
      "Dados sensíveis visíveis apenas para perfis autorizados",
      "Possibilidade de simular outros perfis (admin)",
    ],
  },
  {
    icon: Printer,
    title: "Recursos de apoio",
    accent: "gold",
    items: [
      "Identificação visual das macas por cor e número",
      "Máscaras automáticas em telefone e datas",
      "Mensagens de confirmação a cada ação importante",
      "Funciona em computadores, tablets e celulares",
      "Impressão de listas para uso no dia",
    ],
  },
];

function RecursosPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="h-14 bg-card border-b shadow-sm flex items-center justify-between px-4 md:px-7">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoLSL} alt="Lar de Seu Luiz" className="h-8 w-8 object-contain rounded-md" />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[14px] font-bold text-brand-blue-dark">Lar de Seu Luiz</span>
            <span className="text-[11px] text-muted-foreground -mt-0.5">Sistema de Macas</span>
          </div>
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3.5 py-1.5 text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors"
        >
          Entrar
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="max-w-[1180px] mx-auto px-4 md:px-7 py-8 md:py-10 space-y-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[20px] px-7 py-9 md:px-12 md:py-12 text-white shadow-lg bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue-light">
          <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-white/[0.06]" aria-hidden />
          <div className="absolute -bottom-20 right-24 w-72 h-72 rounded-full bg-white/[0.04]" aria-hidden />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90">
              <Sparkles className="h-3 w-3" />
              Recursos e funcionalidades
            </span>
            <h1 className="font-display text-[28px] md:text-[38px] font-bold leading-tight mt-4">
              Tudo o que o Sistema de Macas é capaz de fazer
            </h1>
            <p className="text-[14px] md:text-[15px] text-white/80 mt-3 leading-relaxed">
              Em um só lugar, a casa organiza quem trabalha, quem é atendido e o que acontece em
              cada maca — com respeito ao sigilo das informações e ao papel de cada pessoa no
              trabalho.
            </p>
          </div>
        </section>

        {/* Perfis */}
        <section>
          <SectionHeader title="Perfis de acesso" subtitle="Cada pessoa entra no sistema com um perfil que define o que pode fazer." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {perfis.map((p) => (
              <div
                key={p.title}
                className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span className={cn("absolute top-0 inset-x-0 h-[3px]", ACCENT_BAR[p.accent])} />
                <div className={cn("w-10 h-10 rounded-md flex items-center justify-center mb-3", ACCENT_ICON[p.accent])}>
                  <p.icon className="h-[18px] w-[18px]" />
                </div>
                <div className="font-semibold text-sm text-foreground">{p.title}</div>
                <p className="text-[12.5px] text-muted-foreground leading-snug mt-1.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recursos */}
        <section>
          <SectionHeader title="Recursos do sistema" subtitle="Tudo agrupado pelas principais áreas de uso." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recursos.map((r) => (
              <div
                key={r.title}
                className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span className={cn("absolute top-0 inset-x-0 h-[3px]", ACCENT_BAR[r.accent])} />
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-10 h-10 rounded-md flex items-center justify-center shrink-0", ACCENT_ICON[r.accent])}>
                    <r.icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="font-semibold text-[15px] text-foreground">{r.title}</div>
                </div>
                <ul className="space-y-1.5">
                  {r.items.map((it) => (
                    <li key={it} className="flex gap-2 text-[13px] text-muted-foreground leading-snug">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand-teal" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Resumo / CTA */}
        <section className="rounded-xl border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-4 flex-wrap md:flex-nowrap">
            <div className="w-11 h-11 rounded-md flex items-center justify-center bg-brand-gold-muted text-brand-gold-dark shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-bold text-foreground">Em resumo</h3>
              <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed">
                O sistema substitui controles em papel e planilhas soltas por um único lugar,
                organizado e seguro, onde a casa pode acompanhar quem atende, quem é atendido e o
                que acontece em cada maca.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors shrink-0"
            >
              Acessar o sistema
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Centro Espiritualista Lar de Seu Luiz · Sistema de Macas v1.7.0
      </footer>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="block w-[3px] h-[18px] rounded-sm bg-brand-gold" />
        <h2 className="font-display text-[20px] font-bold text-foreground">{title}</h2>
      </div>
      <p className="text-[13.5px] text-muted-foreground ml-[14px]">{subtitle}</p>
    </div>
  );
}
