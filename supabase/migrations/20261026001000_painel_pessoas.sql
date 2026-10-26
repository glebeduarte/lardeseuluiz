-- Painel de Pessoas: uma linha por pessoa com papéis, vínculo, secretarias, funções,
-- papéis no Atendimento, macas, cursos da Formação e acesso ao sistema.
-- Só leitura. Liberado para admin, gestor ou quem tem o módulo de gestão.
create or replace function governanca.pessoas_listagem()
returns jsonb
language plpgsql
stable
security definer
set search_path = governanca, public
as $$
declare
  v_uid uuid := auth.uid();
  v_person uuid;
  v_ok boolean;
begin
  if v_uid is null then
    raise exception 'Acesso negado';
  end if;
  select id into v_person from governanca.people where user_id = v_uid limit 1;
  v_ok := governanca.has_role(v_uid, 'admin') or governanca.has_role(v_uid, 'gestor')
          or public.eh_admin()
          or (v_person is not null and exists (
                select 1 from governanca.get_person_permissions(v_person) p
                where p::text = 'modulo_gestao'));
  if not v_ok then
    raise exception 'Acesso negado';
  end if;

  return coalesce((
    select jsonb_agg(linha order by linha->>'nome')
    from (
      select jsonb_build_object(
        'id', pe.id,
        'nome', pe.full_name,
        'email', pe.email,
        'telefone', pe.phone,
        'nascimento', pe.birth_date,
        'tem_cpf', coalesce(length(regexp_replace(pe.cpf, '\D', '', 'g')) >= 11, false),
        'cadastrado_em', pe.created_at,
        'cadastro_confirmado', pe.cadastro_confirmado_em is not null,
        'tem_login', pe.user_id is not null,
        'ultimo_acesso', (select u.last_sign_in_at from auth.users u where u.id = pe.user_id),
        'papeis', coalesce((
          select jsonb_agg(jsonb_build_object('papel', pr.role, 'desde', pr.started_at) order by pr.role)
          from governanca.person_roles pr
          where pr.person_id = pe.id and pr.ended_at is null), '[]'::jsonb),
        'associado', (
          select jsonb_build_object('categoria', am.category, 'situacao', am.status, 'admissao', am.admission_date)
          from governanca.associate_memberships am
          where am.person_id = pe.id and am.exit_date is null
          order by am.admission_date desc limit 1),
        'secretarias', coalesce((
          select jsonb_agg(distinct jsonb_build_object('nome', s.name, 'papel', sm.member_role::text))
          from governanca.secretaria_members sm
          join governanca.secretarias s on s.id = sm.secretaria_id
          where sm.person_id = pe.id), '[]'::jsonb),
        'funcoes', coalesce((
          select jsonb_agg(distinct jsonb_build_object(
                   'nome', f.name, 'categoria', f.category::text, 'contexto', wa.context_type::text,
                   'onde', coalesce(sx.name, pj.name)))
          from governanca.worker_assignments wa
          join governanca.functions f on f.id = wa.function_id
          left join governanca.secretarias sx on wa.context_type::text = 'secretaria' and sx.id = wa.context_id
          left join governanca.projects pj on wa.context_type::text = 'projeto' and pj.id = wa.context_id
          where wa.person_id = pe.id and wa.ended_at is null), '[]'::jsonb),
        'atendimento', coalesce((
          select jsonb_agg(distinct ur.role::text)
          from atendimento.user_roles ur where ur.user_id = pe.user_id), '[]'::jsonb),
        'macas', coalesce((
          select jsonb_agg(distinct jsonb_build_object('numero', m.numero, 'nome', m.nome, 'dia', m.dia::text))
          from atendimento.maca_mediuns mm
          join atendimento.macas m on m.id = mm.maca_id
          where mm.user_id = pe.user_id), '[]'::jsonb),
        'cursos', coalesce((
          select jsonb_agg(distinct jsonb_build_object('curso', c.title, 'status', e.status, 'turma', cg.name))
          from formacao.enrollments e
          join formacao.courses c on c.id = e.course_id
          left join formacao.class_groups cg on cg.id = e.class_group_id
          where e.user_id = pe.user_id), '[]'::jsonb),
        'facilita', coalesce((
          select jsonb_agg(distinct c.title)
          from formacao.course_facilitators cf
          join formacao.courses c on c.id = cf.course_id
          where cf.user_id = pe.user_id), '[]'::jsonb),
        'acesso', coalesce((
          select jsonb_agg(distinct gr.role::text)
          from governanca.user_roles gr where gr.user_id = pe.user_id), '[]'::jsonb)
      ) as linha
      from governanca.people pe
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke execute on function governanca.pessoas_listagem() from public, anon;
grant execute on function governanca.pessoas_listagem() to authenticated;
