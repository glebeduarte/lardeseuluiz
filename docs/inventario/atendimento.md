# Inventário: "Sistema de atendimento - LSL" (Lovable)

Project ID ff9b7e76-6d4b-4aba-8880-0b0c29116f6f · Supabase `erfhtqlxyjaaxkfgmzgz` · publicado (audiência pública) · última edição em 08/10/2026 · commit 552e165.
Nome na interface: "Sistema de Macas / Sistema de Controle de Macas", v1.7.0. Stack: TanStack Start (React, SSR em Cloudflare Workers via wrangler), Supabase (Auth + Postgres), shadcn/ui. Base de conhecimento do projeto no Lovable: vazia.
Levantamento feito só com leitura (SELECT e leitura de arquivos). Nada foi alterado e nenhuma mensagem foi enviada ao agente do Lovable.

---

## 1. Rotas e telas

Roteamento por arquivos em `src/routes/` (TanStack Router). O guard é o componente `RequireAuth` (com `roles` e `denyRoles` opcionais). Quem está logado mas não tem papel vê a tela "Cadastro recebido" e não acessa nada. Se `must_change_password` estiver ativo, o usuário é forçado para `/trocar-senha`. Um perfil com `ativo=false` é deslogado.

| Rota | O que faz | Acesso |
|---|---|---|
| `/login` | Login por e-mail e senha. **Mostra a senha padrão [senha padrão omitida] na tela** | Pública |
| `/cadastro` | "Solicitar acesso": cria o usuário no Auth com a senha padrão. Não atribui papel | Pública |
| `/recuperar-senha` · `/redefinir-senha` | Recuperação de senha por link do Supabase | Pública |
| `/recursos` | Página institucional com perfis e funcionalidades (tem SEO/OG) | Pública |
| `/trocar-senha` | Troca obrigatória no primeiro acesso | Logado |
| `/` | Início: saudação, indicador de "sessão em andamento"/próxima sessão, atalhos. Admin vê o AdminDashboard (`get_dashboard_stats`) | Logado com qualquer papel |
| `/recepcao` | Acolhimento: busca de consulente por nome ou telefone, grade de macas do dia (terça/sábado) com lotação, filtros interna/externa/com vaga | recepcao, dialogador, admin (médium bloqueado) |
| `/recepcao/maca/$id` | Lista da maca na sessão de hoje (somente leitura de presença) e "Atribuir consulente" | recepcao, dialogador, admin (médium bloqueado) |
| `/recepcao/imprimir` | **Ficha impressa A4**: folha 1 com ativos por maca (10 linhas cada, médiuns, marcadores [dist]/[trab]); folha 2 com inativos | recepcao, dialogador, admin (médium bloqueado) |
| `/dialogo/novo` | Novo Diálogo Fraterno: cadastra o consulente com a ficha completa | dialogador, admin |
| `/dialogo/$consulenteId/designar` | Designa o consulente para uma maca (filtra pela categoria indicada, valida lotação, permite somar ou trocar maca) | recepcao, admin |
| `/consulentes` | Lista com filtros e ordenação, prioriza "para você" e pendências de diálogo, reativação; quem tem alta fica arquivado | dialogador, admin |
| `/consulentes/$id` | Ficha completa, ciclo, histórico, observações, alta, encerramento, reativação; exclusão pelo admin. Médium vê versão reduzida (motivos, ciclo, observações) | dialogador, admin, medium |
| `/consulentes/$id/editar` | Edição da ficha | admin, dialogador |
| `/medium` | "Lançar sessão": o médium escolhe a data (pendentes primeiro) e depois a maca | medium, admin |
| `/medium/maca/$id?data=` | Chamada da maca: presente, falta, falta justificada, à distância; observação por sessão (rascunho em localStorage); prorrogar; encaminhar ao diálogo ou para alta; "marcar todos presentes"; tempo real | medium, admin |
| `/relatorios` | 8 abas: incompletos, ativos por maca, registros por maca, em +1 maca, trabalhadores, à distância, lotação, alertas sensíveis; exportação | admin, dialogador |
| `/admin/sessoes` | Atendimentos realizados: datas pendentes de lançamento, detalhe, edição de presença, edição ou exclusão de sessão | admin, medium (médium só tem o botão "Novo atendimento") |
| `/admin/macas` | Gestão de macas e vínculo de médiuns; cria usuário médium já vinculado | admin (pelo menu) |
| `/admin/usuarios` | Equipe: criar, importar planilha, papéis, ativar/desativar, remover, resetar senha para a padrão | admin (pelo menu) |
| `/admin/exportar` | Exporta tudo em .xlsx (6 abas). Exige justificativa e grava em auditoria | admin |

