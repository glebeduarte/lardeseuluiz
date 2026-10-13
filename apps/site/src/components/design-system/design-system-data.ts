export const navLinks = [
  { href: "#cores", label: "Cores" },
  { href: "#tipografia", label: "Tipografia" },
  { href: "#componentes", label: "Componentes" },
  { href: "#cards", label: "Cards" },
  { href: "#tabela", label: "Tabela" },
  { href: "#secretarias", label: "Secretarias" },
  { href: "#site", label: "Site" },
  { href: "#espacamento", label: "Espaçamento" },
];

export const colorFamilies = [
  {
    label: "Azul Royal — Confiança, Espiritualidade",
    wide: false,
    swatches: [
      { tone: "primary-dark", name: "Blue Dark", hex: "#0D3F75" },
      { tone: "primary", name: "Blue (principal)", hex: "#1A5FA8" },
      { tone: "primary-light", name: "Blue Light", hex: "#3A7FC8" },
      { tone: "primary-muted", name: "Blue Muted", hex: "#E8F1FB" },
    ],
  },
  {
    label: "Teal — Natureza, Crescimento, Cura",
    wide: false,
    swatches: [
      { tone: "secondary-dark", name: "Teal Dark", hex: "#0F5550" },
      { tone: "secondary", name: "Teal (principal)", hex: "#1B7F79" },
      { tone: "secondary-light", name: "Teal Light", hex: "#2FA39C" },
      { tone: "secondary-muted", name: "Teal Muted", hex: "#E6F4F3" },
    ],
  },
  {
    label: "Dourado — Luz, Sabedoria, Destaque",
    wide: false,
    swatches: [
      { tone: "accent-dark", name: "Gold Dark", hex: "#C49200" },
      { tone: "accent", name: "Gold (principal)", hex: "#F5B800" },
      { tone: "accent-light", name: "Gold Light", hex: "#FFCF40" },
      { tone: "accent-muted", name: "Gold Muted", hex: "#FFF8E1" },
    ],
  },
  {
    label: "Vermelho — Ação, Atenção, Vitalidade",
    wide: false,
    swatches: [
      { tone: "destructive-dark", name: "Red Dark", hex: "#922B21" },
      { tone: "destructive", name: "Red (principal)", hex: "#C0392B" },
      { tone: "destructive-light", name: "Red Light", hex: "#E74C3C" },
      { tone: "destructive-muted", name: "Red Muted", hex: "#FDECEA" },
    ],
  },
  {
    label: "Neutros — Texto, Fundos, Bordas",
    wide: true,
    swatches: [
      { tone: "neutral-50", name: "50", hex: "#F8F9FA" },
      { tone: "neutral-500", name: "500", hex: "#ADB5BD" },
      { tone: "neutral-600", name: "600", hex: "#6C757D" },
      { tone: "neutral-800", name: "800", hex: "#343A40" },
      { tone: "neutral-900", name: "900", hex: "#212529" },
    ],
  },
];

export const typeScale = [
  { name: "Display XL", spec: "Playfair · 3.5rem · 900", preview: "Lar de Seu Luiz", className: "type-display-xl" },
  { name: "Heading 1", spec: "Playfair · 2rem · 700", preview: "Nossa Missão", className: "type-heading-1" },
  { name: "Heading 2", spec: "Playfair · 1.5rem · 700", preview: "Assembleias Gerais", className: "type-heading-2" },
  { name: "Heading 3", spec: "DM Sans · 1.1rem · 700", preview: "Gestão Financeira", className: "type-heading-3" },
  {
    name: "Body",
    spec: "DM Sans · 1rem · 400",
    preview:
      "Bem-vindo ao sistema de governança do Lar de Seu Luiz. Aqui você encontra todas as ferramentas para participar ativamente da vida institucional.",
    className: "type-body",
  },
  { name: "Small / Meta", spec: "DM Sans · .8rem · 500", preview: "Atualizado em 13 de maio de 2026 · Versão 2.0", className: "type-small" },
  { name: "Label / Code", spec: "DM Mono · .8rem · 500", preview: "token: --primary → #1A5FA8", className: "type-code" },
];

export const alerts = [
  {
    tone: "info",
    icon: "ℹ️",
    title: "Convocação enviada",
    text: "A Assembleia Geral Ordinária foi convocada para 15/03/2026. Prazo de confirmação: 10 dias.",
  },
  {
    tone: "success",
    icon: "✅",
    title: "Contribuição registrada",
    text: "Mensalidade de fevereiro/2026 confirmada com sucesso.",
  },
  {
    tone: "warning",
    icon: "⚠️",
    title: "Atenção — Inadimplência",
    text: "3 associados com pagamento em atraso há mais de 90 dias.",
  },
  {
    tone: "danger",
    icon: "🚫",
    title: "Quórum insuficiente",
    text: "A assembleia não atingiu 2/3 dos associados na 1ª convocação. Nova data necessária.",
  },
];

export const statCards = [
  { label: "Associados Ativos", value: "47", delta: "↑ 3 este mês", tone: "primary", deltaTone: "up" },
  { label: "Voluntários", value: "138", delta: "↑ 12 no ciclo", tone: "secondary", deltaTone: "up" },
  { label: "Arrecadado (mês)", value: "R$ 4.2k", delta: "↑ 8% vs anterior", tone: "accent-dark", deltaTone: "up" },
  { label: "Inadimplentes", value: "4", delta: "↓ 2 regularizados", tone: "destructive", deltaTone: "down" },
];

