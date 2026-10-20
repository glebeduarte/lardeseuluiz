-- O lançador "O que você quer fazer?" precisa saber quais módulos da Governança a pessoa abre.
-- Acrescenta a lista de permissões, a marca de admin e de direção ao retorno de public.minhas_areas().
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.minhas_areas'::regproc) into v_def;
  if position('''permissoes''' in v_def) = 0 then
    v_def := replace(v_def,
      $a$'gestao', governanca.eh_gestao(),$a$,
      $b$'gestao', governanca.eh_gestao(),
    'admin', governanca.has_role(v_uid, 'admin'),
    'direcao', governanca.eh_direcao(),
    'permissoes', coalesce((select jsonb_agg(distinct p::text) from governanca.get_person_permissions(v_pessoa) p), '[]'::jsonb),$b$);
    execute v_def;
  end if;
end $$;

-- Papéis no Atendimento (recepcao, dialogador, medium, admin), para mostrar só as tarefas de cada um.
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.minhas_areas'::regproc) into v_def;
  if position('''atendimento_papeis''' in v_def) = 0 then
    v_def := replace(v_def,
      $a$'gestao', governanca.eh_gestao(),$a$,
      $b$'gestao', governanca.eh_gestao(),
    'atendimento_papeis', coalesce((select jsonb_agg(distinct r.role::text) from atendimento.user_roles r join atendimento.profiles p on p.id = r.user_id
                                    where r.user_id = v_uid and coalesce(p.ativo, true)), '[]'::jsonb),$b$);
    execute v_def;
  end if;
end $$;
