-- Painel de acessos: marcar a pessoa como voluntária (ou tirar) direto na ficha.
-- Voluntário = papel "trabalhador" em governanca.person_roles, que exige CPF (gatilho person_roles_validate).
-- Se faltar CPF, o painel pede e a função grava junto. Só o administrador geral muda.

create or replace function governanca.painel_voluntario(p_person uuid, p_ativo boolean, p_cpf text default null) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare
  p governanca.people;
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), '');
  v_tipo text := governanca.painel_tipo('governanca.person_roles', 'role');
begin
  perform governanca.painel_exigir('governanca');
  select * into p from governanca.people where id = p_person;
  if p.id is null then raise exception 'Pessoa não encontrada.'; end if;

  if p_ativo then
    if length(regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g')) < 11 then
      if v_cpf is null or length(v_cpf) <> 11 then raise exception 'Para ser voluntário é preciso o CPF (11 números).'; end if;
      if exists (select 1 from governanca.people o where o.cpf = v_cpf and o.id <> p.id) then
        raise exception 'Este CPF já está no cadastro de outra pessoa. Confira em Pessoas.';
      end if;
      update governanca.people set cpf = v_cpf where id = p.id;
    end if;
    if not exists (select 1 from governanca.person_roles where person_id = p.id and role::text = 'trabalhador' and ended_at is null) then
      if exists (select 1 from governanca.person_roles where person_id = p.id and role::text = 'trabalhador' and started_at = current_date) then
        update governanca.person_roles set ended_at = null where person_id = p.id and role::text = 'trabalhador' and started_at = current_date;
      else
        execute format('insert into governanca.person_roles (person_id, role, started_at) values ($1, $2::%s, current_date)', v_tipo) using p.id, 'trabalhador';
      end if;
    end if;
  else
    update governanca.person_roles set ended_at = current_date where person_id = p.id and role::text = 'trabalhador' and ended_at is null;
  end if;

  -- A Formação guarda o mesmo dado em profiles.user_type (o gatilho de lá só deixa o admin da Formação mudar)
  if p.user_id is not null and exists (select 1 from formacao.user_roles r where r.user_id = auth.uid() and r.role::text = 'admin') then
    update formacao.profiles set user_type = (case when p_ativo then 'trabalhador' else 'frequentador' end)::formacao.user_type where id = p.user_id;
  end if;

  perform governanca.painel_registrar(p_person, 'governanca', case when p_ativo then 'marcou como voluntário' else 'tirou de voluntário' end, '{}'::jsonb);
  return governanca.painel_acessos(p_person);
end $$;

revoke all on function governanca.painel_voluntario(uuid, boolean, text) from public, anon;
grant execute on function governanca.painel_voluntario(uuid, boolean, text) to authenticated;

-- A ficha do painel passa a dizer se a pessoa já tem CPF (sem mostrar o número)
do $$
declare v_def text;
begin
  select pg_get_functiondef('governanca.painel_acessos(uuid)'::regprocedure) into v_def;
  if position('''tem_cpf''' in v_def) = 0 then
    v_def := replace(v_def, $a$'user_id', v_user,$a$,
      $b$'user_id', v_user, 'tem_cpf', length(regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g')) >= 11,$b$);
    execute v_def;
  end if;
end $$;

notify pgrst, 'reload schema';
