-- Cadastro obrigatório: no primeiro acesso (e sempre que faltar algo) a pessoa confirma nome, CPF, telefone e e-mail.
-- A tela aparece nas três áreas (Governança, Formação e Atendimento) e só fecha com os dados válidos.
-- Depois de confirmado, a plataforma pede uma nova confirmação a cada 12 meses.
--
-- Regras:
--   CPF: 11 números com dígitos verificadores certos, sem repetir o de outra pessoa. Depois de gravado, só a secretaria muda.
--   Telefone: DDD + número (10 ou 11 números).
--   E-mail: formato válido; por padrão o mesmo do login.

alter table governanca.people add column if not exists cadastro_confirmado_em timestamptz;

-- CPF válido (dígitos verificadores)
create or replace function public.cpf_valido(p text) returns boolean
language plpgsql immutable set search_path = public as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g'); s int; r int; i int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return false; end if;
  s := 0; for i in 1..9 loop s := s + substr(d, i, 1)::int * (11 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  if r <> substr(d, 10, 1)::int then return false; end if;
  s := 0; for i in 1..10 loop s := s + substr(d, i, 1)::int * (12 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  return r = substr(d, 11, 1)::int;
end $$;

-- A própria pessoa pode preencher CPF e e-mail em branco por esta tela (o gatilho continua barrando mudanças comuns)
create or replace function governanca.people_limitar_edicao_propria() returns trigger
language plpgsql security definer set search_path = governanca, public as $$
begin
  if governanca.eh_gestao() or auth.uid() is null then return new; end if;
  if current_setting('lsl.cadastro_proprio', true) = 'on'
     and (new.cpf is not distinct from old.cpf or not public.cpf_valido(old.cpf))
     and new.user_id is not distinct from old.user_id and new.notes is not distinct from old.notes then
    return new;
  end if;
  if new.cpf is distinct from old.cpf or new.email is distinct from old.email
     or new.user_id is distinct from old.user_id or new.notes is distinct from old.notes then
    raise exception 'CPF, e-mail e observações só podem ser alterados pela secretaria.';
  end if;
  return new;
end $$;

-- Situação do cadastro de quem está logado
create or replace function public.meu_cadastro() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email_conta text;
  p governanca.people;
  v_falta text[] := '{}';
  v_cpf text;
  v_tel text;
begin
  if v_uid is null then return jsonb_build_object('logado', false, 'precisa', false); end if;
  select email into v_email_conta from auth.users where id = v_uid;
  select * into p from governanca.people where user_id = v_uid limit 1;
  v_cpf := regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g');
  v_tel := regexp_replace(coalesce(p.phone, ''), '\D', '', 'g');
  if p.id is null or coalesce(btrim(p.full_name), '') in ('', '(sem nome)') then v_falta := array_append(v_falta, 'nome'); end if;
  if not public.cpf_valido(v_cpf) then v_falta := array_append(v_falta, 'cpf'); end if;
  if length(v_tel) not between 10 and 11 then v_falta := array_append(v_falta, 'telefone'); end if;
  if coalesce(p.email, '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_falta := array_append(v_falta, 'email'); end if;
  return jsonb_build_object(
    'logado', true,
    'precisa', cardinality(v_falta) > 0 or p.cadastro_confirmado_em is null or p.cadastro_confirmado_em < now() - interval '12 months',
    'motivo', case when cardinality(v_falta) > 0 then 'faltando' when p.cadastro_confirmado_em is null then 'primeiro' else 'renovar' end,
    'faltando', to_jsonb(v_falta),
    'nome', nullif(p.full_name, '(sem nome)'),
    'telefone', p.phone,
    'email', coalesce(nullif(p.email, ''), v_email_conta),
    'email_conta', v_email_conta,
    'email_fixo', coalesce(p.email, '') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$',
    'tem_cpf', public.cpf_valido(v_cpf),
    'cpf_final', case when public.cpf_valido(v_cpf) then right(v_cpf, 2) end,
    'confirmado_em', p.cadastro_confirmado_em);
end $$;

-- Grava e confirma o cadastro de quem está logado
create or replace function public.confirmar_meu_cadastro(p_nome text, p_cpf text, p_telefone text, p_email text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email_conta text;
  p governanca.people;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_tel_fmt text;
begin
  if v_uid is null then raise exception 'Entre na plataforma.'; end if;
  select email into v_email_conta from auth.users where id = v_uid;
  select * into p from governanca.people where user_id = v_uid limit 1;
  if p.id is null then
    insert into governanca.people (full_name, email, user_id) values (coalesce(nullif(v_nome, ''), '(sem nome)'), lower(v_email_conta), v_uid) returning * into p;
  end if;

  if length(v_nome) < 5 or position(' ' in v_nome) = 0 then raise exception 'Escreva o nome completo, com sobrenome.'; end if;
  if length(v_tel) not between 10 and 11 then raise exception 'Telefone com DDD, por exemplo (84) 99999-9999.'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Confira o e-mail.'; end if;

  -- CPF: se já existe um válido, fica o que está (só a secretaria muda)
  if public.cpf_valido(p.cpf) then
    v_cpf := regexp_replace(p.cpf, '\D', '', 'g');
  else
    if not public.cpf_valido(v_cpf) then raise exception 'CPF inválido. Confira os 11 números.'; end if;
    if exists (select 1 from governanca.people o where regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g') = v_cpf and o.id <> p.id) then
      raise exception 'Este CPF já está em outro cadastro da Casa. Fale com a secretaria para juntar os dois.';
    end if;
  end if;

  -- E-mail: em branco pode preencher; diferente do que está gravado, só a secretaria troca
  if coalesce(p.email, '') <> '' and lower(p.email) <> v_email then
    raise exception 'Para trocar o e-mail, fale com a secretaria. O seu e-mail cadastrado é %.', p.email;
  end if;

  v_tel_fmt := case when length(v_tel) = 11 then format('(%s) %s-%s', substr(v_tel, 1, 2), substr(v_tel, 3, 5), substr(v_tel, 8, 4))
                    else format('(%s) %s-%s', substr(v_tel, 1, 2), substr(v_tel, 3, 4), substr(v_tel, 7, 4)) end;

  perform set_config('lsl.cadastro_proprio', 'on', true);
  update governanca.people
     set full_name = v_nome, cpf = v_cpf, phone = v_tel_fmt, email = v_email, cadastro_confirmado_em = now()
   where id = p.id;
  perform set_config('lsl.cadastro_proprio', 'off', true);

  return public.meu_cadastro();
end $$;

revoke all on function public.meu_cadastro() from public, anon;
revoke all on function public.confirmar_meu_cadastro(text, text, text, text) from public, anon;
grant execute on function public.meu_cadastro() to authenticated;
grant execute on function public.confirmar_meu_cadastro(text, text, text, text) to authenticated;
grant execute on function public.cpf_valido(text) to authenticated;

notify pgrst, 'reload schema';
