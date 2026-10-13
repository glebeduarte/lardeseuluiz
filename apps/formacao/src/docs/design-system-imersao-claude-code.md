# Design System — Imersão Claude Code
## Análise completa + Modelo de Publicação de Tutorial

> Fonte analisada: [claudecode.escoladeautomacao.com.br](https://claudecode.escoladeautomacao.com.br)
> Data da análise: 25/03/2026

---

## 1. Tokens de Design (Variáveis CSS)

### Paleta de Cores

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#E8E4DC` | Fundo principal (bege/areia quente) |
| `--bg-alt` | `#F5F2ED` | Fundo alternativo — cards, sidebar |
| `--card` | `#D8D4CC` | Fundo de cards secundários e toggles |
| `--accent` | `#FF4D00` | Laranja-vermelho — única cor de ação |
| `--accent-hover` | `#E64500` | Estado hover do accent |
| `--text-pri` | `#1A1A1A` | Texto principal |
| `--text-sec` | `rgba(0,0,0,0.65)` | Texto secundário |
| `--text-ter` | `rgba(0,0,0,0.50)` | Texto terciário |
| `--text-ghost` | `rgba(0,0,0,0.30)` | Rótulos e metadados apagados |
| `--border` | `rgba(0,0,0,0.10)` | Bordas suaves |
| `--border-strong` | `rgba(0,0,0,0.20)` | Bordas com mais contraste |

### Tipografia

| Elemento | Tamanho | Peso | Outros |
|---|---|---|---|
| Família | Inter, sans-serif | — | Google Fonts |
| Kicker (supratítulo) | 10px | 700 | UPPERCASE, tracking 4px, cor accent |
| Título H1 (section-title) | 48px | 900 | tracking -1px |
| Subtítulo (section-subtitle) | 22px | 700 | UPPERCASE, cor text-sec |
| H2 (seções de conteúdo) | 22px | 800 | margin-top 40px |
| H3 | 17px | 700 | margin-top 28px |
| Corpo | 16px | 400 | — |
| Badges / metadados | 9–10px | 700 | tracking 0.5–3px |
| Botão primário | 13px | 700 | — |

### Espaçamento e Forma

| Token | Valor | Uso |
|---|---|---|
| `--radius` | `12px` | Raio padrão — cards, callouts, toggles |
| `--radius-sm` | `8px` | Raio menor |
| `--radius-pill` | `100px` | Badges e botões em pílula |
| `--max-w` | `min(720px, 90vw)` | Largura máxima do conteúdo |
| `--safe` | `clamp(16px, 5vw, 40px)` | Padding lateral seguro |
| Padding main | `40px 64px 100px` | Área de conteúdo principal |
| Padding header | `0 64px` | Barra superior |

---

## 2. Hierarquia da Informação

A estrutura segue 4 níveis hierárquicos claros:

```
NÍVEL 0 — Macro-navegação (Dias)
  Header com toggle: INÍCIO · DIA 1 · DIA 2

NÍVEL 1 — Módulo (Grupo/Dia)
  Sidebar label: "DIA 1 — SEU NOVO PARCEIRO" (uppercase ghost)

NÍVEL 2 — Lição/Bloco
  Sidebar item: "01 · O que é o Claude?" + badge de tempo

NÍVEL 3 — Conteúdo Interno
  Kicker → Título → Subtítulo → Tempo → HR → Seções H2/H3
```

---

## 3. Anatomia dos Componentes

### Badges / Rótulos

| Classe | Visual | Uso |
|---|---|---|
| `.badge` | Pill laranja sólido, 10px 700 | Tags de categoria |
| `.badge-time` | Pill neutro bg 6%, 10px 600 | Duração estimada da lição |
| `.badge-outline` | Pill só com borda 20%, 10px | Tags de metadados |

### Callouts (caixas de destaque)

| Classe | Background | Borda | Uso |
|---|---|---|---|
| `.callout-tip` | ciano 8% | ciano 20% | Dicas e informações de suporte |
| `.callout-exercise` | verde 8% | verde 20% | Exercícios práticos obrigatórios |
| `.callout-warn` | laranja 8% | laranja 20% | Avisos e alertas críticos |

Todos os callouts: radius 12px, padding 16px 20px, font-size 14px

### Cards

| Classe | Visual | Uso |
|---|---|---|
| `.card` | bg #F5F2ED, radius 12px, padding 20px | Conceitos, comparações |
| `.card.card-accent` | + border-left 4px sólido laranja | Destaque de conceito principal |

### Blocos de Código e Prompt

| Classe | Visual | Uso |
|---|---|---|
| `.prompt-block` | bg alt, border-left 4px laranja, monospace | Prompts prontos para copiar |
| `.code-block` | bg #1A1A1A (dark), radius 12px | Código técnico com botão "Copiar" |

### Navegação e Interação

| Classe | Visual | Uso |
|---|---|---|
| `.skills-ecosystem-tag` | bg card, borda 20%, radius 6px, padding 6px 12px | Tags de ferramentas/integrações |
| `.toggle` | details/summary, bg card, radius 12px | Conteúdo colapsável opcional |
| `.checklist` | Checkbox laranja, texto riscado quando marcado | Lista de pré-requisitos |
| `.nav-btn-next` | bg accent, branco, 13px 700 | Botão de próxima aula |
| `.nav-btn-prev` | bg card, escuro, 13px 700 | Botão de aula anterior |

---

## 4. Layout Estrutural

```
┌────────────────────────────────────────────────────┐
│ HEADER sticky  (bg #E8E4DC, padding 0 64px)        │
│  Logo  ·  Breadcrumb  ·  [INÍCIO] [DIA 1] [DIA 2] │
├────────────────────────────────────────────────────┤
│ PROGRESS BAR  (dots por bloco, fill laranja)       │
├────────────────┬───────────────────────────────────┤
│ SIDEBAR        │  MAIN CONTENT                     │
│ 300px fixed    │  margin-left: 300px               │
│ bg #F5F2ED     │  padding: 40px 64px 100px         │
│                │                                   │
│ • Brand logo   │  [KICKER]  Dia 1 · Bloco 1        │
│                │  [TÍTULO]  Nome da Lição.          │
│ DIA 1 —        │  [SUBTÍTULO]  FRASE OBJETIVO      │
│  01 Bloco 1    │  [BADGE TEMPO]  ─────────────     │
│  02 Bloco 2    │                                   │
│  03 Bloco 3    │  H2 ──────────────────────────    │
│  FAQ Consulta  │  parágrafo com negrito-chave...   │
│                │  [CALLOUT / CARD / TABLE]         │
│ DIA 2 —        │                                   │
│  06 Bloco 1    │  H2 (passo N) ─────────────────   │
│  07 Bloco 2    │  parágrafo + ol numerado          │
│  ...           │  [CODE BLOCK / PROMPT BLOCK]      │
│  Bônus  Extra  │  [TOGGLE / CHECKLIST]             │
├────────────────┴───────────────────────────────────┤
│ FOOTER NAV  [← Anterior]  1 / 6  [Próximo →]      │
└────────────────────────────────────────────────────┘
```

### Sidebar — Detalhes de Estilo

- **Item ativo:** bg accent 6%, border-left 3px sólido laranja
- **Grupo title:** ghost 30%, 9px, 700, UPPERCASE, tracking 3px
- **Número do item:** ghost 30%, 10px, 700
- **Badge de tempo:** ghost 30%, 9px, 600, tracking 0.5px
- **Separação visual:** apenas espaçamento, sem linhas divisórias

---

## 5. Modelo de Publicação de Tutorial

### 5.1 Cabeçalho da Lição (sempre nesta ordem)

```html
<div class="section-kicker">MÓDULO 1 · LIÇÃO 3</div>
<!-- 10px, 700, laranja #FF4D00, tracking 4px, UPPERCASE  -->
<!-- Padrão: "[MÓDULO/DIA] · [BLOCO/LIÇÃO] [nº]"          -->

<div class="section-title">Nome da Lição.</div>
<!-- 48px, 900, tracking -1px — impactante, direto         -->
<!-- Ponto final opcional, sem pontuação formal            -->

<div class="section-subtitle">FRASE QUE CONTEXTUALIZA O OBJETIVO</div>
<!-- 22px, 700, uppercase, cor text-sec                    -->
<!-- Padrão: benefício ou contexto em uma linha            -->

<span class="badge badge-time">30 minutos</span>
<!-- Sempre incluir estimativa de tempo                    -->

<hr>
<!-- Divisor com traço laranja após o cabeçalho            -->
```

### 5.2 Bloco de Conceito Central

```html
<h2>Nome do Conceito</h2>
<!-- 22px, 800, margin-top 40px — cada H2 é um sub-tópico -->

<p>Parágrafo introdutório com <strong>termo-chave em negrito</strong> —
explicação direta. Segunda frase complementando.
<strong>Conclusão em negrito</strong> para fixar a ideia.</p>
```

### 5.3 Tabela Comparativa

```html
<!-- Usar quando há múltiplas variações/opções para comparar -->
<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>COLUNA A</th>
        <th>COLUNA B</th>
        <th>PARA QUEM</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Rótulo</strong></td>
        <td>Descrição da função</td>
        <td>Contexto de uso</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 5.4 Callouts

```html
<!-- DICA — informação de suporte, não bloqueante -->
<div class="callout callout-tip">
  <strong>💡 DICA</strong>
  <p>Informação complementar que ajuda a entender o contexto,
  mas que o aluno não precisa memorizar agora.</p>
</div>

<!-- AVISO — atenção antes de executar -->
<div class="callout callout-warn">
  <strong>⚠️ ATENÇÃO</strong>
  <p>Aviso crítico sobre algo que pode dar errado ou que
  exige um pré-requisito específico antes de continuar.</p>
</div>

<!-- EXERCÍCIO — ação imediata e obrigatória -->
<div class="callout callout-exercise">
  <strong>🎯 EXERCÍCIO AO VIVO</strong>
  <p>Instrução clara do que fazer agora. Inclua
  <strong>onde</strong> (ferramenta), <strong>o que</strong> fazer
  e o <strong>resultado esperado</strong> ao final.</p>
</div>
```

### 5.5 Card de Conceito-Chave

```html
<div class="card card-accent">
  <h3>Nome do Conceito-Chave</h3>
  <p><strong>Em resumo:</strong> Uma frase com a essência.</p>
  <p><strong>Por quê:</strong> Duas frases explicando a lógica.</p>
  <p><strong>Na prática:</strong> O que isso muda para o aluno.</p>
</div>
```

### 5.6 Passo a Passo Numerado

```html
<h2>Passo 1: Nome da Etapa</h2>
<p>Contexto da etapa em uma frase curta.</p>
<ol>
  <li>Ação 1 — acesse <strong>Menu > Opção</strong></li>
  <li>Ação 2 — clique em <strong>"Criar novo"</strong></li>
  <li>Ação 3 — nomeie como <strong>"Meu Projeto"</strong></li>
  <li>Resultado esperado ao concluir esta etapa</li>
</ol>

<div class="callout callout-tip">
  <strong>💡 RESULTADO ESPERADO</strong>
  <p>Descreva o que o aluno deve ver na tela ao concluir
  o passo acima, para que possa confirmar que deu certo.</p>
</div>
```

### 5.7 Prompt / Habilidade (texto para copiar)

```html
<!-- border-left laranja, bg escuro, monospace -->
<div class="prompt-block">
  <button class="code-block-copy">COPIAR</button>
  Você é meu assistente especializado em [área].
  Sua função é [tarefa específica].
  Quando eu [gatilho ou pedido], você deve [ação detalhada].
  Formato da resposta: [formato esperado].
</div>
```

### 5.8 Bloco de Código Técnico

```html
<!-- bg #1A1A1A dark, radius 12px, botão copiar -->
<div class="code-block">
  <span class="code-block-label">terminal</span>
  <button class="code-block-copy">COPIAR</button>
  <code class="code-text">
    npm install nome-do-pacote
  </code>
</div>
```

### 5.9 Tags de Ecossistema

```html
<p>Ferramentas compatíveis:</p>
<div class="skills-ecosystem">
  <span class="skills-ecosystem-tag">Ferramenta A</span>
  <span class="skills-ecosystem-tag">Ferramenta B</span>
  <span class="skills-ecosystem-tag">Ferramenta C</span>
  <span class="skills-ecosystem-tag">+ mais 5</span>
</div>
```

### 5.10 Toggle — Conteúdo Colapsável

```html
<!-- Para conteúdo avançado ou alternativo opcional -->
<details class="toggle">
  <summary>📌 TÍTULO DO CONTEÚDO OPCIONAL</summary>
  <div class="toggle-content">
    <p>Conteúdo avançado que não bloqueia o fluxo principal,
    mas está disponível para quem quiser se aprofundar.</p>
  </div>
</details>
```

### 5.11 Checklist de Pré-requisitos

```html
<ul class="checklist">
  <li class="checked">
    <span class="checklist-box"></span>
    <span class="checklist-text">
      <strong>Item já concluído</strong> — descrição do que foi feito
    </span>
  </li>
  <li>
    <span class="checklist-box"></span>
    <span class="checklist-text">
      <strong>Item pendente</strong> — instrução do que fazer agora
    </span>
  </li>
</ul>
```

---

## 6. Regras de Uso do Padrão

### Hierarquia de callouts por urgência

1. `callout-warn` (laranja) — usar primeiro, se há risco de erro
2. `callout-exercise` (verde) — exercício prático obrigatório
3. `callout-tip` (ciano) — informação complementar opcional

### Cards vs. Callouts

- **Card** com `card-accent`: comparações duais ("X vs. Y"), conceitos estruturados com título próprio e múltiplos parágrafos
- **Callout**: mensagens diretas ao aluno — avisos, dicas, ações imediatas — sem título H3

### Sequência obrigatória do cabeçalho

```
[KICKER laranja uppercase]
  → [TÍTULO 48px bold]
    → [SUBTÍTULO uppercase]
      → [BADGE TEMPO]
        → [HR laranja]
```

### Estrutura interna recomendada por bloco (máx. 45 min)

```
1. Intro conceitual        → 1 H2 + parágrafo(s)
2. Referência visual       → tabela OU card
3. Contexto/aviso          → callout-warn ou callout-tip
4. Passo a passo           → H2 numerados + <ol>
5. Prompt ou código        → prompt-block ou code-block
6. Exercício ao vivo       → callout-exercise
7. Conteúdo extra          → toggle (opcional)
```

### Nomenclatura da sidebar

- **Grupos:** `"DIA N — NOME DO MÓDULO"` — ghost 30%, uppercase, tracking 3px
- **Itens numerados:** `"NN · Nome Curto"` + badge (`"30 min"`, `"Consulta"`, `"Extra"`)

### Princípios visuais centrais

1. **Uma cor de ação** — apenas `#FF4D00` como cor de destaque; nunca usar outras cores para ênfase
2. **Tipografia como hierarquia** — peso e tamanho substituem cor para guiar o olhar
3. **Componentes funcionais** — cada bloco tem papel comunicativo preciso, nunca decorativo
4. **Economia visual** — fundo neutro bege/areia cria contraste suave; o accent só aparece onde precisa chamar atenção
5. **Progresso visível** — barra de progresso por dots + sidebar com item ativo deixam o aluno sempre orientado

---

*Análise gerada por Claude — Escola de Automação — Imersão Claude Code*
