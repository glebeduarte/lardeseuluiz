# Inventário: Lar de Seu Luiz - Governança

Levantamento de 12/10/2026, somente leitura. Projeto Lovable `9ce57607-bde8-4601-bc12-2d03be691479`. Stack: Vite, React 18, shadcn/ui, react-router 6, Supabase (Lovable Cloud).

## Rotas

**Públicas**
- `/`: site institucional. Conteúdo fixo no código (hero, horários, missão, eventos e ações sociais, atendimento, sobre, programação, contato com mapa).
- `/atendimentos`: explica Diálogo Fraterno, Tratamento Espiritual, Passes e Desobsessão, com calendário semanal fixo.
- `/login`: login e cadastro aberto. Admin e gestor vão para `/app`; demais para `/meu-painel`.
- `/palestras`: cadastro e exclusão de palestras **sem login**.
- `/stories`: gerador de Stories do Instagram com IA, sem login.
- `/design`: preview do design system.

**Painel `/app/*`** (exige login; controle por papel é quase todo visual)
- `/app`: dashboard com KPIs, CRUD de associados, exportação.
- `/app/secretarias[/:id]`, `/app/projetos`, `/app/eventos` (site_events com "publicar no site"), `/app/financeiro`, `/app/assembleias[/:id]`, `/app/documentos`, `/app/usuarios` (admin), `/app/lgpd`, `/app/pessoas[/:id]`, `/app/associados`, `/app/frequentadores`, `/app/configuracoes/funcoes`, `/app/perfil`, `/app/atendimentos` (fora do menu).

**Portal do associado `/meu-painel/*`**: resumo, contribuições, assembleias, meus dados.

## Papéis e permissões
- `user_roles` com enum `app_role` (admin, gestor, trabalhador, aluno); `has_role()` base das políticas.
- Permissões por módulo (`module_permission`: macas, passes, dialogo, recepcao, formacao, secretaria, projetos, gestao, financeiro, admin) via `functions` → `function_permissions` → `worker_assignments` (contexto casa/secretaria/projeto, com fim).
- `get_person_permissions()`, `current_user_has_permission()`.
- 10 funções: Voluntário Geral, Recepção, Passista, Médium de Maca, Dialogador, Coordenador de Passe, Membro de Secretaria, Coordenador de Secretaria, Membro de Projeto Social, Direção.
- Triggers: primeiro usuário vira admin; `handle_new_user` liga conta a pessoa por e-mail; normalização de CPF; validadores.

## Banco (28 tabelas, contagens)
| Tabela | Linhas | Observação |
|---|---|---|
| people | 14 | entidade unificada (13 com e-mail, 12 telefone, 10 CPF) |
| person_roles | 12 | 8 trabalhador, 4 frequentador |
| associate_memberships | 8 | fundador, efetivo, colaborador |
| associates | 12 | legado, duplica people |
| profiles / user_roles | 2 / 1 | |
| functions / function_permissions / worker_assignments | 10 / 13 / 2 | |
| secretarias / secretaria_members / secretaria_responsibilities / secretaria_actions | 9 / 1 / 80 / 0 | |
| projects | 0 | |
| site_events / palestras | 0 / 12 | |
| assemblies, agenda_items, assembly_attendees, votes | 0 | |
| contributions, expenses, documents | 0 | |
| spiritual_sessions, lgpd_consents, data_requests | 0 | |
| contact_submissions, volunteer_submissions | 0 | |

Enums relevantes: `person_role` (trabalhador, frequentador, beneficiario_social, doador), `associate_category`, `membership_status`, `site_event_type`, `document_type`, `consent_type` (dados_pessoais, comunicacao, imagem, dados_saude, cookies), `dsar_type`.

Storage: bucket `documents` público, vazio. Edge functions: `admin-create-user`, `generate-stories` (Lovable AI Gateway).

Migração interna em andamento ("Fase 6" do Lovable): unificar `associates` e `profiles` em `people`. Não concluída.

## Falhas encontradas
- `palestras` aceita INSERT e DELETE anônimos.
- Cadastro aberto + leitura `SELECT true` para autenticados em people, associates, contributions, lgpd_consents, spiritual_sessions etc.: qualquer conta lê CPF, telefone e e-mail.
- `votes` aceita inserção de qualquer autenticado; upload aberto no bucket `documents`.

## Conteúdo que alimenta o site
- No banco: `palestras`, `site_events`, `secretarias` (9) + responsabilidades (80), `projects`, `documents` públicos.
- Fixo no código: grade semanal (com horários divergentes entre páginas), eventos e ações sociais (Feijoada, Sopa Solidária às terças com cerca de 100 sopas, Dia das Crianças, Natal das Crianças, Saúde no Lar), contato, missão, transparência, etapas do voluntariado, 40 passagens do Evangelho para Stories.
