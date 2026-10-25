-- Formação: papel de Facilitador.
-- O facilitador é o voluntário que conduz um curso. Ele lança a presença das aulas e vê os alunos
-- só dos cursos que facilita (formacao.course_facilitators). Não cria cursos nem mexe no resto da administração.
-- O papel 'facilitador' em formacao.user_roles acompanha a lista: entra com o primeiro curso e sai com o último.
-- (O valor do enum foi acrescentado antes, na migração formacao_papel_facilitador.)

create table if not exists formacao.course_facilitators (
  course_id uuid not null references formacao.courses(id) on delete cascade,
  user_id uuid not null references formacao.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, user_id)
);
alter table formacao.course_facilitators enable row level security;
create policy facilitadores_ver on formacao.course_facilitators for select to authenticated
  using (user_id = auth.uid() or formacao.is_admin(auth.uid()));
grant select on formacao.course_facilitators to authenticated;

create or replace function formacao.facilita(p_course uuid) returns boolean
language sql stable security definer set search_path = formacao, public as $$
  select exists (select 1 from formacao.course_facilitators f where f.course_id = p_course and f.user_id = auth.uid())
$$;
create or replace function formacao.facilita_aula(p_lesson uuid) returns boolean
language sql stable security definer set search_path = formacao, public as $$
  select exists (select 1 from formacao.lessons l join formacao.modules m on m.id = l.module_id
                 join formacao.course_facilitators f on f.course_id = m.course_id
                 where l.id = p_lesson and f.user_id = auth.uid())
$$;
create or replace function formacao.facilita_aluno(p_user uuid) returns boolean
language sql stable security definer set search_path = formacao, public as $$
  select exists (select 1 from formacao.enrollments e join formacao.course_facilitators f on f.course_id = e.course_id
                 where e.user_id = p_user and f.user_id = auth.uid())
$$;
grant execute on function formacao.facilita(uuid), formacao.facilita_aula(uuid), formacao.facilita_aluno(uuid) to authenticated;

-- Leitura do que o facilitador precisa (políticas somam às que já existem)
create policy facilitador_ve_curso on formacao.courses for select to authenticated using (formacao.facilita(id));
create policy facilitador_ve_modulos on formacao.modules for select to authenticated using (formacao.facilita(course_id));
create policy facilitador_ve_aulas on formacao.lessons for select to authenticated
  using (exists (select 1 from formacao.modules m where m.id = lessons.module_id and formacao.facilita(m.course_id)));
create policy facilitador_ve_matriculas on formacao.enrollments for select to authenticated using (formacao.facilita(course_id));
create policy facilitador_ve_alunos on formacao.profiles for select to authenticated using (formacao.facilita_aluno(id));

-- Presença: gerar link, ver e corrigir as presenças das aulas dos seus cursos
create policy facilitador_links on formacao.attendance_links for all to authenticated
  using (formacao.facilita_aula(lesson_id)) with check (formacao.facilita_aula(lesson_id));
create policy facilitador_ve_presencas on formacao.attendance_records for select to authenticated using (formacao.facilita_aula(lesson_id));
create policy facilitador_tira_presenca on formacao.attendance_records for delete to authenticated using (formacao.facilita_aula(lesson_id));

-- minhas_areas(): avisa a barra e o "O que você quer fazer?" que a pessoa facilita cursos
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.minhas_areas'::regproc) into v_def;
  if position('''formacao_facilitador''' in v_def) = 0 then
    v_def := replace(v_def, $a$'formacao_admin', coalesce(formacao.is_admin(v_uid), false),$a$,
      $b$'formacao_admin', coalesce(formacao.is_admin(v_uid), false),
    'formacao_facilitador', exists (select 1 from formacao.course_facilitators f where f.user_id = v_uid),$b$);
    execute v_def;
  end if;
end $$;

-- Painel de acessos: ligar e desligar "facilita este curso"
create or replace function governanca.painel_facilitador(p_person uuid, p_curso uuid, p_ativo boolean) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare
  p governanca.people;
  v_titulo text;
  v_tipo text;
begin
  perform governanca.painel_exigir('formacao');
  select * into p from governanca.people where id = p_person;
  if p.id is null then raise exception 'Pessoa não encontrada.'; end if;
  if p.user_id is null then raise exception 'Esta pessoa ainda não tem login. Crie o acesso primeiro.'; end if;
  select title into v_titulo from formacao.courses where id = p_curso;
  if v_titulo is null then raise exception 'Curso não encontrado.'; end if;

  if p_ativo then
    v_tipo := case when exists (select 1 from governanca.person_roles pr where pr.person_id = p.id and pr.role::text = 'trabalhador' and pr.ended_at is null)
                   then 'trabalhador' else 'frequentador' end;
    insert into formacao.profiles (id, full_name, email, phone, role, user_type, is_active, must_change_password)
    values (p.user_id, p.full_name, coalesce(p.email, ''), p.phone, 'student', v_tipo::formacao.user_type, true, false)
    on conflict (id) do nothing;
    insert into formacao.course_facilitators (course_id, user_id) values (p_curso, p.user_id) on conflict do nothing;
    perform governanca.painel_inserir_papel('formacao.user_roles', p.user_id, 'facilitador');
  else
    delete from formacao.course_facilitators where course_id = p_curso and user_id = p.user_id;
    if not exists (select 1 from formacao.course_facilitators where user_id = p.user_id) then
      delete from formacao.user_roles where user_id = p.user_id and role::text = 'facilitador';
    end if;
  end if;

  perform governanca.painel_registrar(p_person, 'formacao', case when p_ativo then 'passou a facilitar' else 'deixou de facilitar' end, jsonb_build_object('curso', v_titulo));
  return governanca.painel_acessos(p_person);
end $$;
revoke all on function governanca.painel_facilitador(uuid, uuid, boolean) from public, anon;
grant execute on function governanca.painel_facilitador(uuid, uuid, boolean) to authenticated;

-- A ficha do painel passa a dizer, por curso, se a pessoa facilita
do $$
declare v_def text;
begin
  select pg_get_functiondef('governanca.painel_acessos(uuid)'::regprocedure) into v_def;
  if position('''facilita''' in v_def) = 0 then
    v_def := replace(v_def, $a$'id', c.id, 'titulo', c.title,$a$,
      $b$'id', c.id, 'titulo', c.title, 'facilita', exists (select 1 from formacao.course_facilitators cf where v_user is not null and cf.user_id = v_user and cf.course_id = c.id),$b$);
    execute v_def;
  end if;
end $$;

-- O papel avulso "Facilitador" no painel não é ligado à mão: vem da lista de cursos
do $$
declare v_def text;
begin
  select pg_get_functiondef('governanca.painel_papel(uuid, text, text, boolean)'::regprocedure) into v_def;
  v_def := replace(v_def, $a$if p_papel not in ('student', 'admin') then raise exception 'Papel inválido.'; end if;$a$,
    $b$if p_papel = 'facilitador' then raise exception 'Escolha os cursos que a pessoa facilita, logo abaixo.'; end if;
    if p_papel not in ('student', 'admin') then raise exception 'Papel inválido.'; end if;$b$);
  execute v_def;
end $$;

notify pgrst, 'reload schema';
