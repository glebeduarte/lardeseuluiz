-- Painel único de acessos (/app/acessos)
-- Uma tela, três colunas: Atendimento, Formação e Governança. Cada coluna liga e desliga o que a pessoa pode fazer
-- naquele sistema. Quem edita:
--   admin da Governança  -> as três colunas
--   admin do Atendimento -> só a coluna do Atendimento
--   admin da Formação    -> só a coluna da Formação
-- Tudo passa por funções SECURITY DEFINER que conferem esse direito antes de gravar, e cada mudança fica no
-- registro governanca.acessos_log (quem mudou, o quê e quando).
--
-- Este arquivo tem comandos DELETE dentro das funções. Rode no Supabase > SQL Editor.

-- ---------------------------------------------------------------------------------------------------------------
-- Registro das mudanças
create table if not exists governanca.acessos_log (
  id uuid primary key default gen_random_uuid(),
  feito_por uuid not null,
  person_id uuid not null references governanca.people(id) on delete cascade,
  sistema text not null check (sistema in ('atendimento', 'formacao', 'governanca')),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists acessos_log_pessoa_idx on governanca.acessos_log (person_id, criado_em desc);
alter table governanca.acessos_log enable row level security;
drop policy if exists acessos_log_ver on governanca.acessos_log;
create policy acessos_log_ver on governanca.acessos_log for select to authenticated using (governanca.has_role(auth.uid(), 'admin'));
grant select on governanca.acessos_log to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Quem pode editar o quê
create or replace function governanca.painel_direitos() returns jsonb
language sql stable security definer set search_path = governanca, public as $$
  with d as (
    select governanca.has_role(auth.uid(), 'admin') as gov,
           exists (select 1 from atendimento.user_roles r where r.user_id = auth.uid() and r.role::text = 'admin') as atend_admin,
           exists (select 1 from formacao.user_roles r where r.user_id = auth.uid() and r.role::text = 'admin') as form_admin
  )
  select jsonb_build_object(
    'governanca', gov,
    'atendimento', gov or atend_admin,
    'formacao', gov or form_admin,
    'criar_acesso', gov or governanca.has_role(auth.uid(), 'gestor'),
    'algum', gov or atend_admin or form_admin)
  from d
$$;

create or replace function governanca.painel_exigir(p_sistema text) returns void
language plpgsql stable security definer set search_path = governanca, public as $$
declare d jsonb := governanca.painel_direitos();
begin
  if auth.uid() is null then raise exception 'Entre na plataforma.'; end if;
  if not coalesce((d ->> p_sistema)::boolean, false) then
    raise exception 'Você não pode alterar acessos de %.', case p_sistema when 'atendimento' then 'Atendimento' when 'formacao' then 'Formação' else 'Governança' end;
  end if;
end $$;

create or replace function governanca.painel_registrar(p_person uuid, p_sistema text, p_acao text, p_detalhe jsonb) returns void
language sql security definer set search_path = governanca, public as $$
  insert into governanca.acessos_log (feito_por, person_id, sistema, acao, detalhe) values (auth.uid(), p_person, p_sistema, p_acao, coalesce(p_detalhe, '{}'::jsonb))
$$;

-- Tipo de uma coluna (os enums foram copiados para schemas diferentes; assim não dependemos do nome do tipo)
create or replace function governanca.painel_tipo(p_tab regclass, p_col text) returns text
language sql stable security definer set search_path = governanca, public as $$
  select format_type(a.atttypid, a.atttypmod) from pg_attribute a where a.attrelid = p_tab and a.attname = p_col and not a.attisdropped
$$;

-- Dá um papel numa tabela user_roles (user_id, role) sem duplicar
create or replace function governanca.painel_inserir_papel(p_tab regclass, p_user uuid, p_papel text) returns void
language plpgsql security definer set search_path = governanca, public as $$
begin
  execute format('insert into %s (user_id, role) select $1, $2::%s where not exists (select 1 from %s r where r.user_id = $1 and r.role::text = $2)',
                 p_tab, governanca.painel_tipo(p_tab, 'role'), p_tab) using p_user, p_papel;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Busca de pessoas (o admin do Atendimento ou da Formação não lê governanca.people direto)
create or replace function governanca.painel_pessoas(p_busca text default null, p_limite int default 40) returns jsonb
language plpgsql stable security definer set search_path = governanca, public as $$
declare v_busca text := nullif(trim(coalesce(p_busca, '')), '');
begin
  if not coalesce((governanca.painel_direitos() ->> 'algum')::boolean, false) then raise exception 'Sem acesso ao painel.'; end if;
  return coalesce((
    select jsonb_agg(x order by x->>'nome')
    from (
      select jsonb_build_object(
        'id', p.id, 'nome', p.full_name, 'email', p.email, 'telefone', p.phone, 'foto', p.photo_url, 'tem_login', p.user_id is not null,
        'voluntario', exists (select 1 from governanca.person_roles pr where pr.person_id = p.id and pr.role::text = 'trabalhador' and pr.ended_at is null),
        'papeis', (
          (select count(*) from atendimento.user_roles r where p.user_id is not null and r.user_id = p.user_id)
        + (select count(*) from formacao.user_roles r where p.user_id is not null and r.user_id = p.user_id and r.role::text = 'admin')
        + (select count(*) from governanca.user_roles r where p.user_id is not null and r.user_id = p.user_id and r.role::text in ('admin', 'gestor')))
      ) x
      from governanca.people p
      where v_busca is null
         or p.full_name ilike '%' || v_busca || '%'
         or p.email ilike '%' || v_busca || '%'
         or regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') like '%' || regexp_replace(v_busca, '\D', '', 'g') || '%' and length(regexp_replace(v_busca, '\D', '', 'g')) >= 4
      order by p.full_name
      limit greatest(1, least(p_limite, 200))
    ) s), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Tudo o que a pessoa tem, nas três colunas
create or replace function governanca.painel_acessos(p_person uuid) returns jsonb
language plpgsql stable security definer set search_path = governanca, public as $$
declare
  d jsonb := governanca.painel_direitos();
  p governanca.people;
  v_user uuid;
begin
  if not coalesce((d ->> 'algum')::boolean, false) then raise exception 'Sem acesso ao painel.'; end if;
  select * into p from governanca.people where id = p_person;
  if p.id is null then raise exception 'Pessoa não encontrada.'; end if;
  v_user := p.user_id;

  return jsonb_build_object(
    'direitos', d,
    'pessoa', jsonb_build_object(
      'id', p.id, 'nome', p.full_name, 'email', p.email, 'telefone', p.phone, 'foto', p.photo_url, 'user_id', v_user,
      'tipos', coalesce((select jsonb_agg(distinct pr.role::text) from governanca.person_roles pr where pr.person_id = p.id and pr.ended_at is null), '[]'::jsonb)),

    'atendimento', jsonb_build_object(
      'papeis', coalesce((select jsonb_agg(distinct r.role::text) from atendimento.user_roles r where v_user is not null and r.user_id = v_user), '[]'::jsonb),
      'via_funcao', coalesce((select jsonb_agg(distinct a.papel) from governanca.acessos_por_funcao a where v_user is not null and a.user_id = v_user and a.sistema = 'atendimento'), '[]'::jsonb),
      'ativo', coalesce((select ap.ativo from atendimento.profiles ap where ap.id = v_user), true),
      'macas', coalesce((select jsonb_agg(jsonb_build_object('numero', m.numero, 'nome', m.nome, 'dia', m.dia::text, 'cor', m.cor_hex) order by m.dia::text, m.numero)
                         from atendimento.maca_mediuns mm join atendimento.macas m on m.id = mm.maca_id
                         where v_user is not null and mm.user_id = v_user and m.ativa), '[]'::jsonb)),

    'formacao', jsonb_build_object(
      'papeis', coalesce((select jsonb_agg(distinct r.role::text) from formacao.user_roles r where v_user is not null and r.user_id = v_user), '[]'::jsonb),
      'via_funcao', coalesce((select jsonb_agg(distinct a.papel) from governanca.acessos_por_funcao a where v_user is not null and a.user_id = v_user and a.sistema = 'formacao'), '[]'::jsonb),
      'cursos', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id, 'titulo', c.title, 'status', c.status, 'inicio', c.start_date,
          'turmas', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.name) order by g.created_at) from formacao.class_groups g where g.course_id = c.id), '[]'::jsonb),
          'matricula', (select jsonb_build_object('id', e.id, 'status', e.status, 'turma', e.class_group_id)
                          from formacao.enrollments e where v_user is not null and e.user_id = v_user and e.course_id = c.id
                          order by e.created_at desc limit 1))
          order by (exists (select 1 from formacao.enrollments e where v_user is not null and e.user_id = v_user and e.course_id = c.id)) desc, c.start_date desc nulls last, c.title)
        from formacao.courses c where c.status <> 'archived'), '[]'::jsonb)),

    'governanca', jsonb_build_object(
      'papeis', coalesce((select jsonb_agg(distinct r.role::text) from governanca.user_roles r where v_user is not null and r.user_id = v_user), '[]'::jsonb),
      'modulos', coalesce((select jsonb_agg(distinct x::text) from governanca.get_person_permissions(p.id) x), '[]'::jsonb),
      'funcoes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', w.id, 'funcao', f.name, 'funcao_id', f.id, 'categoria', f.category::text, 'contexto', w.context_type::text,
          'contexto_nome', case w.context_type::text
                             when 'secretaria' then (select s.name from governanca.secretarias s where s.id = w.context_id)
                             when 'projeto' then (select pj.name from governanca.projects pj where pj.id = w.context_id)
                             else 'Casa' end,
          'inicio', w.started_at) order by f.name)
        from governanca.worker_assignments w join governanca.functions f on f.id = w.function_id
        where w.person_id = p.id and w.ended_at is null), '[]'::jsonb),
      'secretarias', coalesce((
        select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.name,
          'papel', (select sm.member_role::text from governanca.secretaria_members sm where sm.secretaria_id = s.id and sm.person_id = p.id limit 1)) order by s.name)
        from governanca.secretarias s where s.is_active), '[]'::jsonb),
      'rifas', coalesce((
        select jsonb_agg(jsonb_build_object('id', r.id, 'titulo', r.title, 'status', r.status::text,
          'vende', exists (select 1 from governanca.raffle_sellers rs where rs.raffle_id = r.id and rs.person_id = p.id)) order by r.created_at desc)
        from governanca.raffles r where r.status::text in ('rascunho', 'vendendo')), '[]'::jsonb),
      'opcoes_funcoes', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'nome', f.name, 'categoria', f.category::text) order by f.category::text, f.name)
                                  from governanca.functions f where f.is_active), '[]'::jsonb),
      'opcoes_projetos', coalesce((select jsonb_agg(jsonb_build_object('id', pj.id, 'nome', pj.name) order by pj.name)
                                   from governanca.projects pj where pj.status::text <> 'encerrado'), '[]'::jsonb)),

    'historico', case when (d ->> 'governanca')::boolean then coalesce((
      select jsonb_agg(jsonb_build_object('quando', l.criado_em, 'sistema', l.sistema, 'acao', l.acao, 'detalhe', l.detalhe,
             'por', coalesce((select pp.full_name from governanca.people pp where pp.user_id = l.feito_por limit 1), 'Sistema')) order by l.criado_em desc)
      from (select * from governanca.acessos_log where person_id = p.id order by criado_em desc limit 15) l), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Ligar e desligar um papel
create or replace function governanca.painel_papel(p_person uuid, p_sistema text, p_papel text, p_ativo boolean) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare
  p governanca.people;
  v_tipo text;
begin
  perform governanca.painel_exigir(p_sistema);
  select * into p from governanca.people where id = p_person;
  if p.id is null then raise exception 'Pessoa não encontrada.'; end if;
  if p.user_id is null then raise exception 'Esta pessoa ainda não tem login. Crie o acesso primeiro.'; end if;

  if p_sistema = 'atendimento' then
    if p_papel not in ('recepcao', 'dialogador', 'medium', 'admin') then raise exception 'Papel inválido.'; end if;
    if not p_ativo and exists (select 1 from governanca.acessos_por_funcao a where a.user_id = p.user_id and a.sistema = 'atendimento' and a.papel = p_papel) then
      raise exception 'Este papel vem de uma função da pessoa na Governança. Para tirar, encerre a função.';
    end if;
    if p_ativo then
      insert into atendimento.profiles (id, nome, email, ativo, must_change_password, telefone)
      values (p.user_id, p.full_name, coalesce(p.email, ''), true, false, p.phone)
      on conflict (id) do update set ativo = true;
      perform governanca.painel_inserir_papel('atendimento.user_roles', p.user_id, p_papel);
    else
      if p.user_id = auth.uid() and p_papel = 'admin' then raise exception 'Você não pode tirar o seu próprio papel de administrador.'; end if;
      delete from atendimento.user_roles where user_id = p.user_id and role::text = p_papel;
    end if;

  elsif p_sistema = 'formacao' then
    if p_papel not in ('student', 'admin') then raise exception 'Papel inválido.'; end if;
    if not p_ativo and exists (select 1 from governanca.acessos_por_funcao a where a.user_id = p.user_id and a.sistema = 'formacao' and a.papel = p_papel) then
      raise exception 'Este papel vem de uma função da pessoa na Governança. Para tirar, encerre a função.';
    end if;
    v_tipo := case when exists (select 1 from governanca.person_roles pr where pr.person_id = p.id and pr.role::text = 'trabalhador' and pr.ended_at is null)
                   then 'trabalhador' else 'frequentador' end;
    insert into formacao.profiles (id, full_name, email, phone, role, user_type, is_active, must_change_password)
    values (p.user_id, p.full_name, coalesce(p.email, ''), p.phone, 'student', v_tipo::formacao.user_type, true, false)
    on conflict (id) do nothing;
    if p_ativo then
      perform governanca.painel_inserir_papel('formacao.user_roles', p.user_id, p_papel);
    else
      if p.user_id = auth.uid() and p_papel = 'admin' then raise exception 'Você não pode tirar o seu próprio papel de administrador.'; end if;
      delete from formacao.user_roles where user_id = p.user_id and role::text = p_papel;
    end if;

  elsif p_sistema = 'governanca' then
    if p_papel not in ('admin', 'gestor', 'trabalhador', 'aluno') then raise exception 'Papel inválido.'; end if;
    if p_ativo then
      perform governanca.painel_inserir_papel('governanca.user_roles', p.user_id, p_papel);
    else
      if p.user_id = auth.uid() and p_papel = 'admin' then raise exception 'Você não pode tirar o seu próprio papel de administrador.'; end if;
      delete from governanca.user_roles where user_id = p.user_id and role::text = p_papel;
    end if;
  else
    raise exception 'Sistema inválido.';
  end if;

  perform governanca.painel_registrar(p_person, p_sistema, case when p_ativo then 'deu papel' else 'tirou papel' end, jsonb_build_object('papel', p_papel));
  return governanca.painel_acessos(p_person);
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Formação: matricular, trocar de turma ou tirar do curso
create or replace function governanca.painel_matricula(p_person uuid, p_curso uuid, p_turma uuid, p_ativo boolean) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare
  p governanca.people;
  v_turma uuid := p_turma;
  v_tipo text;
  v_titulo text;
begin
  perform governanca.painel_exigir('formacao');
  select * into p from governanca.people where id = p_person;
  if p.id is null then raise exception 'Pessoa não encontrada.'; end if;
  if p.user_id is null then raise exception 'Esta pessoa ainda não tem login. Crie o acesso primeiro.'; end if;
  select title into v_titulo from formacao.courses where id = p_curso;
  if v_titulo is null then raise exception 'Curso não encontrado.'; end if;

  if p_ativo then
    if v_turma is null then
      select g.id into v_turma from formacao.class_groups g where g.course_id = p_curso order by g.created_at limit 1;
    end if;
    if v_turma is null then raise exception 'Este curso ainda não tem turma. Crie uma turma na Formação.'; end if;
    if not exists (select 1 from formacao.class_groups g where g.id = v_turma and g.course_id = p_curso) then raise exception 'Turma não é deste curso.'; end if;

    v_tipo := case when exists (select 1 from governanca.person_roles pr where pr.person_id = p.id and pr.role::text = 'trabalhador' and pr.ended_at is null)
                   then 'trabalhador' else 'frequentador' end;
    insert into formacao.profiles (id, full_name, email, phone, role, user_type, is_active, must_change_password)
    values (p.user_id, p.full_name, coalesce(p.email, ''), p.phone, 'student', v_tipo::formacao.user_type, true, false)
    on conflict (id) do nothing;
    if not exists (select 1 from formacao.user_roles r where r.user_id = p.user_id) then
      perform governanca.painel_inserir_papel('formacao.user_roles', p.user_id, 'student');
    end if;

    if exists (select 1 from formacao.enrollments e where e.user_id = p.user_id and e.course_id = p_curso) then
      update formacao.enrollments set class_group_id = v_turma, status = 'approved' where user_id = p.user_id and course_id = p_curso;
    else
      insert into formacao.enrollments (user_id, course_id, class_group_id, status) values (p.user_id, p_curso, v_turma, 'approved');
    end if;
  else
    delete from formacao.enrollments where user_id = p.user_id and course_id = p_curso;
  end if;

  perform governanca.painel_registrar(p_person, 'formacao', case when p_ativo then 'matriculou' else 'tirou do curso' end, jsonb_build_object('curso', v_titulo, 'turma', v_turma));
  return governanca.painel_acessos(p_person);
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Governança: secretarias, funções e rifas
create or replace function governanca.painel_secretaria(p_person uuid, p_secretaria uuid, p_papel text) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare v_nome text;
begin
  perform governanca.painel_exigir('governanca');
  select name into v_nome from governanca.secretarias where id = p_secretaria;
  if v_nome is null then raise exception 'Secretaria não encontrada.'; end if;
  if p_papel is null or p_papel = '' then
    delete from governanca.secretaria_members where secretaria_id = p_secretaria and person_id = p_person;
  elsif p_papel in ('coordenador', 'participante') then
    if exists (select 1 from governanca.secretaria_members where secretaria_id = p_secretaria and person_id = p_person) then
      execute format('update governanca.secretaria_members set member_role = $1::%s where secretaria_id = $2 and person_id = $3',
                     governanca.painel_tipo('governanca.secretaria_members', 'member_role')) using p_papel, p_secretaria, p_person;
    else
      execute format('insert into governanca.secretaria_members (secretaria_id, person_id, member_role) values ($1, $2, $3::%s)',
                     governanca.painel_tipo('governanca.secretaria_members', 'member_role')) using p_secretaria, p_person, p_papel;
    end if;
  else
    raise exception 'Papel inválido.';
  end if;
  perform governanca.painel_registrar(p_person, 'governanca', 'secretaria', jsonb_build_object('secretaria', v_nome, 'papel', nullif(p_papel, '')));
  return governanca.painel_acessos(p_person);
end $$;

create or replace function governanca.painel_funcao_dar(p_person uuid, p_funcao uuid, p_contexto text, p_contexto_id uuid) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare v_nome text;
begin
  perform governanca.painel_exigir('governanca');
  select name into v_nome from governanca.functions where id = p_funcao and is_active;
  if v_nome is null then raise exception 'Função não encontrada.'; end if;
  if p_contexto not in ('casa', 'secretaria', 'projeto') then raise exception 'Escolha onde a pessoa vai atuar.'; end if;
  if p_contexto <> 'casa' and p_contexto_id is null then raise exception 'Escolha a secretaria ou o projeto.'; end if;
  execute format('insert into governanca.worker_assignments (person_id, function_id, context_type, context_id, started_at, assigned_by) values ($1, $2, $3::%s, $4, current_date, $5)',
                 governanca.painel_tipo('governanca.worker_assignments', 'context_type'))
    using p_person, p_funcao, p_contexto, case when p_contexto = 'casa' then null else p_contexto_id end, auth.uid();
  perform governanca.painel_registrar(p_person, 'governanca', 'deu função', jsonb_build_object('funcao', v_nome, 'onde', p_contexto));
  return governanca.painel_acessos(p_person);
end $$;

create or replace function governanca.painel_funcao_encerrar(p_person uuid, p_atribuicao uuid) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare v_nome text;
begin
  perform governanca.painel_exigir('governanca');
  select f.name into v_nome from governanca.worker_assignments w join governanca.functions f on f.id = w.function_id
   where w.id = p_atribuicao and w.person_id = p_person;
  if v_nome is null then raise exception 'Função não encontrada para esta pessoa.'; end if;
  update governanca.worker_assignments set ended_at = current_date where id = p_atribuicao;
  perform governanca.painel_registrar(p_person, 'governanca', 'encerrou função', jsonb_build_object('funcao', v_nome));
  return governanca.painel_acessos(p_person);
end $$;

create or replace function governanca.painel_rifa(p_person uuid, p_rifa uuid, p_vende boolean) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare v_titulo text;
begin
  if not (coalesce((governanca.painel_direitos() ->> 'governanca')::boolean, false) or governanca.opera_rifas()) then
    raise exception 'Você não pode mudar os vendedores das rifas.';
  end if;
  select title into v_titulo from governanca.raffles where id = p_rifa;
  if v_titulo is null then raise exception 'Rifa não encontrada.'; end if;
  if p_vende then
    insert into governanca.raffle_sellers (raffle_id, person_id) values (p_rifa, p_person) on conflict do nothing;
  else
    delete from governanca.raffle_sellers where raffle_id = p_rifa and person_id = p_person;
  end if;
  perform governanca.painel_registrar(p_person, 'governanca', case when p_vende then 'vende rifa' else 'deixou de vender rifa' end, jsonb_build_object('rifa', v_titulo));
  return governanca.painel_acessos(p_person);
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões: só usuários logados chamam; cada função confere o direito por dentro.
do $$
declare f text;
begin
  foreach f in array array[
    'governanca.painel_direitos()',
    'governanca.painel_pessoas(text, int)',
    'governanca.painel_acessos(uuid)',
    'governanca.painel_papel(uuid, text, text, boolean)',
    'governanca.painel_matricula(uuid, uuid, uuid, boolean)',
    'governanca.painel_secretaria(uuid, uuid, text)',
    'governanca.painel_funcao_dar(uuid, uuid, text, uuid)',
    'governanca.painel_funcao_encerrar(uuid, uuid)',
    'governanca.painel_rifa(uuid, uuid, boolean)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  revoke all on function governanca.painel_exigir(text) from public, anon, authenticated;
  revoke all on function governanca.painel_registrar(uuid, text, text, jsonb) from public, anon, authenticated;
  revoke all on function governanca.painel_tipo(regclass, text) from public, anon, authenticated;
  revoke all on function governanca.painel_inserir_papel(regclass, uuid, text) from public, anon, authenticated;
end $$;

notify pgrst, 'reload schema';