export const infoCards = [
  {
    accent: "primary",
    iconTone: "primary",
    icon: "👥",
    title: "Gestão de Pessoas",
    text: "Cadastro completo de associados, colaboradores e frequentadores com histórico e documentos.",
    footer: "47 associados ativos",
    buttonClass: "ds-btn-outline",
  },
  {
    accent: "secondary",
    iconTone: "secondary",
    icon: "💰",
    title: "Financeiro",
    text: "Controle de mensalidades, doações, prestação de contas e fluxo de caixa por projeto.",
    footer: "Saldo: R$ 12.450",
    buttonClass: "ds-btn-secondary",
  },
  {
    accent: "accent",
    iconTone: "accent",
    icon: "📅",
    title: "Assembleias",
    text: "Convocação, votação online, quórum automatizado e geração de atas em conformidade com o Estatuto.",
    footer: "Próxima: 15/03",
    buttonClass: "ds-btn-gold",
  },
];

export const associates = [
  {
    initials: "ML",
    avatar: "blue",
    name: "Marcos Luiz",
    email: "marcos@email.com",
    category: { label: "Fundador", className: "pill-fundador" },
    ingresso: "Set/2025",
    status: { label: "Ativo", className: "pill-ativo" },
    contribution: "Em dia",
    contributionClass: "table-good",
  },
  {
    initials: "AL",
    avatar: "teal",
    name: "Ana Luísa",
    email: "ana@email.com",
    category: { label: "Fundador", className: "pill-fundador" },
    ingresso: "Set/2025",
    status: { label: "Ativo", className: "pill-ativo" },
    contribution: "Em dia",
    contributionClass: "table-good",
  },
  {
    initials: "RG",
    avatar: "gold",
    name: "Reginaldo G.",
    email: "reginaldo@email.com",
    category: { label: "Colaborador", className: "pill-colaborador" },
    ingresso: "Jan/2026",
    status: { label: "Inadimplente", className: "pill-inativo" },
    contribution: "3 meses",
    contributionClass: "table-bad",
  },
  {
    initials: "CA",
    avatar: "red",
    name: "Cacau Angelina",
    email: "cacau@email.com",
    category: { label: "Efetivo", className: "pill-efetivo" },
    ingresso: "Mar/2026",
    status: { label: "Ativo", className: "pill-ativo" },
    contribution: "Em dia",
    contributionClass: "table-good",
  },
];

export const secretarias = [
  { icon: "🧭", iconClass: "sec-icon-primary", name: "Direção Geral", coord: "Marcos e Ana Luísa" },
  { icon: "🫂", iconClass: "sec-icon-secondary", name: "Secretaria de Acolhimento", coord: "Angelina, Rosângela e Cacau" },
  { icon: "📖", iconClass: "sec-icon-accent", name: "Secretaria de Formação", coord: "Coordenação de Formação" },
  { icon: "🎭", iconClass: "sec-icon-destructive", name: "Secretaria de Cultura", coord: "Área Cultural" },
  { icon: "🤝", iconClass: "sec-icon-mint", name: "Secretaria Social", coord: "Projetos e Ação Social" },
  { icon: "🕊️", iconClass: "sec-icon-plum", name: "Secretaria Mediúnica", coord: "Roberta e Clarissa" },
  { icon: "🏗️", iconClass: "sec-icon-slate", name: "Secretaria de Infraestrutura", coord: "Luciano, Glebe e Diba" },
  { icon: "💰", iconClass: "sec-icon-emerald", name: "Secretaria Financeira", coord: "Lídia, Reginaldo e Gilmar" },
  { icon: "📣", iconClass: "sec-icon-sky", name: "Secretaria de Comunicação", coord: "Thiago e Glebe Jr." },
];

export const siteSections = [
  { step: "01", tone: "step-primary", title: "Hero", text: "Tela cheia • Logo • Tagline • CTA • Vídeo/imagem de fundo" },
  { step: "02", tone: "step-secondary", title: "Quem Somos", text: "História • Missão • Valores • Foto da sede" },
  { step: "03", tone: "step-accent", title: "Nossa Casa", text: "Cards das Secretarias com ícones animados" },
  { step: "04", tone: "step-primary", title: "Atividades", text: "Reuniões, passes, evangelização, cursos — ícones animados" },
  { step: "05", tone: "step-secondary", title: "Agenda", text: "Calendário público • Próximos eventos em destaque" },
  {
    step: "06",
    tone: "step-accent",
    title: "Cursos & Formação",
    text: "ESDE, Diálogo Fraterno, Evangelização — link para formacao.lardeseuluiz.br",
  },
  { step: "07", tone: "step-destructive", title: "Projetos Sociais", text: "Feijoada beneficente, ações sociais — galeria com resultados" },
  { step: "08", tone: "step-primary", title: "Transparência", text: "Balancetes aprovados, atas públicas, prestação de contas" },
  { step: "09", tone: "step-secondary", title: "Seja Voluntário", text: "Processo de Chamamento • Etapas • Formulário de interesse" },
  { step: "10", tone: "step-accent", title: "Contato", text: "Mapa • Endereço • WhatsApp • Redes sociais" },
];

export const spacingScale = [
  { label: "--s1", value: "4px", width: 4 },
  { label: "--s2", value: "8px", width: 8 },
  { label: "--s3", value: "12px", width: 12 },
  { label: "--s4", value: "16px", width: 16 },
  { label: "--s6", value: "24px", width: 24 },
  { label: "--s8", value: "32px", width: 32 },
  { label: "--s12", value: "48px", width: 48 },
  { label: "--s16", value: "64px", width: 64 },
];

export const radiusScale = [
  { label: "--r-sm: 6px — Inputs, badges", className: "radius-sm" },
  { label: "--r-md: 12px — Alerts, tabelas", className: "radius-md" },
  { label: "--r-lg: 20px — Cards", className: "radius-lg" },
  { label: "--r-xl: 32px — Hero, painéis", className: "radius-xl" },
  { label: "--r-full — Pills, avatares", className: "radius-full" },
];
