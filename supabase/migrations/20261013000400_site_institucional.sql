-- =====================================================================
-- Fase 5 · Site institucional
-- Agenda única, grade semanal, páginas de projetos, configurações do site,
-- mensagens de contato, interesse em voluntariado e candidaturas a ações.
-- =====================================================================

create type public.evento_tipo as enum ('palestra', 'evento', 'acao_social', 'curso', 'estudo');
create type public.recorrencia_tipo as enum ('semanal', 'quinzenal', 'mensal');

-- Páginas dos projetos e secretarias usam a própria tabela de áreas
alter table public.areas
  add column resumo text,
  add column conteudo text,
  add column imagem_url text,
  add column etiquetas text[] not null default '{}',
  add column aceita_candidaturas boolean not null default false;

-- ---------------------------------------------------------------------
-- Grade semanal: um dia de trabalho e seus blocos (diálogo, palestra...)
-- ---------------------------------------------------------------------
create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  dia_semana smallint not null check (dia_semana between 0 and 6),   -- 0 = domingo
  recorrencia public.recorrencia_tipo not null default 'semanal',
  inicio time not null,
  fim time not null check (fim > inicio),
  online boolean not null default false,
  publico boolean not null default true,
  ativa boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger atividades_atualizado before update on public.atividades
  for each row execute function public.tocar_atualizado_em();

create table public.atividade_blocos (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  titulo text not null,
  categoria text not null check (categoria in ('dialogo', 'palestra', 'evangelho', 'macas', 'passes', 'desobsessao', 'estudo', 'outro')),
  inicio time not null,
  fim time not null check (fim > inicio),
  ordem int not null default 0
);
create index atividade_blocos_atividade_idx on public.atividade_blocos(atividade_id);

