# Inventário: Área de Formação LSL (Lovable)

Projeto: "Área de Formação - LSL" (`37895857-1695-48ec-af40-1b53550d70f2`), publicado em formacao.lardeseuluiz.com.br (também responde em formacaolsl.lovable.app). Última edição: 08/10/2026. Stack: React + Vite + React Router + shadcn, backend Lovable Cloud (Supabase `ffzchmpezpamxiglpwug`). Project Knowledge vazio. Levantamento feito só com leitura (arquivos + SELECT). Nenhuma alteração.

---

## 1. Rotas e telas

Guard único: `ProtectedRoute`, que só exige sessão (redireciona para `/auth`). Não existe guard de papel no roteador. As páginas admin conferem `isAdmin` por conta própria (ex.: AdminDashboard redireciona para `/dashboard`), e quem barra os dados de verdade é a RLS. Globais: `IncompleteProfileModal` (cobra dados de perfil faltando) e `ForcePasswordChangeGuard` (força troca de senha quando `must_change_password`).

**Públicas**
| Rota | Função |
|---|---|
| `/` | Landing ("Acessar Plataforma" / "Já tenho conta") |
| `/auth`, `/forgot-password`, `/reset-password` | Login, cadastro, recuperação de senha |
| `/inscricao/esde` | Inscrição no ESDE I (cria conta e matrícula; mostra "encerradas" quando `enrollment_open=false`). O ID do curso está fixo no código |
| `/inscricao/dialogo-fraterno` | Inscrição no curso Diálogo Fraterno |
| `/inscricao/curso/:id` | Inscrição genérica por curso (`registration_page_enabled`) |
| `/inscricao/p/:slug` | Página de inscrição configurável (`registration_pages`): cria conta, matricula em N cursos, mostra link do grupo de WhatsApp |
| `/esde/calendario`, `/esde/calendario/:code` | Calendário público do ESDE I/II (tabela `esde_calendar_entries`) com exportação em PDF |
| `/presenca/:token` | Confirmação de presença por link temporário (só pede e-mail), depois redireciona ao Google Meet |
| `/biblioteca` | Catálogo de livros (público) |

**Logadas (qualquer papel)**
`/welcome` (onboarding), `/dashboard` (meus cursos), `/explore` (catálogo interno e pedido de matrícula), `/course/:id`, `/lesson/:id` (vídeo, embed, anexos, marcar concluída, avaliações), `/my-account`, `/minha-frequencia` (presenças do aluno), `/avisos`.

**Admin** (ProtectedRoute + checagem `isAdmin` na página + RLS)
`/admin` (KPIs, engajamento, alertas), `/admin/courses`, `/admin/courses/new`, `/admin/courses/:id`, `/admin/courses/:id/content` (módulos e aulas), `/admin/students` (alunos, exportação, importação em lote), `/admin/emails` (templates e campanhas), `/admin/announcements`, `/admin/library`, `/admin/assessments`, `/admin/assessments/new|:id` (assistente com IA), `/admin/assessments/:id/results`, `/admin/admins`, `/admin/attendance` (links de presença do ESDE I/II), `/admin/inscricoes` (páginas de inscrição), `/admin/esde-calendar` (editor do calendário), `/admin/dashboard-editor` (hero, filtros e CSS do dashboard do aluno). `*` cai em NotFound.

## 2. Papéis e permissões

- **Fonte de verdade:** tabela `user_roles` (enum `app_role`: admin, student), lida por `is_admin(uid)` e `has_role(uid, role)` (SQL STABLE, sem SECURITY DEFINER). O front considera admin quem tem linha `admin` em `user_roles`.
- **Campo legado e duplicado:** `profiles.role` (enum `user_role`: admin, student). Ainda é usado por `get_user_role`, pelas edge functions `admin-delete-user` e `notify-admins-new-user` e pelo rótulo do cabeçalho. Hoje os dois estão consistentes (0 divergências).
- **`profiles.user_type`** (enum: frequentador, trabalhador) segmenta o público. Os cursos têm `audience` (ambos / trabalhadores).
- **Trigger `prevent_profile_role_change`:** só admin altera `role`, `is_active` e `user_type`.
- **Login:** bloqueia contas com `is_active=false`.
- **Contagens:** 247 usuários em auth.users e 244 profiles (3 contas sem profile). 5 admins (todos `trabalhador`). 239 alunos, sendo 154 frequentadores e 85 trabalhadores. Todos ativos. 163 profiles com `must_change_password=true`.
- **Não existe papel de facilitador.** O facilitador é só texto livre em `courses.facilitator` e em `esde_calendar_entries.facilitador`.