Admin real pode "Visualizar como" outro papel (simulação guardada em localStorage, com efeito só na interface).

## 2. Papéis e permissões

- **Enum `app_role`**: `recepcao` (rótulo "Acolhimento"), `dialogador`, `admin`, `medium`.
- **Tabela `user_roles`** (user_id, role): um usuário pode ter vários papéis.
- **Funções SQL (SECURITY DEFINER)**: `has_role(uid, role)`, `has_any_role(uid)`, `is_admin`, `is_dialogador_or_admin`, `is_recepcao_or_dialog_or_admin`, `is_medium_of_maca`, `is_medium_of_designacao`, `is_medium_of_consulente_ativa`. As duas últimas existem mas **não são usadas nas policies**.
- **Front**: `useAuth` deriva isAdmin/isDialogador/isRecepcao/isMedium (admin herda todos). `RequireAuth` com roles/denyRoles.
- **Server functions** (`usuarios.functions.ts`, `macas.functions.ts`): usam a service role, verificam `is_admin` por RPC e fazem criar, importar, remover, ativar/desativar usuário, resetar senha e criar médium. `cadastroPublico` **não exige login**.
- **Vínculo médium e maca**: tabela `maca_mediuns`. Hoje são 40 médiuns vinculados.

| Papel | Usuários |
|---|---|
| medium | 40 |
| dialogador | 13 |
| recepcao | 10 |
| admin | 4 |
| sem papel | 1 |
| **Total** | 49 usuários no Auth e em profiles, 67 linhas de papel, 13 com mais de um papel |

Outros números: 1 perfil inativo; 6 ainda com `must_change_password`.

## 3. Banco (schema public)

### Tabelas

| Tabela | Linhas | Colunas principais (! = NOT NULL) | FKs |
|---|---|---|---|
| `consulentes` | 223 | id!, nome!, data_nascimento, telefone, data_dialogo, dialogador_id, frequencia! (semanal/quinzenal), trabalhador!, tratamento_distancia!, dialogo_pendente!, alta_at, alta_by, created_at!; ficha: conhece_doutrina, evangelho_no_lar, pratica_religiosa(+descrição), motivo_saude_fisica/mental/espiritual (+especificação, diagnóstico, tratamento e obs), motivo_conflitos_familiares, uso_medicacoes(+espec.), uso_drogas, uso_alcool, uso_cigarro, conflito_genero, ideias_suicidas, ideacao_criminosa, encaminhamento_passes(+qtd), encaminhamento_maca(+categoria interna/externa), indicacao_saude(+texto), indicacao_chakras, indicacao_harmonizacao, indicacao_mediunidade, indicacao_desobsessao_leve, indicacao_desobsessao, outras_informacoes | nenhuma declarada (dialogador_id e alta_by apontam para usuários sem FK) |
| `designacoes` | 247 | id!, consulente_id!, maca_id!, dialogador_id, status! (enum), sessoes_realizadas!, sessoes_totais! (padrão 8), observacoes, created_at!, closed_at, closure_reason, reactivated_at, reactivated_by | consulente_id → consulentes (CASCADE); maca_id → macas (NO ACTION) |
| `presencas` | 1.039 | id!, designacao_id!, sessao_id!, status! (enum), observacao, created_by, updated_by, created_at!, updated_at, admin_editado! | designacao_id → designacoes (CASCADE); sessao_id → sessoes (CASCADE). Único (designacao_id, sessao_id) via upsert |
| `sessoes` | 22 | id!, data!, tipo! (terca/sabado), created_by, updated_by, admin_editado! | nenhuma |
| `macas` | 20 | id!, numero!, nome!, cor_hex!, dia! (enum), categoria! (interna/externa), lotacao_max! (10), ativa!, finalidade, mediuns text[]! (legado) | nenhuma |
| `maca_mediuns` | 56 | id!, maca_id!, user_id! | maca_id → macas (CASCADE) |
| `consulente_observacoes` | 18 | id!, consulente_id!, autor_id, conteudo!, created_at!, updated_at! | consulente_id → consulentes (CASCADE) |
| `profiles` | 49 | id! (= auth.users.id), nome!, email!, telefone, data_nascimento, como_chamar, ativo!, must_change_password! | nenhuma |
| `user_roles` | 67 | id!, user_id!, role! (app_role) | nenhuma |
| `auditoria_acoes` | 4 | id!, actor_id, acao!, alvo, justificativa, detalhe jsonb!, created_at! | nenhuma |

