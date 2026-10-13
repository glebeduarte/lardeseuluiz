
-- Enums
create type public.app_role as enum ('recepcao', 'dialogador', 'admin');
create type public.designacao_status as enum ('ativa', 'concluida', 'cancelada');
create type public.presenca_status as enum ('presente', 'ausente', 'emergencia');
create type public.sessao_tipo as enum ('terca', 'sexta');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles (separate table to prevent privilege escalation)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer for role checks (avoids recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin');
$$;

create or replace function public.is_dialogador_or_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'dialogador') or public.has_role(_user_id, 'admin');
$$;

create or replace function public.has_any_role(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id);
$$;

-- Macas
create table public.macas (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique,
  nome text not null,
  cor_hex text not null,
  mediuns text[] not null default '{}',
  lotacao_max int not null default 15,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.macas enable row level security;

-- Consulentes (ficha do Diálogo Fraterno)
create table public.consulentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento date not null,
  telefone text not null,
  conhece_doutrina boolean,
  evangelho_no_lar boolean,
  motivo_saude boolean not null default false,
  motivo_saude_especificacao text,
  motivo_conflitos_familiares boolean not null default false,
  motivo_mediunidade boolean not null default false,
  motivo_obsessao boolean not null default false,
  motivo_depressao boolean not null default false,
  uso_medicacoes boolean not null default false,
  uso_medicacoes_especificacao text,
  ideias_suicidas boolean not null default false,
  uso_drogas boolean not null default false,
  uso_alcool boolean not null default false,
  uso_cigarro boolean not null default false,
  conflito_genero boolean not null default false,
  encaminhamento_passes boolean not null default false,
  encaminhamento_passes_qtd int,
  encaminhamento_maca boolean not null default false,
  indicacao_saude boolean not null default false,
  indicacao_saude_texto text,
  indicacao_chakras boolean not null default false,
  indicacao_harmonizacao boolean not null default false,
  indicacao_mediunidade boolean not null default false,
  indicacao_desobsessao_leve boolean not null default false,
  indicacao_desobsessao boolean not null default false,
  outras_informacoes text,
  dialogador_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.consulentes enable row level security;

-- Designações
create table public.designacoes (
  id uuid primary key default gen_random_uuid(),
  consulente_id uuid not null references public.consulentes(id) on delete cascade,
  maca_id uuid not null references public.macas(id),
  dialogador_id uuid references auth.users(id),
  status designacao_status not null default 'ativa',
  sessoes_realizadas int not null default 0,
  observacoes text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.designacoes enable row level security;

-- Apenas uma designação ativa por consulente
create unique index uniq_designacao_ativa
  on public.designacoes(consulente_id) where status = 'ativa';

-- Sessões
create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tipo sessao_tipo not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (data)
);
alter table public.sessoes enable row level security;

-- Presenças
create table public.presencas (
  id uuid primary key default gen_random_uuid(),
  designacao_id uuid not null references public.designacoes(id) on delete cascade,
  sessao_id uuid not null references public.sessoes(id) on delete cascade,
  status presenca_status not null,
  observacao text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (designacao_id, sessao_id)
);
alter table public.presencas enable row level security;

-- Trigger: conclui designação automaticamente ao atingir 15 presenças
create or replace function public.fn_atualiza_sessoes_realizadas()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_lotacao int;
begin
  select count(*) into v_total from public.presencas
    where designacao_id = NEW.designacao_id and status = 'presente';
  select lotacao_max into v_lotacao from public.macas m
    join public.designacoes d on d.maca_id = m.id where d.id = NEW.designacao_id;

  update public.designacoes
    set sessoes_realizadas = v_total,
        status = case when v_total >= coalesce(v_lotacao, 15) then 'concluida'::designacao_status else status end,
        closed_at = case when v_total >= coalesce(v_lotacao, 15) and closed_at is null then now() else closed_at end
    where id = NEW.designacao_id;
  return NEW;
end;
$$;

create trigger trg_atualiza_sessoes_realizadas
  after insert or update or delete on public.presencas
  for each row execute function public.fn_atualiza_sessoes_realizadas();

-- Trigger: cria profile ao registrar novo usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================
-- RLS POLICIES
-- =====================

-- profiles: usuário vê o próprio; admin vê todos
create policy "profiles self select" on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "profiles self update" on public.profiles for update
  using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "profiles admin insert" on public.profiles for insert
  with check (public.is_admin(auth.uid()) or auth.uid() = id);

-- user_roles: usuário vê seus papéis; admin gerencia
create policy "roles self select" on public.user_roles for select
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "roles admin all" on public.user_roles for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- macas: todos autenticados leem; só admin escreve
create policy "macas read auth" on public.macas for select
  using (public.has_any_role(auth.uid()));
create policy "macas admin write" on public.macas for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- consulentes: dialogador e admin acessam tudo; recepção lê (UI esconde dados sensíveis)
create policy "consulentes read" on public.consulentes for select
  using (public.has_any_role(auth.uid()));
create policy "consulentes write dialog" on public.consulentes for insert
  with check (public.is_dialogador_or_admin(auth.uid()));
create policy "consulentes update dialog" on public.consulentes for update
  using (public.is_dialogador_or_admin(auth.uid()));
create policy "consulentes delete admin" on public.consulentes for delete
  using (public.is_admin(auth.uid()));

-- designacoes
create policy "designacoes read" on public.designacoes for select
  using (public.has_any_role(auth.uid()));
create policy "designacoes write dialog" on public.designacoes for insert
  with check (public.is_dialogador_or_admin(auth.uid()));
create policy "designacoes update dialog" on public.designacoes for update
  using (public.is_dialogador_or_admin(auth.uid()));
create policy "designacoes delete admin" on public.designacoes for delete
  using (public.is_admin(auth.uid()));

-- sessões
create policy "sessoes read" on public.sessoes for select
  using (public.has_any_role(auth.uid()));
create policy "sessoes write" on public.sessoes for insert
  with check (public.has_any_role(auth.uid()));
create policy "sessoes update" on public.sessoes for update
  using (public.is_admin(auth.uid()));
create policy "sessoes delete admin" on public.sessoes for delete
  using (public.is_admin(auth.uid()));

-- presenças: todos com papel podem registrar
create policy "presencas read" on public.presencas for select
  using (public.has_any_role(auth.uid()));
create policy "presencas insert" on public.presencas for insert
  with check (public.has_any_role(auth.uid()));
create policy "presencas update" on public.presencas for update
  using (public.has_any_role(auth.uid()));
create policy "presencas delete admin" on public.presencas for delete
  using (public.is_admin(auth.uid()));

-- Seed das 14 macas
insert into public.macas (numero, nome, cor_hex) values
  (1, 'Maca 1 - Branca', '#FFFFFF'),
  (2, 'Maca 2 - Azul', '#3B82F6'),
  (3, 'Maca 3 - Verde', '#10B981'),
  (4, 'Maca 4 - Amarela', '#F59E0B'),
  (5, 'Maca 5 - Vermelha', '#EF4444'),
  (6, 'Maca 6 - Rosa', '#EC4899'),
  (7, 'Maca 7 - Roxa', '#8B5CF6'),
  (8, 'Maca 8 - Laranja', '#F97316'),
  (9, 'Maca 9 - Turquesa', '#14B8A6'),
  (10, 'Maca 10 - Índigo', '#6366F1'),
  (11, 'Maca 11 - Lima', '#84CC16'),
  (12, 'Maca 12 - Âmbar', '#D97706'),
  (13, 'Maca 13 - Violeta', '#A855F7'),
  (14, 'Maca 14 - Cinza', '#6B7280');

-- Realtime
alter publication supabase_realtime add table public.presencas;
alter publication supabase_realtime add table public.designacoes;
