-- =====================================================================
-- Fase 2 · Núcleo de identidade
-- Pessoas, famílias, responsáveis, estágios, vínculos, áreas, cargos,
-- funções, permissões, consentimentos e registro de acesso sensível.
-- =====================================================================

create extension if not exists citext;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.estagio_casa as enum ('frequentador', 'voluntario');
create type public.vinculo_tipo as enum ('assistido', 'consulente', 'associado', 'colaborador_financeiro');
create type public.area_tipo as enum ('direcao', 'secretaria', 'projeto', 'equipe');
create type public.cargo_tipo as enum ('membro', 'coordenador', 'diretor');
create type public.consentimento_finalidade as enum ('dados_pessoais', 'dados_saude', 'imagem', 'comunicacao');

-- ---------------------------------------------------------------------
-- Utilitário de data de atualização
-- ---------------------------------------------------------------------
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Famílias
-- ---------------------------------------------------------------------
create table public.familias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco jsonb,
  telefone text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger familias_atualizado before update on public.familias
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Pessoas: uma linha por ser humano, com ou sem conta
-- ---------------------------------------------------------------------
create table public.pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 1),
  nome_social text,
  cpf text unique check (cpf ~ '^[0-9]{11}$'),
  email citext unique,
  telefone text,
  data_nascimento date,
  endereco jsonb,
  foto_url text,
  observacoes text,
  familia_id uuid references public.familias(id) on delete set null,
  user_id uuid unique references auth.users(id) on delete set null,
  origem jsonb not null default '{}'::jsonb,   -- ids nos sistemas antigos: {"governanca": "...", "atendimento": "...", "formacao": "..."}
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index pessoas_familia_idx on public.pessoas(familia_id);
create index pessoas_telefone_idx on public.pessoas(telefone);
create index pessoas_origem_idx on public.pessoas using gin (origem);
create trigger pessoas_atualizado before update on public.pessoas
  for each row execute function public.tocar_atualizado_em();

-- CPF e telefone guardados só com dígitos
create or replace function public.pessoas_normalizar()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.cpf is not null then
    new.cpf := nullif(regexp_replace(new.cpf, '\D', '', 'g'), '');
  end if;
  if new.telefone is not null then
    new.telefone := nullif(regexp_replace(new.telefone, '\D', '', 'g'), '');
  end if;
  new.nome := trim(new.nome);
  return new;
end $$;
create trigger pessoas_normalizar before insert or update on public.pessoas
  for each row execute function public.pessoas_normalizar();

-- Responsável legal (menores) ou responsável de referência
create table public.responsaveis (
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  responsavel_id uuid not null references public.pessoas(id) on delete cascade,
  parentesco text,
  principal boolean not null default true,
  criado_em timestamptz not null default now(),
  primary key (pessoa_id, responsavel_id),
  check (pessoa_id <> responsavel_id)
);
create index responsaveis_resp_idx on public.responsaveis(responsavel_id);

-- ---------------------------------------------------------------------
-- Estágio na casa, com histórico (um aberto por pessoa)
-- ---------------------------------------------------------------------
create table public.pessoa_estagios (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  estagio public.estagio_casa not null,
  inicio date not null default current_date,
  fim date,
  aprovado_por uuid references public.pessoas(id) on delete set null,
  motivo text,
  criado_em timestamptz not null default now(),
  check (fim is null or fim >= inicio)
);
create unique index pessoa_estagios_um_aberto on public.pessoa_estagios(pessoa_id) where fim is null;