### Enums

| Enum | Valores |
|---|---|
| `app_role` | recepcao, dialogador, admin, medium |
| `designacao_status` | ativa, concluida, cancelada |
| `presenca_status` | presente, ausente, emergencia (legado, sem uso na interface atual), falta_justificada, atendimento_distancia |
| `dia_trabalho` / `sessao_tipo` | terca, sabado |

### Funções e triggers relevantes

| Trigger (tabela) | Função | Regra |
|---|---|---|
| `trg_valida_sessao_data` (sessoes) | `fn_valida_sessao_data` | Só aceita terça ou sábado e define o `tipo` |
| `trg_valida_lotacao_maca` (designacoes) | `fn_valida_lotacao_maca` | Bloqueia designação ativa acima de `lotacao_max` (padrão 10) |
| `trg_atualiza_sessoes` e `trg_atualiza_sessoes_realizadas` (presencas, **duplicados**) | `fn_atualiza_sessoes_realizadas` | Conta presente + à distância desde a reativação. Ao atingir `sessoes_totais` (padrão 8), a designação vira `concluida` e o consulente fica com `dialogo_pendente=true` |
| `trg_inativa_por_faltas_consecutivas` (presencas) | `fn_inativa_por_faltas_consecutivas` | 2 faltas seguidas ou 4 faltas justificadas: designação `cancelada` com closure_reason `falta` e `dialogo_pendente=true` |
| triggers de created_by/updated_by (presencas, sessoes, observações) | `fn_set_created_by`, `fn_*_set_updated` | Carimbo de autoria e data |
| `on_auth_user_created` (auth.users) | `handle_new_user` | Cria ou atualiza o profile a partir do user_metadata |

Função avulsa: `get_dashboard_stats()` (macas ativas, consulentes, consulentes em macas, médiuns).

Também presentes no banco:
- **Extensões**: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault. Sem pg_cron.
- **Storage**: 0 buckets.
- **Edge functions**: não há pasta `supabase/functions`. A lógica de servidor fica em server functions do TanStack Start (`src/lib/*.functions.ts`).
- **Migrations**: 43, de 23/05/2026 a 08/09/2026.

## 4. Fluxo de atendimento

1. **Diálogo Fraterno** (dialogador): cadastra o consulente com a ficha (motivos, hábitos, alertas, indicações). Define encaminhamento para passes (com quantidade) e/ou maca (categoria **interna** = saúde, **externa**), frequência **semanal ou quinzenal**, e marca **trabalhador** ou **tratamento à distância**.
2. **Designação** (acolhimento ou admin): escolhe a maca do dia (terça ou sábado) filtrando pela categoria indicada. A lotação é validada no banco. O consulente pode estar em mais de uma maca ("adicionar") ou trocar de maca (a anterior é encerrada como `transferencia`/`troca_maca`). Ao designar, `dialogo_pendente=false`.
3. **Acolhimento no dia**: confere o nome, entrega a ficha por ordem de chegada e imprime a lista por maca. Não registra presença.
4. **Lançamento pelo médium**: na data válida do calendário marca presente, falta, falta justificada ou à distância, e escreve uma observação por sessão (pede confirmação se estiver vazia). O quinzenal só é esperado a cada 2 datas válidas a partir da base. Na última sessão prevista, escolhe entre **dar alta** e **prorrogar N atendimentos**.
5. **Regras automáticas** (triggers): fim do ciclo (8 por padrão) → `concluida` e retorno ao diálogo; 2 faltas seguidas ou 4 justificadas → `cancelada` por falta e retorno ao diálogo.
6. **Encaminhamentos manuais do médium**: "ao diálogo" (`cancelada`/`encaminhamento_dialogo`) ou "para alta" (`concluida`/`alta`). Em ambos, `dialogo_pendente=true`.
7. **Alta**: o dialogador ou admin confirma "Dar Alta" (grava `alta_at` e `alta_by`). Quem tem alta fica arquivado na lista. O admin também pode encerrar sem alta, mudar status, reativar (zera a contagem a partir de `reactivated_at`) ou excluir o cadastro (cascata).
8. **Arquivamento visual**: uma designação encerrada some das listas da maca após 6 sessões do dia dela.
9. **Calendário**: datas fixas no código (`atendimento-dates.ts`). Terças semanais de 07/07 a 08/12/2026, importadas de calendario.lardeseuluiz.com.br, e sábados quinzenais de 11/07 a 12/12/2026. **Não há datas depois de dezembro de 2026.**

