-- Conta de demonstração (treino de vendedores etc.): não passa pelo cadastro obrigatório,
-- para não ser preciso inventar CPF. Todas as outras contas seguem a regra normal.
alter table governanca.people add column if not exists conta_demonstracao boolean not null default false;

create or replace function public.meu_cadastro()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
  if p.conta_demonstracao then
    return jsonb_build_object('logado', true, 'precisa', false, 'motivo', 'demonstracao', 'faltando', '[]'::jsonb,
      'nome', p.full_name, 'telefone', p.phone, 'email', coalesce(nullif(p.email, ''), v_email_conta),
      'email_conta', v_email_conta, 'email_fixo', true, 'tem_cpf', false, 'cpf_final', null, 'confirmado_em', p.cadastro_confirmado_em);
  end if;
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
    'email_conta', v_email_conta, 'email_fixo', coalesce(p.email, '') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$',
    'tem_cpf', public.cpf_valido(v_cpf),
    'cpf_final', case when public.cpf_valido(v_cpf) then right(v_cpf, 2) end,
    'confirmado_em', p.cadastro_confirmado_em);
end $function$;

update governanca.people set conta_demonstracao = true where email = 'glebejr+vendedor@gmail.com';