## 3. Banco (schema public)

Notação: `!` = NOT NULL.

| Tabela | Linhas | Colunas principais / FKs |
|---|---|---|
| profiles | 244 | id! (= auth.users), full_name!, email!, phone, role! user_role, avatar_url, is_active!, user_type!, last_activity_at, inactivity_reminder_sent_at, must_change_password! |
| user_roles | 5 | user_id!, role! app_role |
| courses | 13 | title!, description, long_description, thumbnail_url, cover_url, status! (text), category (formacoes, cursos_extras, materiais), audience!, study_lines! text[] (espirita, umbanda, espiritualista), enrollment_open!, registration_page_enabled!, learning_topics[], start_date, end_date, schedule, facilitator, estimated_duration_minutes |
| class_groups (turmas) | 13 | course_id! FK courses, name!, vacancy_type! (limited/unlimited), max_students |
| modules | 38 | course_id! FK, title!, order_index! |
| lessons | 129 | module_id! FK, title!, description, video_url, embed_url, embed_title, thumbnail_url, order_index! |
| attachments | 13 | lesson_id! FK, name!, url!, type |
| enrollments | 563 | user_id! FK profiles, course_id! FK, class_group_id! FK, status! (approved, rejected, pending) |
| lesson_progress | 1.351 | user_id! FK, lesson_id! FK, completed!, completed_at |
| attendance_links | 18 | lesson_id! FK, token! uuid, created_by!, expires_at!, redirect_url |
| attendance_records | 577 | link_id! FK, lesson_id! FK, user_id! FK, confirmed_at, ip_address |
| assessments | 6 | course_id! FK, title, status! enum, position_type! enum, position_module_id, position_lesson_after_id, requires_completion!, passing_score!, max_attempts, time_limit_minutes, shuffle_*, show_answers_after! enum |
| assessment_questions | 86 | assessment_id! FK, question_type! enum, statement!, alternatives jsonb, correct_answer, explanation, needs_review!, ai_generated! |
| assessment_content_sources | 30 | assessment_id! FK, source_type!, lesson_id FK, file_path, content_text |
| assessment_attempts | 461 | assessment_id! FK, user_id! FK, attempt_number!, started_at!, submitted_at, score, passed, time_spent_seconds |
| assessment_answers | 3.831 | attempt_id! FK, question_id! FK, answer_given, is_correct, points_earned |
| esde_calendar_entries | 41 | course_code! (ESDE_I/ESDE_II), date_label! (texto), sort_order!, roteiro!, tema!, modulo!, facilitador!, tipo! (aula, feriado, recesso, extra, encerramento) |
| registration_pages | 1 | slug!, title!, subtitle, info_day/time/format/extra, free_text, course_ids! uuid[], show_course_covers!, is_active!, cover_url, whatsapp_group_url, thanks_text |
| books | 73 | title!, author!, spirit, description, cover_url, pdf_url, tags[], study_lines[] |
| announcements | 0 | title!, description, category!, is_active!, starts_at, expires_at |
| notifications | 261 | type! (user_registration 206, enrollment 55), title!, description!, related_id, is_read! (notificações para admins) |
| email_templates | 3 | template_key! (welcome, enrollment_approved, new_content), subject!, html_content!, variables[], is_active! |
| email_campaigns | 3 | subject!, html_content!, recipients_count!, sent/failed_count!, recipient_emails[]!, recipient_names[]! |
| email_queue | 1.033 | recipient_email!, subject!, html_content!, email_type!, campaign_id FK, status!, scheduled_for |
| email_logs | 367 | user_id FK, email_to!, email_type!, status!, resend_id, metadata |
| email_daily_usage | 212 | usage_date!, sent_count!, daily_limit! (100) |
| dashboard_config | 1 | hero_*, announcement_*, show_*, sections_order[], custom_css |

**Enums:** app_role, user_role (admin, student), user_type (frequentador, trabalhador), assessment_status (draft, published, archived), assessment_position_type (after_module, before_module, end_of_course, between_lessons), assessment_show_answers (always, never, on_pass), question_type (multiple_choice, true_false, multiple_answer, ordering, fill_blank, essay).

**Funções SQL:** is_admin, has_role, get_user_role, get_daily_email_remaining, increment_daily_email_usage (SECURITY DEFINER), mais as funções de trigger listadas abaixo.

