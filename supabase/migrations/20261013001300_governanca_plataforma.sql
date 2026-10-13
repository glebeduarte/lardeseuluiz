-- Governança na plataforma unificada (aplicado em etapas pelo painel; registro aqui para referência).
-- 1. Estrutura e dados originais no schema governanca (gerados por scripts/modulos/gerar_schema.py).
-- 2. Leitura restrita: cada pessoa vê os próprios dados, a gestão (admin e gestor) vê o restante
--    (funções governanca.eh_gestao, minha_pessoa, meu_associado).
-- 3. Login único: governanca.religar_conta, chamada pelo gatilho public.modulos_nova_conta.
-- 4. Perfil único: governanca.repassar_perfil copia nome, telefone e foto para Formação e Atendimento.
-- 5. Ações sociais com página no site: colunas novas em governanca.projects (abaixo).
-- 6. Papel "assistido" e cadastro único de pessoas (abaixo).

alter table governanca.projects
  add column if not exists slug text unique,
  add column if not exists summary text,
  add column if not exists content text,
  add column if not exists cover_url text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_public boolean not null default false,
  add column if not exists display_order int not null default 100,
  add column if not exists schedule text,
  add column if not exists accepts_volunteers boolean not null default true;
create policy "projects_read_public" on governanca.projects for select to anon using (is_public);
alter table governanca.volunteer_submissions add column if not exists project_id uuid references governanca.projects(id) on delete set null;

alter type governanca.person_role add value if not exists 'assistido';
-- Cadastro único: pessoas de public.pessoas (deduplicadas na migração) entram em governanca.people
-- quando ainda não há ninguém com o mesmo e-mail ou CPF; papéis: trabalhador (voluntário com CPF),
-- frequentador (com aviso quando é voluntário sem CPF) e assistido (consulente do Atendimento).
