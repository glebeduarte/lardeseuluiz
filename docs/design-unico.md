# Padrão visual único da plataforma

Governança, Formação e Atendimento seguem o mesmo padrão, que é o da Governança.

## Moldura (já pronta, não reimplementar)

- `compartilhado/design` é a fonte única. Cada app recebe uma cópia em `src/compartilhado` (gerada por `npm run sincronizar` e no build). Não edite as cópias.
- `MolduraSistema`: barra de sistemas no topo (Site, Governança, Formação, Atendimento, Meu perfil), barra lateral azul `#003c7f` e o conteúdo com largura máxima de 1152px e respiro de 32px (16px no celular).
  - Governança: `apps/site/src/components/app/AppLayout.tsx`.
  - Formação: `apps/formacao/src/components/layout/DashboardLayout.tsx` (aceita `larguraTotal` para telas como o player da aula).
  - Atendimento: `apps/atendimento/src/components/AppLayout.tsx` (aplicado pelo `RequireAuth`).
- `CabecalhoPagina` (de `@/compartilhado`): título em Playfair, descrição em cinza, ações à direita e o link "voltar" opcional. Toda página interna começa por ele. Na Formação, `PageHero` já usa esse cabeçalho.

## Regras das páginas internas

1. **Estrutura**: `<CabecalhoPagina .../>` seguido de `<div className="space-y-6">…</div>`. Não use moldura própria, `min-h-screen`, padding externo nem faixas com gradiente no topo: a moldura já cuida disso.
2. **Cores**: só os tokens.
   - `primary` é o azul `#0059b1`.
   - `accent` e `secondary` são o dourado `#ffc116`.
   - Use também `muted`, `destructive`, `border`, `card` e `background`.
   - Paleta de situação, em badges `variant="outline"`:
     - ok / ativo: `bg-emerald-100 text-emerald-800 border-emerald-300`;
     - pendente: `bg-amber-100 text-amber-800 border-amber-300`;
     - informação: `bg-sky-100 text-sky-800 border-sky-300`;
     - encerrado: `bg-muted text-muted-foreground border-border`;
     - erro: `destructive`.
   - Nada de hex fixo, teal ou gradiente decorativo. A exceção é um dado do usuário, como a cor de uma maca.
   - `bg-secondary` agora é dourado. Para fundo neutro use `bg-muted`, e para botão secundário use `variant="outline"`.
3. **Tipografia**:
   - Títulos (h1, h2, h3) em Playfair. Os `CardTitle` levam `className="font-['Playfair_Display'] text-lg"`.
   - Corpo em Inter, 14px (`text-sm`), com texto auxiliar em `text-xs text-muted-foreground`.
4. **Cartões**: `Card` do shadcn, com borda e fundo branco. Para números, use o cartão de indicador: quadrado de 44px com `background: hsl(var(--primary) / 0.1)` e ícone azul, o número em `text-2xl font-bold` e o rótulo em `text-xs text-muted-foreground`.
5. **Tabelas**: `<div className="rounded-lg border bg-card overflow-x-auto"><Table>…</Table></div>`. Ações de linha com `Button variant="ghost" size="icon"`. Vazio e carregando aparecem numa linha centralizada em `text-muted-foreground py-8`.
6. **Abas, formulários e janelas**:
   - Abas com `Tabs` do shadcn.
   - Campos com `Label` e `Input`/`Select`/`Textarea` em `grid gap-2`, organizados em grades `grid-cols-2 gap-3`.
   - Janelas com `Dialog` e `DialogFooter` (Cancelar em outline, Salvar em primary).
7. **Botões**: ação principal em `Button` (azul), secundárias em `variant="outline"`, perigo em `destructive`. Ícone de 16px com `mr-2`.
8. **Celular**: funciona em 375px, sem rolagem horizontal da página. Tabelas largas rolam dentro do próprio contêiner.
9. **Páginas fora da moldura** (login, cadastro, senha, inscrições públicas, confirmação de presença):
   - fundo `bg-background`;
   - cartão branco centralizado (`max-w-md`, `rounded-2xl`, `border`, sombra leve);
   - logo do Lar de Seu Luiz no topo do cartão;
   - título em Playfair;
   - mesmos botões e campos.

Referências prontas na Governança:
- `apps/site/src/pages/Projetos.tsx`;
- `apps/site/src/pages/acoes/AcoesSociais.tsx`;
- `apps/site/src/pages/acoes/AcaoDetalhe.tsx`;
- `apps/site/src/pages/acoes/EdicaoDetalhe.tsx`;
- `apps/site/src/pages/Login.tsx`.

## O que não muda

- Lógica: consultas, mutações, handlers, rotas, estados, validações e permissões.
- Os textos e recursos de cada tela. Só muda a apresentação.
- Textos novos em português, sem travessão.