**Triggers:**
- `on_auth_user_created` → handle_new_user: cria o profile a partir do metadata (full_name, phone, role, user_type).
- `on_new_user_registration` (profiles) → notificação para admin.
- enrollments: `check_class_group_capacity` (fecha `enrollment_open` quando a turma limitada lota), `on_new_enrollment` (notificação), `on_enrollment_notify` (está vazia; o envio por http foi desativado).
- `on_lesson_progress_update_activity` → atualiza last_activity_at.
- `prevent_profile_role_change`.
- `updated_at` em várias tabelas.

**pg_cron:**
- `process-email-queue-hourly` (0 * * * *)
- `check-inactivity-daily` (0 12 * * *)

As duas chamam as edge functions via `net.http_post`, com Bearer embutido no comando.

**Storage:**
- `course-assets`: público, 58 objetos (capas, PDFs).
- `lesson-attachments`: privado, 14 objetos (leitura só para admin ou matriculado aprovado).

**Edge functions (10):**
- admin-delete-user
- admin-set-password
- check-inactivity: lembrete a quem está há 10 dias inativo
- confirm-attendance
- generate-questions: IA
- notify-admins-new-user
- process-email-queue
- send-notification: aprovação de matrícula, conteúdo novo, envio em massa
- send-welcome-email
- verify-attendance-link

## 4. Modelo pedagógico

- **Hierarquia:** curso → turma (class_group) → módulos → aulas → anexos. Cada curso tem hoje uma única turma ("Turma 1"/"Turma Única"). O helper `enrollUserInCourse` sempre usa a primeira turma.
- **Matrícula e liberação:** `enrollments.status`. O acesso a módulos, aulas, anexos e avaliações é liberado pela RLS só com `status='approved'`. Os fluxos públicos de inscrição já gravam `approved` direto, sem aprovação manual. Hoje: 563 matrículas (559 aprovadas, 4 rejeitadas, 0 pendentes) de 230 usuários distintos.
- **Progresso:** `lesson_progress`, com 1.351 aulas concluídas por 107 usuários. 63 profiles tiveram atividade nos últimos 30 dias e 19 fizeram login nos últimos 30 dias.
- **Presença:** só para ESDE I e II (a tela admin filtra pelo título do curso).
  - O admin gera um link `/presenca/<token>` com validade de 30 min a 8 h (padrão 1h30) e URL de redirecionamento opcional. Sem URL, o padrão é uma sala fixa do Google Meet, escrita no código.
  - O aluno digita só o e-mail. A edge function procura o profile pelo e-mail, impede duplicata por aula, grava o IP e redireciona ao Meet em 8 s.
  - Volumes: 18 links (nenhum ativo; janelas de 30 min a 2 h; nenhum com redirect próprio). 577 presenças de 93 alunos: 575 no ESDE II e 2 no ESDE I (o recurso entrou em uso no meio do ano).
  - Tem exportação em CSV e botão "zerar presenças".
  - Não existem status ausente/justificado nem faltas calculadas.
- **Calendário público:** `esde_calendar_entries`.
  - ESDE I: 18 aulas, 2 recessos, 1 feriado.
  - ESDE II: 18 aulas, 1 recesso, 1 extra.
  - Datas guardadas como texto (`date_label`). Quinta-feira, 19h30 às 21h, online.
- **Avaliações:** 6 publicadas, todas do ESDE I (Módulos 1 a 6; nota mínima 70; respostas mostradas só com aprovação).
  - 86 questões, todas geradas por IA.
  - 461 tentativas (274 enviadas, 232 aprovadas) de 62 alunos.
  - 3.831 respostas.
- **Cursos (13, todos `published`):**

| Curso | Categoria / Público | Mód / Aulas | Matr. | Obs. |
|---|---|---|---|---|
| ESDE I | formações / ambos | 6 / 19 | 197 | 26/02 a 26/11/2026, quintas 19h30, 5 avaliações |
| ESDE II | formações / ambos | 3 / 19 | 96 | 23/07 a 03/12/2026, turma limitada a 100, 1 avaliação |
| EDE | formações / trabalhadores | 8 / 39 | 36 | espírita + umbanda |
| Curso de Passe - 2025 | extras / trabalhadores | 8 / 8 | 41 | |
| Diálogo Fraterno | extras / trabalhadores | 1 / 3 | 39 | 28/02/2026 |
| O Corpo Fala, Introdução à Psicossomática | extras / trabalhadores | 6 / 32 | 5 | inscrições fechadas |
| Reunião de Trabalhadores, Novo Sistema de Atendimento | extras / trabalhadores | 2 / 4 | 25 | |
| Voluntariado Espírita | extras / trabalhadores | 0 / 0 | 1 | vazio, fechado |
| Autoconhecimento e Vivência Mediúnica | extras / trabalhadores | 0 / 0 | 0 | vazio, fechado |
| Recursos de Estudo - IA | materiais / ambos | 1 / 1 | 33 | |
| Guia para Evangelho no Lar | materiais / ambos | 1 / 1 | 35 | |
| Água Fluidificada | materiais / ambos | 1 / 1 | 37 | |
| Relógio MTC | materiais / ambos | 1 / 2 | 18 | espiritualista |

