-- Formação: o painel de presença por aluno passa a informar também as avaliações do curso.
-- avaliacoes_aprovadas = avaliações publicadas do curso em que a pessoa tem ao menos uma tentativa aprovada;
-- total_avaliacoes = avaliações publicadas do curso.
-- A coluna "aprovado" continua sendo só o critério de presença (75%). A tela decide se soma o critério
-- das avaliações (aprovação em todas as avaliações publicadas do curso).
-- O tipo de retorno muda, por isso a função é recriada.

drop function if exists formacao.painel_presenca(uuid);
create function formacao.painel_presenca(p_course uuid)
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
         t.n > 0 and coalesce(p.n, 0) * 100 >= 75 * t.n,
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
revoke all on function formacao.painel_presenca(uuid) from public, anon;
grant execute on function formacao.painel_presenca(uuid) to authenticated;
