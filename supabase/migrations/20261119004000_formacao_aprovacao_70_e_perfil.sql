-- Formação: aprovação com 70% de presença, critério das avaliações guardado no curso e situação no perfil do aluno.
-- 1) A presença mínima para aprovação passa de 75% para 70% do total de aulas do curso.
-- 2) "Exigir aprovação nas avaliações" deixa de ser uma escolha do aparelho e vira configuração do curso
--    (formacao.courses.approval_requires_assessments), para o painel e o perfil do aluno mostrarem a mesma situação.
--    Começa ligado no ESDE I e no ESDE II.
-- 3) public.meu_resumo() devolve, em cada curso com presença por link, o bloco "aprovacao":
--    presenças, mínimo de presenças, avaliações aprovadas, total de avaliações, se o curso exige avaliações e se está aprovado.

alter table formacao.courses add column if not exists approval_requires_assessments boolean not null default false;
update formacao.courses set approval_requires_assessments = true where title in ('ESDE I', 'ESDE II');

create or replace function formacao.definir_criterio_avaliacoes(p_course uuid, p_exige boolean) returns boolean
language plpgsql security definer set search_path = formacao, public as $$
begin
  if not (formacao.is_admin(auth.uid()) or formacao.facilita(p_course)) then
    raise exception 'Sem permissão para mudar os critérios deste curso.';
  end if;
  update formacao.courses set approval_requires_assessments = coalesce(p_exige, false) where id = p_course;
  return coalesce(p_exige, false);
end $$;
revoke all on function formacao.definir_criterio_avaliacoes(uuid, boolean) from public, anon;
grant execute on function formacao.definir_criterio_avaliacoes(uuid, boolean) to authenticated;

-- Painel por aluno: "aprovado" continua sendo só o critério de presença, agora com 70%.
create or replace function formacao.painel_presenca(p_course uuid)
returns table (
  user_id uuid, full_name text, email text, matriculado boolean,
  presencas integer, total_aulas integer, percentual integer, aprovado boolean,
  avaliacoes_aprovadas integer, total_avaliacoes integer
)
language sql stable security definer set search_path = formacao, public as $$
  with total as (
    select count(*)::int as n from formacao.lessons l join formacao.modules m on m.id = l.module_id where m.course_id = p_course
  ),
  pres as (
    select pe.user_id, count(*)::int as n from formacao.presencas_efetivas(p_course) pe group by pe.user_id
  ),
  avals as (
    select a.id from formacao.assessments a where a.course_id = p_course and a.status::text = 'published'
  ),
  total_av as (select count(*)::int as n from avals),
  aprov as (
    select t.user_id, count(distinct t.assessment_id)::int as n
    from formacao.assessment_attempts t
    where t.passed and t.assessment_id in (select id from avals)
    group by t.user_id
  ),
  matriculados as (
    select e.user_id from formacao.enrollments e where e.course_id = p_course and e.status = 'approved'
  ),
  alunos as (
    select user_id, true as matriculado from matriculados
    union all
    select p.user_id, false from pres p where p.user_id not in (select user_id from matriculados)
  )
  select a.user_id, pf.full_name, pf.email, a.matriculado,
         coalesce(p.n, 0), t.n,
         case when t.n > 0 then round(coalesce(p.n, 0) * 100.0 / t.n)::int else 0 end,
         t.n > 0 and coalesce(p.n, 0) * 100 >= 70 * t.n,
         coalesce(ap.n, 0), ta.n
  from alunos a
  join formacao.profiles pf on pf.id = a.user_id
  cross join total t
  cross join total_av ta
  left join pres p on p.user_id = a.user_id
  left join aprov ap on ap.user_id = a.user_id
  where formacao.is_admin(auth.uid()) or formacao.facilita(p_course)
  order by pf.full_name
$$;