Aulas: 74 de 129 com `video_url` e nenhuma com `embed_url`. Biblioteca: 73 livros, 72 com PDF e 6 com capa.

## 5. Entidades de pessoas

- **Tabela única `profiles`** (1:1 com auth.users) para alunos e admins.
  - Campos de identificação: full_name (244/244), email (244/244, único na prática, usado como chave na presença), phone (225/244), avatar (2/244).
  - **Não existem CPF, data de nascimento nem endereço.**
  - O cadastro público exige nome, e-mail, telefone (mínimo de 10 dígitos) e senha.
- **Facilitadores:** não são entidade. Ficam como texto em `courses.facilitator` (preenchido em 4 cursos) e `esde_calendar_entries.facilitador`.
- **Admins:** 5, com linha em `user_roles`.
- **Outros dados pessoais espalhados:**
  - `email_campaigns.recipient_emails/names`
  - `email_queue`
  - `email_logs.email_to` (lista concatenada)
  - `email_logs.metadata` (inclui telefone do novo aluno)
  - `attendance_records.ip_address` (577 registros)
- Os registros vão de 03/12/2025 a 11/10/2026.

## 6. Integrações, segredos e segurança

**Integrações:**
- **Resend:** e-mail, remetente `contato@lardeseuluiz.com.br`, limite próprio de 100 por dia e fila.
- **Lovable AI Gateway:** modelo `google/gemini-3-flash-preview`, gera questões.
- **Google Meet:** sala fixa no código.
- **WhatsApp:** link de grupo na página de inscrição.
- **pg_cron/pg_net.**
- **jsPDF:** PDF do calendário.

**Segredos (só nomes):** SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, LOVABLE_API_KEY. No front: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID.

**Pontos de segurança, em ordem de gravidade:**

1. **CRÍTICO: `admin-set-password`** roda com `verify_jwt=false` e **não faz nenhuma checagem de autenticação**. Qualquer pessoa que conheça a URL pode trocar a senha de qualquer usuário pelo e-mail, ou de **todos** com `resetAll:true`. Os 163 profiles com `must_change_password` sugerem que isso já foi usado em massa.
2. **ALTO: `send-notification`** (`verify_jwt=false`, sem checagem) aceita `bulk_email` com destinatários e HTML arbitrários. Funciona como relay aberto de e-mail pelo domínio do LSL, um risco de phishing. `send-welcome-email` e `notify-admins-new-user` também estão abertas, mas são de menor impacto.
3. **MÉDIO: Presença sem autenticação.** Quem tem o link e sabe o e-mail de um aluno marca presença por ele. A resposta também confirma se um e-mail existe na base e devolve o nome completo (enumeração).
4. **MÉDIO: Auto-matrícula aprovada.** A policy de INSERT em `enrollments` aceita `user_id=auth.uid()` com qualquer status. Um aluno logado pode se matricular como `approved` em qualquer curso, até nos fechados ou com público "trabalhadores", e ganhar acesso ao conteúdo.
5. **MÉDIO: E-mail editável pelo próprio aluno.** O usuário pode alterar o próprio `profiles.email` (o trigger não protege esse campo), e a presença é casada justamente por esse campo.
6. **`admin-delete-user`** valida admin por `profiles.role`, não por `user_roles`. Hoje está consistente, mas é uma fonte dupla de verdade.
7. **Rotas admin sem guard de papel** no roteador. A proteção depende da RLS, que está correta para as tabelas.
8. **`course-assets` é público.** PDFs da biblioteca e de cursos ficam acessíveis a quem tiver a URL.
9. **Cron com Bearer embutido** no texto do job (provavelmente a chave anon).
10. **Notificação de matrícula aprovada inoperante:** a função de trigger está vazia.

## 7. O que pode ser público e ligações com outros sistemas

- **Já é público por RLS** e pode alimentar o site institucional:
  - `courses` com status `published` (catálogo: título, descrição, capa, categoria, público, linhas de estudo, datas, horário, facilitador, inscrições abertas)
  - `class_groups`
  - `esde_calendar_entries` (calendário ESDE I/II)
  - `books` (biblioteca)
  - `registration_pages` ativas (inscrições)
  - `announcements` ativos
  - O site pode consumir tudo isso com a chave anon, sem expor dados pessoais.