-- ---------------------------------------------------------------------
-- Áreas da casa: direção, secretarias, projetos sociais, equipes
-- ---------------------------------------------------------------------
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  tipo public.area_tipo not null,
  nome text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  descricao text,
  publica boolean not null default true,
  ativa boolean not null default true,
  ordem int not null default 0,
  origem jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger areas_atualizado before update on public.areas
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Vínculos: vários ao mesmo tempo, independentes do estágio
-- ---------------------------------------------------------------------
create table public.pessoa_vinculos (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  tipo public.vinculo_tipo not null,
  area_id uuid references public.areas(id) on delete restrict,  -- projeto social, no caso de assistido
  categoria text,      -- associado: fundador, efetivo, colaborador
  situacao text not null default 'ativo',  -- associado: ativo, inadimplente, afastado, desligado
  inicio date not null default current_date,
  fim date,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim is null or fim >= inicio),
  check (tipo <> 'associado' or categoria in ('fundador', 'efetivo', 'colaborador'))
);
create index pessoa_vinculos_pessoa_idx on public.pessoa_vinculos(pessoa_id);
create index pessoa_vinculos_area_idx on public.pessoa_vinculos(area_id);
create trigger pessoa_vinculos_atualizado before update on public.pessoa_vinculos
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Cargos: só voluntários, sempre numa área, cumulativos
-- ---------------------------------------------------------------------
create table public.pessoa_cargos (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete restrict,
  cargo public.cargo_tipo not null,
  inicio date not null default current_date,
  fim date,
  atribuido_por uuid references public.pessoas(id) on delete set null,
  criado_em timestamptz not null default now(),
  check (fim is null or fim >= inicio)
);
create unique index pessoa_cargos_um_aberto on public.pessoa_cargos(pessoa_id, area_id, cargo) where fim is null;
create index pessoa_cargos_area_idx on public.pessoa_cargos(area_id);

-- ---------------------------------------------------------------------
-- Permissões e funções
-- ---------------------------------------------------------------------
create table public.permissoes (
  chave text primary key check (chave ~ '^[a-z_]+(\.[a-z_]+)+$'),
  modulo text not null,
  descricao text not null,
  sensivel boolean not null default false
);

create table public.funcoes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nome text not null,
  descricao text,
  ativa boolean not null default true,
  origem jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger funcoes_atualizado before update on public.funcoes
  for each row execute function public.tocar_atualizado_em();

create table public.funcao_permissoes (
  funcao_id uuid not null references public.funcoes(id) on delete cascade,
  permissao text not null references public.permissoes(chave) on delete cascade,
  primary key (funcao_id, permissao)
);

-- Permissões que vêm do cargo (o alcance é dado pela área)
create table public.cargo_permissoes (
  cargo public.cargo_tipo not null,
  permissao text not null references public.permissoes(chave) on delete cascade,
  primary key (cargo, permissao)
);

create table public.pessoa_funcoes (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  funcao_id uuid not null references public.funcoes(id) on delete restrict,
  contexto jsonb not null default '{}'::jsonb,   -- ex.: {"linha": "espirita"} ou {"maca_id": "..."}
  inicio date not null default current_date,
  fim date,
  atribuido_por uuid references public.pessoas(id) on delete set null,
  criado_em timestamptz not null default now(),
  check (fim is null or fim >= inicio)
);
create index pessoa_funcoes_pessoa_idx on public.pessoa_funcoes(pessoa_id) where fim is null;

-- Admin técnico da plataforma (fora dos cargos; não abre fichas sensíveis)
create table public.admins_plataforma (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Consentimentos LGPD
-- ---------------------------------------------------------------------
create table public.consentimentos (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  finalidade public.consentimento_finalidade not null,
  concedido boolean not null,
  concedido_por uuid references public.pessoas(id) on delete set null,  -- responsável, quando a pessoa é menor
  registrado_por uuid references public.pessoas(id) on delete set null,
  versao_termo text not null default 'v1',
  registrado_em timestamptz not null default now(),
  revogado_em timestamptz
);
create index consentimentos_pessoa_idx on public.consentimentos(pessoa_id, finalidade);

-- ---------------------------------------------------------------------
-- Registro de acesso a dados sensíveis
-- ---------------------------------------------------------------------
create table public.acessos_sensiveis (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  pessoa_id uuid references public.pessoas(id) on delete set null,
  recurso text not null,
  acao text not null default 'ler',
  em timestamptz not null default now()
);
create index acessos_sensiveis_pessoa_idx on public.acessos_sensiveis(pessoa_id, em desc);

-- =====================================================================
-- Funções de autorização (security definer: leem sem depender de RLS)
-- =====================================================================
create or replace function public.pessoa_atual()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.pessoas where user_id = auth.uid()
$$;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins_plataforma where user_id = auth.uid())
$$;

