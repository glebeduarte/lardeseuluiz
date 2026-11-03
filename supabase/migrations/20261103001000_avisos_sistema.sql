-- Avisos para a gestão em todo o sistema (não só na Formação).
-- Uma tabela única, public.avisos, recebe os avisos de todas as áreas. Cada aviso tem uma área,
-- e só vê o aviso quem cuida daquela área. O administrador geral vê todos.
-- A leitura é por pessoa (public.avisos_lidos): quando um admin marca como lido, os outros continuam vendo como novo.

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('geral','governanca','formacao','atendimento','rifas')),
  tipo text not null,
  titulo text not null,
  descricao text not null default '',
  link text,
  related_id uuid,
  criado_em timestamptz not null default now()
);
create index if not exists avisos_criado_em_idx on public.avisos (criado_em desc);
create index if not exists avisos_area_idx on public.avisos (area);

create table if not exists public.avisos_lidos (
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (aviso_id, user_id)
);

-- Quem pode ver avisos de uma área.
create or replace function public.pode_ver_aviso(p_area text)
returns boolean language plpgsql stable security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  if coalesce(governanca.has_role(v_uid, 'admin'), false) then return true; end if;
  return case p_area
    when 'geral' then false
    when 'formacao' then coalesce(formacao.is_admin(v_uid), false)
    when 'atendimento' then coalesce(atendimento.is_admin(v_uid), false)
    when 'governanca' then coalesce(governanca.eh_gestao(), false) or coalesce(governanca.eh_direcao(), false)
    when 'rifas' then coalesce(governanca.opera_rifas(), false)
    else false
  end;
end $$;
grant execute on function public.pode_ver_aviso(text) to authenticated;

alter table public.avisos enable row level security;
alter table public.avisos_lidos enable row level security;

drop policy if exists "Ver avisos da minha área" on public.avisos;
create policy "Ver avisos da minha área" on public.avisos for select to authenticated
  using (public.pode_ver_aviso(area));

drop policy if exists "Ver minhas leituras" on public.avisos_lidos;
create policy "Ver minhas leituras" on public.avisos_lidos for select to authenticated
  using (user_id = auth.uid());

-- Avisos de quem está logado, com a marca de lido.
create or replace function public.meus_avisos(p_limite int default 50)
returns table (id uuid, area text, tipo text, titulo text, descricao text, link text, related_id uuid, criado_em timestamptz, lido boolean)
language sql stable security definer set search_path = public
as $$
  select a.id, a.area, a.tipo, a.titulo, a.descricao, a.link, a.related_id, a.criado_em,
         exists (select 1 from public.avisos_lidos l where l.aviso_id = a.id and l.user_id = auth.uid())
    from public.avisos a
   where public.pode_ver_aviso(a.area)
   order by a.criado_em desc
   limit least(greatest(coalesce(p_limite, 50), 1), 200)
$$;
grant execute on function public.meus_avisos(int) to authenticated;

-- Marca como lidos os avisos informados, ou todos os que a pessoa vê (p_ids nulo).
create or replace function public.marcar_avisos_lidos(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = public
as $$
declare v_qtd int;
begin
  if auth.uid() is null then return 0; end if;
  insert into public.avisos_lidos (aviso_id, user_id)
  select a.id, auth.uid() from public.avisos a
   where public.pode_ver_aviso(a.area) and (p_ids is null or a.id = any(p_ids))
  on conflict do nothing;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end $$;
grant execute on function public.marcar_avisos_lidos(uuid[]) to authenticated;

-- Função interna para as áreas criarem avisos (gatilhos e funções do banco).
create or replace function public.criar_aviso(p_area text, p_tipo text, p_titulo text, p_descricao text, p_link text default null, p_related uuid default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.avisos (area, tipo, titulo, descricao, link, related_id)
  values (p_area, p_tipo, p_titulo, coalesce(p_descricao, ''), p_link, p_related)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.criar_aviso(text, text, text, text, text, uuid) from public, anon, authenticated;

-- Formação: os gatilhos existentes passam a gravar no aviso único.
create or replace function formacao.create_enrollment_notification()
returns trigger language plpgsql security definer set search_path to 'formacao', 'public', 'extensions'
as $$
declare user_name text; course_title text;
begin
  if new.status = 'pending' then
    select full_name into user_name from formacao.profiles where id = new.user_id;
    select title into course_title from formacao.courses where id = new.course_id;
    perform public.criar_aviso('formacao', 'inscricao', 'Nova solicitação de inscrição',
      coalesce(user_name, 'Pessoa') || ' pediu inscrição em "' || coalesce(course_title, 'curso') || '"',
      '/formacao/admin/enrollments', new.id);
  end if;
  return new;
end $$;

create or replace function formacao.create_user_registration_notification()
returns trigger language plpgsql security definer set search_path to 'formacao', 'public', 'extensions'
as $$
begin
  if new.role = 'student' then
    perform public.criar_aviso('formacao', 'cadastro_aluno', 'Novo aluno cadastrado',
      coalesce(nullif(new.full_name, ''), new.email) || ' se cadastrou na Formação',
      '/formacao/admin/students', new.id);
  end if;
  return new;
end $$;

-- Governança: nova pessoa no cadastro geral.
create or replace function governanca.aviso_nova_pessoa()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(new.conta_demonstracao, false) then return new; end if;
  perform public.criar_aviso('governanca', 'nova_pessoa', 'Nova pessoa cadastrada',
    coalesce(nullif(new.full_name, ''), new.email, 'Sem nome') || ' entrou no cadastro de pessoas',
    '/app/pessoas', new.id);
  return new;
end $$;
drop trigger if exists aviso_nova_pessoa on governanca.people;
create trigger aviso_nova_pessoa after insert on governanca.people for each row execute function governanca.aviso_nova_pessoa();

-- Avisos não lidos da Formação que já existiam.
insert into public.avisos (area, tipo, titulo, descricao, link, related_id, criado_em)
select 'formacao',
       case when type = 'enrollment' then 'inscricao' else 'cadastro_aluno' end,
       title, description,
       case when type = 'enrollment' then '/formacao/admin/enrollments' else '/formacao/admin/students' end,
       related_id, created_at
  from formacao.notifications
 where not is_read;

-- Tempo real: o sino recebe o aviso novo sem recarregar (respeita a política de leitura acima).
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'avisos') then
    alter publication supabase_realtime add table public.avisos;
  end if;
end $$;