- **Sugestão:** um calendário unificado de cursos (hoje só o ESDE tem calendário estruturado, e as datas são texto). Catálogo filtrado por `audience=ambos` para o público geral.
- **Ligações:**
  - Links fixos no código para formacao.lardeseuluiz.com.br e formacaolsl.lovable.app (os e-mails de boas-vindas e de inatividade usam o domínio lovable.app).
  - Google Meet fixo.
  - Grupo de WhatsApp por página de inscrição.
  - Nenhuma integração com o Garimpeiros da Luz: são bancos Supabase separados, sem chave compartilhada.

---

## Garimpeiros da Luz (`fb432dc0-d8b7-4833-9636-cc87606d3db3`)

**Atenção:** é o "Sistema ESDE" do **Grupo Espírita Garimpeiros da Luz** (outra casa, "30 anos", ESDE 2026.2), e não do LSL. Banco próprio (`rwqaqtrxdqgeyfozicwm`). Stack: TanStack Start com rotas em arquivo. Última edição: 26/06/2026.

**Rotas:**
- **Públicas:** `/`, `/auth`, `/calendario`, `/inscrever-se`, `/eventos/$slug`, `/camisetas`, `/camisetas/$slug`, `/convite/$token` (convite de trabalhador), `/recuperar-senha`, `/redefinir-senha`.
- **Logadas (`_authenticated`):**
  - Geral: `/dashboard`, `/minhas-turmas`, `/turmas/$turmaId`, `/turmas/$turmaId/aulas/$aulaId`, `/perfil`, `/inscricao`, `/inscrever-se/esde`, `/solicitar-trabalhador`.
  - Facilitador: `/facilitador/turmas/$turmaId`, `/facilitador/alunos/$alunoId`.
  - Coordenação: `/coordenacao/alunos(/$id)`, `/aprovacoes`, `/calendario` (+ `/importar` por planilha), `/configuracoes`, `/eventos(/$id)`, `/palestrantes`, `/periodos`, `/turmas(/$id)`.
  - Trabalhadores: `/trabalhadores` (+ `/novo`, `/$profileId`).
  - Loja: `/loja/painel`, `/loja/produtos(/$id)`, `/loja/relatorios`.

**Papéis** (`app_role`: aluno, facilitador, coordenador, admin, coord_esde, coord_mediunico, coord_loja, coord_eventos, trabalhador). 12 vínculos: 3 admin, 2 coordenador, 2 facilitador, 2 aluno, 1 trabalhador, 1 coord_loja, 1 coord_eventos. 3 usuários no auth.

**Tabelas e contagens:**
- turmas 7 (ESDE 1 ativa; ESDE 2 a 6 e Curso de Passes planejados)
- aulas 120, periodos 1, turma_facilitadores 1
- inscricoes 1, matriculas 0, presencas 0, assuntos 0
- profiles 3, trabalhadores 1, trabalhador_invites 0
- eventos 2, evento_inscricoes 0, evento_programacao 0, palestrantes 4, evento_palestrantes 4
- camisetas 1, camiseta_pedidos 71 (nome e telefone, com PIX)
- parametros 2, audit_log 0, user_roles 12

**Funções:** decidir_inscricao (gera matrícula), gerar_aulas_turma, gerar_matricula, recalcular_faltas (reprova automaticamente ao atingir `limite_faltas`), inscrever_evento, mais os helpers is_coord_*. Buckets: avatars, turmas-capas, eventos-capas, palestrantes-fotos, inscricao-page (todos privados).

**Sobreposição com a Área de Formação.** O modelo é muito mais rico em gestão presencial e tem três coisas que faltam no LSL:
- presença por chamada do facilitador (presente, ausente, justificado), com fila offline
- faltas e reprovação automática
- profile completo, com CPF, nascimento, endereço e questionário do ESDE

Equivalências:
- turmas e períodos ↔ `class_groups`
- aulas com data e módulo ↔ `esde_calendar_entries` + `lessons`
- inscrições com aprovação ↔ `enrollments`
- calendário público com importação por planilha ↔ `/esde/calendario`

O que não existe no LSL: papel de facilitador e coordenações, eventos e palestrantes, loja de camisetas, convites de trabalhador.

O que não existe no Garimpeiros: conteúdo EAD (vídeos, anexos), progresso, avaliações com IA, biblioteca, e-mail em massa e presença por link com Meet.

Volume real de uso é baixo (3 usuários, 0 matrículas, 0 presenças), exceto os 71 pedidos de camiseta.