create or replace function public.estagio_atual(p uuid)
returns public.estagio_casa language sql stable security definer set search_path = public as $$
  select estagio from public.pessoa_estagios where pessoa_id = p and fim is null
$$;

create or replace function public.eh_voluntario()
returns boolean language sql stable security definer set search_path = public as $$
  select public.estagio_atual(public.pessoa_atual()) = 'voluntario'
$$;

create or replace function public.tem_funcao(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pessoa_funcoes pf
    join public.funcoes f on f.id = pf.funcao_id and f.ativa
    where pf.pessoa_id = public.pessoa_atual()
      and pf.fim is null and f.slug = p_slug
  )
$$;

create or replace function public.tem_cargo(p_area uuid, p_cargos public.cargo_tipo[] default array['membro','coordenador','diretor']::public.cargo_tipo[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pessoa_cargos pc
    where pc.pessoa_id = public.pessoa_atual()
      and pc.fim is null and pc.area_id = p_area and pc.cargo = any(p_cargos)
  )
$$;

create or replace function public.eh_diretor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pessoa_cargos
    where pessoa_id = public.pessoa_atual() and fim is null and cargo = 'diretor'
  )
$$;

-- Todas as permissões da pessoa logada: funções ativas + cargos ativos.
-- O admin técnico recebe só as permissões não sensíveis.
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
  select p.chave from public.permissoes p
   where public.eh_admin() and not p.sensivel
$$;

create or replace function public.tem_permissao(p_chave text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.minhas_permissoes() m where m = p_chave)
$$;

-- Registra que a pessoa logada abriu um dado sensível
create or replace function public.registrar_acesso(p_pessoa uuid, p_recurso text, p_acao text default 'ler')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Acesso sem login não pode ser registrado';
  end if;
  insert into public.acessos_sensiveis(user_id, pessoa_id, recurso, acao)
  values (auth.uid(), p_pessoa, p_recurso, p_acao);
end $$;

-- =====================================================================
-- Regras de consistência
-- =====================================================================

-- Cargos só para voluntários; diretor só na área de direção
create or replace function public.pessoa_cargos_validar()
returns trigger language plpgsql set search_path = public as $$
declare v_tipo public.area_tipo;
begin
  if new.fim is null and public.estagio_atual(new.pessoa_id) is distinct from 'voluntario' then
    raise exception 'Só voluntários podem receber cargos';
  end if;
  select tipo into v_tipo from public.areas where id = new.area_id;
  if new.cargo = 'diretor' and v_tipo <> 'direcao' then
    raise exception 'O cargo de diretor só existe na área de direção';
  end if;
  return new;
end $$;
create trigger pessoa_cargos_validar before insert or update on public.pessoa_cargos
  for each row execute function public.pessoa_cargos_validar();

-- Funções só para voluntários
create or replace function public.pessoa_funcoes_validar()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.fim is null and public.estagio_atual(new.pessoa_id) is distinct from 'voluntario' then
    raise exception 'Só voluntários podem receber funções';
  end if;
  return new;
end $$;
create trigger pessoa_funcoes_validar before insert or update on public.pessoa_funcoes
  for each row execute function public.pessoa_funcoes_validar();

-- Ao sair do estágio de voluntário, cargos e funções abertos são encerrados
create or replace function public.pessoa_estagios_encerrar_acessos()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.estagio = 'voluntario' and new.fim is not null and old.fim is null then
    update public.pessoa_cargos set fim = new.fim where pessoa_id = new.pessoa_id and fim is null;
    update public.pessoa_funcoes set fim = new.fim where pessoa_id = new.pessoa_id and fim is null;
  end if;
  return new;
end $$;
create trigger pessoa_estagios_encerrar after update on public.pessoa_estagios
  for each row execute function public.pessoa_estagios_encerrar_acessos();