-- Situação de aprovação de uma pessoa num curso (uso interno do meu_resumo).
create or replace function formacao.situacao_aprovacao(p_course uuid, p_user uuid) returns jsonb
language sql stable security definer set search_path = formacao, public as $$
  with n as (
    select
      (select count(*)::int from formacao.lessons l join formacao.modules m on m.id = l.module_id where m.course_id = p_course) as aulas,
      (select count(*)::int from formacao.presencas_efetivas(p_course) pe where pe.user_id = p_user) as presencas,
      (select count(*)::int from formacao.assessments a where a.course_id = p_course and a.status::text = 'published') as avaliacoes,
      (select count(distinct t.assessment_id)::int from formacao.assessment_attempts t
         join formacao.assessments a on a.id = t.assessment_id
        where a.course_id = p_course and a.status::text = 'published' and t.user_id = p_user and t.passed) as aprovadas,
      (select c.approval_requires_assessments from formacao.courses c where c.id = p_course) as exige
  )
  select jsonb_build_object(
    'presencas', presencas,
    'total_aulas', aulas,
    'minimo_presencas', ceil(aulas * 70 / 100.0)::int,
    'avaliacoes_aprovadas', aprovadas,
    'total_avaliacoes', avaliacoes,
    'exige_avaliacoes', exige,
    'aprovado', aulas > 0 and presencas * 100 >= 70 * aulas and (not exige or aprovadas >= avaliacoes)
  ) from n
$$;
revoke all on function formacao.situacao_aprovacao(uuid, uuid) from public, anon, authenticated;

create or replace function public.meu_resumo(p_user uuid default null::uuid)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_formacao jsonb;
  v_atend jsonb := null;
  v_papeis text[];
begin
  if v_uid is null then raise exception 'Não autorizado'; end if;
  if p_user is not null and p_user <> v_uid then
    if not governanca.has_role(v_uid, 'admin') then raise exception 'Sem permissão'; end if;
    v_uid := p_user;
  end if;

  select jsonb_build_object(
    'cursos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'titulo', c.title, 'capa', coalesce(c.thumbnail_url, c.cover_url), 'status', e.status,
        'inicio', c.start_date, 'fim', c.end_date, 'horario', c.schedule,
        'aulas', (select count(*) from formacao.lessons l join formacao.modules m on m.id = l.module_id where m.course_id = c.id),
        'concluidas', (select count(*) from formacao.lesson_progress lp join formacao.lessons l on l.id = lp.lesson_id
                        join formacao.modules m on m.id = l.module_id where m.course_id = c.id and lp.user_id = v_uid and lp.completed),
        -- Situação de aprovação: só nos cursos com presença por link e para quem tem a matrícula aprovada
        'aprovacao', case when e.status = 'approved' and exists (
                            select 1 from formacao.attendance_links al join formacao.lessons l on l.id = al.lesson_id
                            join formacao.modules m on m.id = l.module_id where m.course_id = c.id)
                          then formacao.situacao_aprovacao(c.id, v_uid) else null end)
        order by e.created_at desc)
      from formacao.enrollments e join formacao.courses c on c.id = e.course_id where e.user_id = v_uid), '[]'::jsonb),
    'presencas', (select count(*) from formacao.attendance_records where user_id = v_uid),
    'avaliacoes_aprovadas', (select count(*) from formacao.assessment_attempts where user_id = v_uid and passed),
    'admin', coalesce(formacao.is_admin(v_uid), false)
  ) into v_formacao;

  select array_agg(role::text order by role::text) into v_papeis from atendimento.user_roles where user_id = v_uid;
  if v_papeis is not null then
    v_atend := jsonb_build_object(
      'papeis', to_jsonb(v_papeis),
      'macas', coalesce((select jsonb_agg(jsonb_build_object('nome', m.nome, 'numero', m.numero, 'dia', m.dia, 'cor', m.cor_hex) order by m.numero)
                  from atendimento.maca_mediuns mm join atendimento.macas m on m.id = mm.maca_id where mm.user_id = v_uid and m.ativa), '[]'::jsonb),
      'dialogos', (select count(*) from atendimento.consulentes where dialogador_id = v_uid),
      'dialogos_mes', (select count(*) from atendimento.consulentes where dialogador_id = v_uid
                         and coalesce(data_dialogo, created_at::date) >= date_trunc('month', current_date)::date),
      'acompanhamentos_ativos', (select count(*) from atendimento.designacoes where dialogador_id = v_uid and status::text = 'ativa'));
  end if;

  return jsonb_build_object('formacao', v_formacao, 'atendimento', v_atend);
end $function$;
