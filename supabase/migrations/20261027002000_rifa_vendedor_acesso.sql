-- Vendedor de rifa: quem a coordenação cadastrou como vendedor vê a tela de venda,
-- mesmo que não seja voluntário (ex.: frequentador que ajuda a vender).
create or replace function public.minhas_areas()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_pessoa uuid;
  v_perms int := 0;
  v_admin boolean;
  v_voluntario boolean := false;
  v_ve_sistemas boolean;
  v_vende boolean := false;
begin
  if v_uid is null then return jsonb_build_object('logado', false); end if;
  select id into v_pessoa from governanca.people where user_id = v_uid limit 1;
  if v_pessoa is not null then
    select count(*) into v_perms from governanca.get_person_permissions(v_pessoa);
    v_voluntario := exists (select 1 from governanca.person_roles pr
                             where pr.person_id = v_pessoa and pr.role::text = 'trabalhador' and pr.ended_at is null);
    v_vende := exists (select 1 from governanca.raffle_sellers s join governanca.raffles r on r.id = s.raffle_id
                        where s.person_id = v_pessoa and r.status = 'vendendo');
  end if;
  v_admin := coalesce(governanca.has_role(v_uid, 'admin'), false);
  v_ve_sistemas := v_voluntario or v_admin;

  return jsonb_build_object(
    'logado', true,
    'voluntario', v_voluntario,
    'governanca', v_vende or (v_ve_sistemas and (governanca.eh_gestao() or v_perms > 0 or governanca.eh_direcao()
                                     or exists (select 1 from governanca.secretaria_members where person_id = v_pessoa))),
    'gestao', v_ve_sistemas and governanca.eh_gestao(),
    'rifas', jsonb_build_object('opera', v_ve_sistemas and governanca.opera_rifas(),
                                'vende', v_vende),
    'atendimento_papeis', case when v_ve_sistemas then coalesce((select jsonb_agg(distinct r.role::text) from atendimento.user_roles r join atendimento.profiles p on p.id = r.user_id
                                    where r.user_id = v_uid and coalesce(p.ativo, true)), '[]'::jsonb) else '[]'::jsonb end,
    'admin', v_admin,
    'direcao', v_ve_sistemas and governanca.eh_direcao(),
    'permissoes', case when v_ve_sistemas then coalesce((select jsonb_agg(distinct p::text) from governanca.get_person_permissions(v_pessoa) p), '[]'::jsonb) else '[]'::jsonb end,
    'formacao', true,
    'formacao_admin', coalesce(formacao.is_admin(v_uid), false),
    'formacao_facilitador', exists (select 1 from formacao.course_facilitators f where f.user_id = v_uid),
    'atendimento', v_ve_sistemas and exists (select 1 from atendimento.user_roles r join atendimento.profiles p on p.id = r.user_id
                            where r.user_id = v_uid and coalesce(p.ativo, true)),
    'nome', coalesce((select full_name from governanca.people where id = v_pessoa),
                     (select full_name from formacao.profiles where id = v_uid)),
    'foto', (select photo_url from governanca.people where id = v_pessoa));
end $function$;