-- Quem edita o próprio cadastro não muda campos de identidade
create or replace function public.pessoas_proteger_campos()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or public.tem_permissao('pessoas.editar') then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.cpf is distinct from old.cpf
     or new.email is distinct from old.email
     or new.origem is distinct from old.origem
     or new.familia_id is distinct from old.familia_id then
    raise exception 'Você não pode alterar CPF, e-mail ou vínculos do cadastro. Procure a secretaria.';
  end if;
  return new;
end $$;
create trigger pessoas_proteger_campos before update on public.pessoas
  for each row execute function public.pessoas_proteger_campos();

-- =====================================================================
-- Conta nova: liga à pessoa existente pelo e-mail confirmado, ou cria
-- =====================================================================
create or replace function public.vincular_conta()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pessoa uuid;
begin
  if new.email_confirmed_at is null or new.email is null then
    return new;
  end if;
  if exists (select 1 from public.pessoas where user_id = new.id) then
    return new;
  end if;

  select id into v_pessoa from public.pessoas
   where email = new.email::citext and user_id is null
   limit 1;

  if v_pessoa is not null then
    update public.pessoas set user_id = new.id where id = v_pessoa;
  else
    insert into public.pessoas (nome, email, telefone, user_id)
    values (
      coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)),
      new.email,
      nullif(new.raw_user_meta_data->>'telefone', ''),
      new.id
    )
    returning id into v_pessoa;
  end if;

  if public.estagio_atual(v_pessoa) is null then
    insert into public.pessoa_estagios (pessoa_id, estagio, motivo)
    values (v_pessoa, 'frequentador', 'Conta criada no site');
  end if;
  return new;
end $$;

create trigger vincular_conta_ao_criar after insert on auth.users
  for each row execute function public.vincular_conta();
create trigger vincular_conta_ao_confirmar after update of email_confirmed_at on auth.users
  for each row execute function public.vincular_conta();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.familias enable row level security;
alter table public.pessoas enable row level security;
alter table public.responsaveis enable row level security;
alter table public.pessoa_estagios enable row level security;
alter table public.areas enable row level security;
alter table public.pessoa_vinculos enable row level security;
alter table public.pessoa_cargos enable row level security;
alter table public.permissoes enable row level security;
alter table public.funcoes enable row level security;
alter table public.funcao_permissoes enable row level security;
alter table public.cargo_permissoes enable row level security;
alter table public.pessoa_funcoes enable row level security;
alter table public.admins_plataforma enable row level security;
alter table public.consentimentos enable row level security;
alter table public.acessos_sensiveis enable row level security;

-- Pessoas: a própria pessoa, quem ela representa como responsável, e quem tem permissão
create policy pessoas_ler on public.pessoas for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.responsaveis r where r.pessoa_id = pessoas.id and r.responsavel_id = public.pessoa_atual())
  or public.tem_permissao('pessoas.ler')
);
create policy pessoas_criar on public.pessoas for insert to authenticated
  with check (public.tem_permissao('pessoas.criar'));
create policy pessoas_editar on public.pessoas for update to authenticated
  using (user_id = auth.uid() or public.tem_permissao('pessoas.editar'))
  with check (user_id = auth.uid() or public.tem_permissao('pessoas.editar'));
create policy pessoas_excluir on public.pessoas for delete to authenticated
  using (public.tem_permissao('pessoas.excluir'));

-- Famílias
create policy familias_ler on public.familias for select to authenticated using (
  public.tem_permissao('pessoas.ler')
  or id = (select familia_id from public.pessoas where user_id = auth.uid())
);
create policy familias_gerir on public.familias for all to authenticated
  using (public.tem_permissao('pessoas.editar')) with check (public.tem_permissao('pessoas.editar'));

-- Responsáveis
create policy responsaveis_ler on public.responsaveis for select to authenticated using (
  responsavel_id = public.pessoa_atual() or pessoa_id = public.pessoa_atual() or public.tem_permissao('pessoas.ler')
);
create policy responsaveis_gerir on public.responsaveis for all to authenticated
  using (public.tem_permissao('pessoas.editar')) with check (public.tem_permissao('pessoas.editar'));