Volumes atuais:
- **Designações**: 104 ativas, 69 concluídas, 74 canceladas.
- **Motivos de encerramento**: alta 55, falta 42, encaminhamento_dialogo 21, transferência 8, troca_maca 1.
- **Consulentes**: 101 com maca ativa (3 em mais de uma), 27 nunca designados, 103 com `dialogo_pendente`, 0 com `alta_at` gravado.
- **Presenças**: presente 648, ausente 151, falta justificada 143, à distância 97. 359 têm observação.
- **Sessões**: 22 (14 terças, 8 sábados), de 07/07 a 06/10/2026.
- **Macas**: 20 ativas, todas com 10 vagas. Terça: 14 (10 internas, incluindo "Branca - Grávidas", e 4 externas). Sábado: 6 (5 internas, 1 externa).
- **sessoes_totais**: 221 designações com 8; as demais foram prorrogadas para 10 a 20.

## 5. Pessoas

| Entidade | Tabela | Identificação | Preenchimento | Volume |
|---|---|---|---|---|
| Consulentes (atendidos) | `consulentes` | nome, telefone, data_nascimento. **Sem e-mail e sem CPF** | telefone 192/223; nascimento 182/223; data_dialogo 218; dialogador 223 | 223 (32 trabalhadores, 17 à distância; 216 semanais, 7 quinzenais) |
| Equipe (médiuns, dialogadores, acolhimento, admin) | `profiles` + `auth.users` + `user_roles` | nome, e-mail, telefone, data_nascimento, como_chamar. Sem CPF | e-mail 49/49; telefone 49/49; nascimento 48/49; como_chamar 45/49 | 49 |
| Vínculo médium-maca | `maca_mediuns` (e `macas.mediuns`, legado) | user_id | 40 médiuns distintos | 56 |
| Autores | `presencas.created_by/updated_by`, `consulente_observacoes.autor_id`, `designacoes.dialogador_id`, `auditoria_acoes.actor_id` | uuid do usuário | n/a | n/a |

**Dados sensíveis (saúde, vida íntima, crença), todos em `consulentes`:**
- **Saúde**: motivo de saúde física (104), mental (48) e espiritual (55), com diagnóstico, tratamento e textos livres; uso de medicações; `indicacao_saude_texto`.
- **Alertas**: ideias suicidas (13), ideação criminosa (0), uso de drogas ou álcool (11), cigarro.
- **Vida íntima e crença**: conflito de gênero, conflitos familiares, prática religiosa (103) com descrição.
- **Indicações espirituais**: chakras, harmonização, mediunidade, desobsessão leve e desobsessão.
- **Textos livres**: `outras_informacoes` (127 preenchidos).

Também sensíveis:
- `presencas.observacao` (359 observações de atendimento escritas pelos médiuns).
- `consulente_observacoes.conteudo` (18).
- `designacoes.observacoes`.

## 6. Integrações, segredos e segurança

### Integrações e variáveis (só nomes)