-- ---------------------------------------------------------------------
-- Agenda única: palestras, eventos, ações sociais, cursos
-- ---------------------------------------------------------------------
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  tipo public.evento_tipo not null,
  titulo text not null check (length(trim(titulo)) > 2),
  descricao text,
  data date not null,
  inicio time,
  fim time,
  palestrante text,
  local text,
  area_id uuid references public.areas(id) on delete set null,
  publicado boolean not null default true,
  origem jsonb not null default '{}'::jsonb,
  criado_por uuid references public.pessoas(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index eventos_data_idx on public.eventos(data);
create trigger eventos_atualizado before update on public.eventos
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Configurações do site (contatos, endereço, redes)
-- ---------------------------------------------------------------------
create table public.site_config (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Entradas do site
-- ---------------------------------------------------------------------
create table public.mensagens_contato (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 2 and 120),
  email text check (email is null or length(email) <= 160),
  telefone text check (telefone is null or length(telefone) <= 30),
  assunto text check (assunto is null or length(assunto) <= 120),
  mensagem text not null check (length(mensagem) between 5 and 4000),
  lida boolean not null default false,
  criado_em timestamptz not null default now(),
  check (email is not null or telefone is not null)
);

create table public.interesses_voluntariado (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid references public.pessoas(id) on delete set null,
  nome text not null check (length(nome) between 2 and 120),
  email text check (email is null or length(email) <= 160),
  telefone text check (telefone is null or length(telefone) <= 30),
  areas_interesse text[] not null default '{}',
  disponibilidade text check (disponibilidade is null or length(disponibilidade) <= 500),
  mensagem text check (mensagem is null or length(mensagem) <= 2000),
  situacao text not null default 'novo' check (situacao in ('novo', 'contatado', 'entrevista_marcada', 'encaminhado', 'encerrado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (email is not null or telefone is not null)
);
create trigger interesses_atualizado before update on public.interesses_voluntariado
  for each row execute function public.tocar_atualizado_em();

create table public.candidaturas_acoes (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  evento_id uuid references public.eventos(id) on delete set null,
  mensagem text check (mensagem is null or length(mensagem) <= 1000),
  situacao text not null default 'pendente' check (situacao in ('pendente', 'aprovada', 'recusada', 'cancelada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index candidaturas_unica on public.candidaturas_acoes(pessoa_id, area_id, coalesce(evento_id, '00000000-0000-0000-0000-000000000000'::uuid)) where situacao in ('pendente', 'aprovada');
create trigger candidaturas_atualizado before update on public.candidaturas_acoes
  for each row execute function public.tocar_atualizado_em();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.atividades enable row level security;
alter table public.atividade_blocos enable row level security;
alter table public.eventos enable row level security;
alter table public.site_config enable row level security;
alter table public.mensagens_contato enable row level security;
alter table public.interesses_voluntariado enable row level security;
alter table public.candidaturas_acoes enable row level security;

create policy atividades_ler on public.atividades for select to anon, authenticated using (publico and ativa or (auth.uid() is not null and public.tem_permissao('site.publicar')));
create policy atividades_gerir on public.atividades for all to authenticated using (public.tem_permissao('site.publicar')) with check (public.tem_permissao('site.publicar'));
create policy blocos_ler on public.atividade_blocos for select to anon, authenticated using (true);
create policy blocos_gerir on public.atividade_blocos for all to authenticated using (public.tem_permissao('site.publicar')) with check (public.tem_permissao('site.publicar'));

create policy eventos_ler on public.eventos for select to anon, authenticated using (publicado or (auth.uid() is not null and public.tem_permissao('site.publicar')));
create policy eventos_gerir on public.eventos for all to authenticated using (public.tem_permissao('site.publicar')) with check (public.tem_permissao('site.publicar'));

create policy site_config_ler on public.site_config for select to anon, authenticated using (true);
create policy site_config_gerir on public.site_config for all to authenticated using (public.tem_permissao('site.publicar')) with check (public.tem_permissao('site.publicar'));

-- Áreas: quem publica no site edita os textos públicos
create policy areas_textos on public.areas for update to authenticated
  using (public.tem_permissao('site.publicar')) with check (public.tem_permissao('site.publicar'));

-- Contato: qualquer pessoa envia; Comunicação lê
create policy contato_enviar on public.mensagens_contato for insert to anon, authenticated with check (lida = false);
create policy contato_ler on public.mensagens_contato for select to authenticated using (public.tem_permissao('site.publicar'));
create policy contato_marcar on public.mensagens_contato for update to authenticated using (public.tem_permissao('site.publicar')) with check (public.tem_permissao('site.publicar'));

-- Voluntariado: qualquer pessoa manifesta interesse; Acolhimento e direção acompanham
create policy interesse_enviar on public.interesses_voluntariado for insert to anon, authenticated
  with check (situacao = 'novo' and (pessoa_id is null or pessoa_id = public.pessoa_atual()));
create policy interesse_ler on public.interesses_voluntariado for select to authenticated using (
  public.tem_permissao('chamamento.entrevistar') or public.tem_permissao('pessoas.aprovar_voluntario') or pessoa_id = public.pessoa_atual()
);
create policy interesse_gerir on public.interesses_voluntariado for update to authenticated using (
  public.tem_permissao('chamamento.entrevistar') or public.tem_permissao('pessoas.aprovar_voluntario')
) with check (
  public.tem_permissao('chamamento.entrevistar') or public.tem_permissao('pessoas.aprovar_voluntario')
);

-- Candidaturas: a própria pessoa se candidata e cancela; a coordenação do projeto decide
create policy candidatura_criar on public.candidaturas_acoes for insert to authenticated
  with check (pessoa_id = public.pessoa_atual() and situacao = 'pendente'
              and exists (select 1 from public.areas a where a.id = area_id and a.aceita_candidaturas and a.ativa));
create policy candidatura_ler on public.candidaturas_acoes for select to authenticated using (
  pessoa_id = public.pessoa_atual() or public.tem_cargo(area_id) or public.tem_permissao('acoes.operar')
);
create policy candidatura_atualizar on public.candidaturas_acoes for update to authenticated using (
  pessoa_id = public.pessoa_atual() or public.tem_cargo(area_id, array['coordenador']::public.cargo_tipo[]) or public.tem_permissao('acoes.operar')
) with check (
  (pessoa_id = public.pessoa_atual() and situacao in ('pendente', 'cancelada'))
  or public.tem_cargo(area_id, array['coordenador']::public.cargo_tipo[]) or public.tem_permissao('acoes.operar')
);

-- =====================================================================
-- Permissões por cargo em uma área específica
-- (ex.: membro da Comunicação publica no site; coordenador da Formação gere cursos)
-- =====================================================================
create table public.area_cargo_permissoes (
  area_id uuid not null references public.areas(id) on delete cascade,
  cargo public.cargo_tipo not null,
  permissao text not null references public.permissoes(chave) on delete cascade,
  primary key (area_id, cargo, permissao)
);
alter table public.area_cargo_permissoes enable row level security;
create policy acp_ler on public.area_cargo_permissoes for select to authenticated using (true);
create policy acp_gerir on public.area_cargo_permissoes for all to authenticated
  using (public.tem_permissao('plataforma.configurar')) with check (public.tem_permissao('plataforma.configurar'));

-- Pendente (exclusão precisa de confirmação no painel): remover a permissão genérica
-- de coordenador para site.publicar; publica no site quem é da Comunicação.

create or replace function public.minhas_permissoes()
returns setof text language sql stable security definer set search_path = public as $$
  select fp.permissao
    from public.pessoa_funcoes pf
    join public.funcoes f on f.id = pf.funcao_id and f.ativa
    join public.funcao_permissoes fp on fp.funcao_id = f.id
   where pf.pessoa_id = public.pessoa_atual() and pf.fim is null
  union
  select cp.permissao
    from public.pessoa_cargos pc
    join public.cargo_permissoes cp on cp.cargo = pc.cargo
   where pc.pessoa_id = public.pessoa_atual() and pc.fim is null
  union
  select acp.permissao
    from public.pessoa_cargos pc
    join public.area_cargo_permissoes acp on acp.area_id = pc.area_id
     and (acp.cargo = pc.cargo or (acp.cargo = 'membro' and pc.cargo = 'coordenador'))
   where pc.pessoa_id = public.pessoa_atual() and pc.fim is null
  union
  select p.chave from public.permissoes p
   where public.eh_admin() and not p.sensivel
$$;

insert into public.area_cargo_permissoes (area_id, cargo, permissao)
select a.id, x.cargo::public.cargo_tipo, x.permissao
from public.areas a join (values
  ('comunicacao',  'membro',      'site.publicar'),
  ('formacao',     'coordenador', 'formacao.gerir'),
  ('formacao',     'membro',      'formacao.acompanhar'),
  ('acolhimento',  'coordenador', 'pessoas.aprovar_voluntario'),
  ('acolhimento',  'membro',      'chamamento.entrevistar'),
  ('social',       'coordenador', 'acoes.familias'),
  ('social',       'membro',      'acoes.operar'),
  ('financeira',   'membro',      'governanca.financeiro'),
  ('mediunica',    'coordenador', 'atendimento.coordenar')
) as x(slug, cargo, permissao) on x.slug = a.slug;

-- =====================================================================
-- Conteúdo inicial (copiado do site atual)
-- =====================================================================
insert into public.site_config (chave, valor) values
  ('endereco', 'Rua da Mata, s/n · Colônia do Pium · Nísia Floresta/RN · CEP 59164-000'),
  ('whatsapp', '5584991432639'),
  ('whatsapp_exibicao', '(84) 99143-2639'),
  ('whatsapp_horario', 'Seg a Sáb, das 9h às 18h'),
  ('email', 'contato@lardeseuluiz.com.br'),
  ('instagram', 'https://instagram.com/lardeseuluiz'),
  ('youtube', ''),
  ('fundacao', '12 de setembro de 2025');

with a as (
  insert into public.atividades (titulo, descricao, dia_semana, recorrencia, inicio, fim, online, ordem) values
    ('Tratamento Espiritual e Atendimento', 'Acolhimento aberto ao público com Diálogo Fraterno, palestra, atendimento nas macas, passes individuais e fluidoterapia.', 2, 'semanal', '14:00', '18:30', false, 10),
    ('Estudo Doutrinário (ESDE)', 'Estudo e aprofundamento da Doutrina Espírita, aberto aos voluntários da casa. Via Google Meet.', 4, 'semanal', '19:30', '21:00', true, 20),
    ('Desobsessão e Atendimento Espiritual', 'Acolhimento aberto ao público, com atendimento nas macas, Diálogo Fraterno, Evangelho, palestra e passes.', 5, 'semanal', '15:30', '18:45', false, 30),
    ('Tratamento Espiritual e Atendimento', 'Acolhimento aberto ao público com Diálogo Fraterno, palestra, atendimento nas macas, passes individuais e fluidoterapia.', 6, 'quinzenal', '14:30', '19:00', false, 40),
    ('CaFé&AMor', 'Espiritualidade e psicologia voltadas à expansão da consciência: diálogo entre mediunidade, autoconhecimento e maturidade emocional.', 6, 'mensal', '16:00', '18:00', false, 50)
  returning id, dia_semana, recorrencia
)
insert into public.atividade_blocos (atividade_id, titulo, categoria, inicio, fim, ordem)
select a.id, b.titulo, b.categoria, b.inicio::time, b.fim::time, b.ordem
from a join (values
  (2, 'semanal',   'Diálogo Fraterno',              'dialogo',   '14:00', '15:15', 1),
  (2, 'semanal',   'Abertura e palestra',           'palestra',  '15:30', '17:00', 2),
  (2, 'semanal',   'Atendimento nas macas',         'macas',     '17:00', '18:30', 3),
  (2, 'semanal',   'Passes',                        'passes',    '17:00', '18:30', 4),
  (5, 'semanal',   'Abertura e Diálogo Fraterno',   'dialogo',   '16:00', '17:00', 1),
  (5, 'semanal',   'Estudo do Evangelho',           'evangelho', '17:00', '18:00', 2),
  (5, 'semanal',   'Palestra',                      'palestra',  '18:00', '19:00', 3),
  (5, 'semanal',   'Atendimento nas macas',         'macas',     '19:00', '20:00', 4),
  (5, 'semanal',   'Passes',                        'passes',    '19:00', '20:00', 5),
  (6, 'quinzenal', 'Diálogo Fraterno',              'dialogo',   '14:30', '15:45', 1),
  (6, 'quinzenal', 'Abertura e palestra',           'palestra',  '16:00', '17:30', 2),
  (6, 'quinzenal', 'Atendimento nas macas',         'macas',     '17:30', '19:00', 3),
  (6, 'quinzenal', 'Passes',                        'passes',    '17:30', '19:00', 4),
  (6, 'mensal',    'Palestra e conversa',           'palestra',  '16:00', '18:00', 1)
) as b(dia, rec, titulo, categoria, inicio, fim, ordem)
  on b.dia = a.dia_semana and b.rec::public.recorrencia_tipo = a.recorrencia;

update public.areas set aceita_candidaturas = true,
  resumo = 'Às terças-feiras, um grupo de voluntários prepara cerca de 100 sopas, distribuídas na comunidade local.',
  etiquetas = array['Ação social', 'Comunidade', 'Terças']
 where slug = 'sopa-solidaria';
update public.areas set aceita_candidaturas = true,
  resumo = 'Celebração para as crianças da comunidade, com brincadeiras, lanches, presentes e alegria fraterna.',
  etiquetas = array['Ação social', 'Comunidade']
 where slug = 'dia-das-criancas';
update public.areas set aceita_candidaturas = true,
  resumo = 'Evento natalino com presentes, lanches e atividades para crianças em situação de vulnerabilidade.',
  etiquetas = array['Natal solidário', 'Comunidade']
 where slug = 'natal-das-criancas';
update public.areas set aceita_candidaturas = true,
  resumo = 'Ação de saúde e bem-estar com atendimentos, orientação e cuidados para a comunidade local.',
  etiquetas = array['Saúde', 'Gratuito']
 where slug = 'saude-no-lar';
insert into public.areas (tipo, nome, slug, resumo, etiquetas, ordem, aceita_candidaturas) values
  ('projeto', 'Feijoada do Lar de Seu Luiz', 'feijoada', 'Evento gastronômico e solidário, com opções tradicional e vegana. A renda vai para os projetos sociais da casa.',
   array['Solidário', 'Vegana e tradicional'], 90, true);