-- Estágios: leitura própria ou com permissão; só quem aprova voluntários altera
create policy estagios_ler on public.pessoa_estagios for select to authenticated using (
  pessoa_id = public.pessoa_atual() or public.tem_permissao('pessoas.ler')
);
create policy estagios_gerir on public.pessoa_estagios for all to authenticated
  using (public.tem_permissao('pessoas.aprovar_voluntario'))
  with check (public.tem_permissao('pessoas.aprovar_voluntario'));

-- Áreas: as públicas aparecem no site
create policy areas_ler_publico on public.areas for select to anon using (publica and ativa);
create policy areas_ler on public.areas for select to authenticated using (true);
create policy areas_gerir on public.areas for all to authenticated
  using (public.tem_permissao('plataforma.configurar')) with check (public.tem_permissao('plataforma.configurar'));

-- Vínculos
create policy vinculos_ler on public.pessoa_vinculos for select to authenticated using (
  pessoa_id = public.pessoa_atual()
  or public.tem_permissao('pessoas.ler')
  or (area_id is not null and public.tem_cargo(area_id))
);
create policy vinculos_gerir on public.pessoa_vinculos for all to authenticated using (
  public.tem_permissao('pessoas.editar') or (area_id is not null and public.tem_cargo(area_id, array['coordenador']::public.cargo_tipo[]))
) with check (
  public.tem_permissao('pessoas.editar') or (area_id is not null and public.tem_cargo(area_id, array['coordenador']::public.cargo_tipo[]))
);

-- Cargos: leitura para voluntários (organograma); gestão por quem configura ou dirige
create policy cargos_ler on public.pessoa_cargos for select to authenticated using (
  pessoa_id = public.pessoa_atual() or public.eh_voluntario() or public.tem_permissao('pessoas.ler')
);
create policy cargos_gerir on public.pessoa_cargos for all to authenticated
  using (public.tem_permissao('pessoas.atribuir')) with check (public.tem_permissao('pessoas.atribuir'));

-- Catálogos: leitura para todos logados; alteração só por quem configura a plataforma
create policy permissoes_ler on public.permissoes for select to authenticated using (true);
create policy permissoes_gerir on public.permissoes for all to authenticated
  using (public.tem_permissao('plataforma.configurar')) with check (public.tem_permissao('plataforma.configurar'));
create policy funcoes_ler on public.funcoes for select to authenticated using (true);
create policy funcoes_gerir on public.funcoes for all to authenticated
  using (public.tem_permissao('plataforma.configurar')) with check (public.tem_permissao('plataforma.configurar'));
create policy funcao_permissoes_ler on public.funcao_permissoes for select to authenticated using (true);
create policy funcao_permissoes_gerir on public.funcao_permissoes for all to authenticated
  using (public.tem_permissao('plataforma.configurar')) with check (public.tem_permissao('plataforma.configurar'));
create policy cargo_permissoes_ler on public.cargo_permissoes for select to authenticated using (true);
create policy cargo_permissoes_gerir on public.cargo_permissoes for all to authenticated
  using (public.tem_permissao('plataforma.configurar')) with check (public.tem_permissao('plataforma.configurar'));

-- Funções atribuídas
create policy pessoa_funcoes_ler on public.pessoa_funcoes for select to authenticated using (
  pessoa_id = public.pessoa_atual() or public.eh_voluntario() or public.tem_permissao('pessoas.ler')
);
create policy pessoa_funcoes_gerir on public.pessoa_funcoes for all to authenticated
  using (public.tem_permissao('pessoas.atribuir')) with check (public.tem_permissao('pessoas.atribuir'));

-- Admins: cada um vê se é admin; ninguém altera pela API (só migração ou painel do Supabase)
create policy admins_ler on public.admins_plataforma for select to authenticated using (user_id = auth.uid());