- **Integrações**: Supabase (Auth, Postgres, Realtime em `presencas`); calendário oficial calendario.lardeseuluiz.com.br, só como fonte das datas, copiadas à mão para o código; Google Fonts (Inter); og:image hospedada em R2 do Lovable; biblioteca `xlsx` para exportar no navegador. Não há e-mail transacional, WhatsApp, pagamentos ou IA.
- **Variáveis e segredos referenciados**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`, os equivalentes `VITE_*`, `SUPABASE_SERVICE_ROLE_KEY` (só no servidor). O `.env` está versionado no repositório e contém apenas a chave anon/publishable.

### Pontos de segurança (RLS e aplicação)

1. **Senha padrão pública**: [senha padrão omitida] aparece na tela de login, no cadastro e no código. O reset em massa do admin volta todos para ela. Hoje 6 contas ainda estão com troca pendente, e quem souber o e-mail delas pode entrar.
2. **Cadastro aberto**: `cadastroPublico` cria usuário no Auth sem login, sem captcha e sem limite de tentativas, com e-mail já confirmado. Sem papel, a conta não lê dados, mas abre espaço para spam de contas.
3. **Leitura ampla de consulentes**: a policy de SELECT libera recepcao, dialogador, admin **e qualquer médium** para **todos** os 223 cadastros com todas as colunas sensíveis. RLS restringe linhas, não colunas. A promessa de "informações sensíveis com acesso restrito" em `/recursos` vale só para a interface. As funções `is_medium_of_consulente_ativa` e `is_medium_of_maca` existem e poderiam limitar isso.
4. **Escrita ampla**: médium pode fazer UPDATE em qualquer consulente e designação (não só da própria maca) e INSERT de consulente e designação. Recepção também insere consulentes.
5. **`presencas`, `sessoes` e `maca_mediuns`**: leitura liberada a qualquer usuário com papel, incluindo as observações dos médiuns. Qualquer papel pode inserir sessão.
6. **`profiles`**: qualquer usuário com papel lê e-mail, telefone e nascimento de toda a equipe.
7. **Exclusão em cascata**: o admin apaga o consulente e todo o histórico some (designações, presenças, observações). Não existe soft delete.
8. **Policies e triggers duplicados**: há policies repetidas em presencas e sessoes, e o trigger de contagem roda duas vezes por presença.
9. **Auditoria parcial**: só registra concessão de papel e exportação (4 registros até agora). Visualização de fichas sensíveis não é auditada.
10. **Simulação de papel**: só afeta a interface, as permissões no banco continuam as do admin.

## 7. O que pode ir para o site e ligações com outros sistemas

**Pode ser público (não é dado pessoal):**
- Dias e regime de atendimento: atendimento ao público às **terças (semanal)** e **sábados (quinzenal)**, mais o calendário de datas.
- Tipos de atendimento:
  - **Diálogo Fraterno**: acolhimento e triagem.
  - **Passes**.
  - **Tratamento em maca**, interna (saúde) ou externa, com maca dedicada a gestantes ("Branca - Grávidas").
  - **Tratamento à distância**.
  - Ciclo padrão de **8 sessões**, prorrogável, com alta ao final.
  - Indicações possíveis: harmonização, chakras, desobsessão, educação mediúnica.
- Orientações ao público: ausências seguidas encerram o ciclo e exigem novo diálogo; evangelho no lar.
- Página `/recursos`: já é pública e descreve o sistema e os perfis.
- Não há horários (hora do dia) no sistema, só datas.

**Ligações com outros sistemas:**
- **Calendário oficial** (calendario.lardeseuluiz.com.br): fonte das datas. Hoje é cópia manual, então seria bom integrar ou centralizar, já que o código só tem datas até 12/12/2026.
- **Formação e voluntariado**:
  - Os papéis (médium, dialogador, acolhimento) correspondem a funções de voluntário. O cadastro de equipe (`profiles`) se sobrepõe a um eventual sistema de voluntariado ou formação.
  - Não há campo de curso, formação ou habilitação.
  - O campo `trabalhador` marca consulentes que são trabalhadores da casa, ligação natural com a base de voluntários.
  - `indicacao_mediunidade` sugere encaminhamento para estudo ou educação mediúnica, ou seja, uma ponte com cursos.
- **Governança**:
  - Não há menção a estatuto, assembleia, diretoria ou LGPD no código.
  - A exportação com justificativa e a auditoria são o único controle formal.
  - Nomenclatura: o sistema usa "Centro **Espiritualista** Lar de Seu Luiz"; conferir com o vocabulário institucional.
- **Links externos no app**: nenhum, além das fontes e da og:image.