-- Consentimentos
create policy consentimentos_ler on public.consentimentos for select to authenticated using (
  pessoa_id = public.pessoa_atual()
  or exists (select 1 from public.responsaveis r where r.pessoa_id = consentimentos.pessoa_id and r.responsavel_id = public.pessoa_atual())
  or public.tem_permissao('consentimentos.gerir')
);
create policy consentimentos_registrar on public.consentimentos for insert to authenticated with check (
  pessoa_id = public.pessoa_atual()
  or exists (select 1 from public.responsaveis r where r.pessoa_id = consentimentos.pessoa_id and r.responsavel_id = public.pessoa_atual())
  or public.tem_permissao('consentimentos.gerir')
);
create policy consentimentos_revogar on public.consentimentos for update to authenticated using (
  pessoa_id = public.pessoa_atual()
  or exists (select 1 from public.responsaveis r where r.pessoa_id = consentimentos.pessoa_id and r.responsavel_id = public.pessoa_atual())
  or public.tem_permissao('consentimentos.gerir')
);

-- Registro de acesso: só leitura, por quem audita; escrita só pela função
create policy acessos_ler on public.acessos_sensiveis for select to authenticated using (
  public.tem_permissao('auditoria.ler')
);

-- Funções de autorização: só para usuários logados
revoke execute on function public.registrar_acesso(uuid, text, text) from public, anon;
revoke execute on function public.vincular_conta() from public, anon, authenticated;

-- =====================================================================
-- Catálogo inicial
-- =====================================================================
insert into public.permissoes (chave, modulo, descricao, sensivel) values
  ('plataforma.configurar',          'plataforma',  'Configurar funções, permissões e áreas', false),
  ('pessoas.ler',                    'pessoas',     'Ver cadastros de pessoas', false),
  ('pessoas.criar',                  'pessoas',     'Cadastrar pessoas', false),
  ('pessoas.editar',                 'pessoas',     'Editar cadastros de pessoas', false),
  ('pessoas.excluir',                'pessoas',     'Excluir cadastros de pessoas', false),
  ('pessoas.atribuir',               'pessoas',     'Atribuir cargos e funções', false),
  ('pessoas.aprovar_voluntario',     'pessoas',     'Aprovar a passagem a voluntário', false),
  ('consentimentos.gerir',           'pessoas',     'Registrar consentimentos em nome de outras pessoas', false),
  ('auditoria.ler',                  'pessoas',     'Ver o registro de acesso a dados sensíveis', true),
  ('site.publicar',                  'site',        'Publicar conteúdo no site', false),
  ('chamamento.entrevistar',         'chamamento',  'Registrar entrevistas do chamamento', false),
  ('chamamento.tutorar',             'chamamento',  'Acompanhar estagiários', false),
  ('formacao.gerir',                 'formacao',    'Criar e editar cursos, turmas e conteúdo', false),
  ('formacao.acompanhar',            'formacao',    'Acompanhar turmas, presenças e avaliações', false),
  ('formacao.evangelizacao',         'formacao',    'Acompanhar turmas de infância e juventude', false),
  ('atendimento.acolhimento',        'atendimento', 'Recepção, designação de maca e fichas', true),
  ('atendimento.dialogo',            'atendimento', 'Ficha do Diálogo Fraterno e altas', true),
  ('atendimento.maca',               'atendimento', 'Chamada e observações da própria maca', true),
  ('atendimento.passe',              'atendimento', 'Sessões de passe', false),
  ('atendimento.coordenar',          'atendimento', 'Coordenar macas, médiuns e sessões', true),
  ('atendimento.relatorios',         'atendimento', 'Relatórios agregados, sem abrir fichas', false),
  ('acoes.operar',                   'acoes',       'Operar ações sociais: edições, entregas, escala', false),
  ('acoes.familias',                 'acoes',       'Cadastro de famílias e assistidos', true),
  ('acoes.saude',                    'acoes',       'Dados de saúde do Saúde no Lar', true),
  ('governanca.associados',          'governanca',  'Associados e contribuições', false),
  ('governanca.financeiro',          'governanca',  'Financeiro: contribuições e despesas', false),
  ('governanca.assembleias',         'governanca',  'Assembleias, pautas e votos', false),
  ('governanca.documentos',          'governanca',  'Documentos da associação', false),
  ('governanca.relatorios',          'governanca',  'Relatórios gerais da casa', false);

insert into public.funcoes (slug, nome, descricao) values
  ('acolhimento',        'Acolhimento',         'Recepção dos frequentadores e consulentes, designação de maca, entrevista do chamamento'),
  ('dialogador',         'Dialogador',          'Diálogo Fraterno: ficha, encaminhamento e confirmação de alta'),
  ('medium-maca',        'Médium de maca',      'Chamada e observações da própria maca'),
  ('passista',           'Passista',            'Aplicação de passes'),
  ('coordenador-passe',  'Coordenador de passe','Coordenação de macas, médiuns e sessões'),
  ('monitor-esde',       'Monitor do ESDE',     'Acompanhamento de turmas do ESDE'),
  ('evangelizador',      'Evangelizador',       'Evangelização de infância e juventude'),
  ('tutor-estagio',      'Tutor de estágio',    'Acompanhamento de estagiários do chamamento');

insert into public.funcao_permissoes (funcao_id, permissao)
select f.id, p.permissao from public.funcoes f
join (values
  ('acolhimento', 'atendimento.acolhimento'),
  ('acolhimento', 'acoes.familias'),
  ('acolhimento', 'chamamento.entrevistar'),
  ('acolhimento', 'pessoas.ler'),
  ('acolhimento', 'pessoas.criar'),
  ('dialogador', 'atendimento.dialogo'),
  ('medium-maca', 'atendimento.maca'),
  ('passista', 'atendimento.passe'),
  ('coordenador-passe', 'atendimento.coordenar'),
  ('coordenador-passe', 'atendimento.passe'),
  ('coordenador-passe', 'atendimento.relatorios'),
  ('monitor-esde', 'formacao.acompanhar'),
  ('evangelizador', 'formacao.evangelizacao'),
  ('tutor-estagio', 'chamamento.tutorar')
) as p(slug, permissao) on p.slug = f.slug;

insert into public.cargo_permissoes (cargo, permissao) values
  ('coordenador', 'pessoas.ler'),
  ('coordenador', 'site.publicar'),
  ('diretor', 'pessoas.ler'),
  ('diretor', 'pessoas.editar'),
  ('diretor', 'pessoas.atribuir'),
  ('diretor', 'pessoas.aprovar_voluntario'),
  ('diretor', 'consentimentos.gerir'),
  ('diretor', 'auditoria.ler'),
  ('diretor', 'site.publicar'),
  ('diretor', 'atendimento.relatorios'),
  ('diretor', 'governanca.associados'),
  ('diretor', 'governanca.financeiro'),
  ('diretor', 'governanca.assembleias'),
  ('diretor', 'governanca.documentos'),
  ('diretor', 'governanca.relatorios');

insert into public.areas (tipo, nome, slug, descricao, ordem) values
  ('direcao',    'Direção',                 'direcao',          'Diretoria da associação', 0),
  ('secretaria', 'Acolhimento',             'acolhimento',      null, 10),
  ('secretaria', 'Cultura e Artes',         'cultura-e-artes',  null, 20),
  ('secretaria', 'Formação',                'formacao',         null, 30),
  ('secretaria', 'Social',                  'social',           null, 40),
  ('secretaria', 'Mediúnica',               'mediunica',        null, 50),
  ('secretaria', 'Infraestrutura',          'infraestrutura',   null, 60),
  ('secretaria', 'Financeira',              'financeira',       null, 70),
  ('secretaria', 'Comunicação',             'comunicacao',      null, 80),
  ('projeto',    'Sopa Solidária',          'sopa-solidaria',   'Sopa às terças-feiras para a comunidade', 100),
  ('projeto',    'Dia das Crianças',        'dia-das-criancas', null, 110),
  ('projeto',    'Natal das Crianças',      'natal-das-criancas', null, 120),
  ('projeto',    'Saúde no Lar',            'saude-no-lar',     null, 130);
