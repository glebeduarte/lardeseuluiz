-- Formação: aula marcada como concluída também soma como presença.
-- Presença de um aluno numa aula = confirmou pelo link da aula OU marcou a aula como concluída
-- (formacao.lesson_progress), neste segundo caso só para quem tem matrícula aprovada no curso.
-- A regra fica em formacao.presencas_efetivas e é usada pelo painel por aluno, pela contagem por aula
-- e pela lista de presentes de cada aula.

create or replace function formacao.presencas_efetivas(p_course uuid)
returns table (user_id uuid, lesson_id uuid, quando timestamptz, forma text)
language sql stable security definer set search_path = formacao, public as $$
  with aulas as (
    select l.id from formacao.lessons l join formacao.modules m on m.id = l.module_id where m.course_id = p_course
  )
  select ar.user_id, ar.lesson_id, ar.confirmed_at, 'link'::text
  from formacao.attendance_records ar where ar.lesson_id in (select id from aulas)
  union all
  select lp.user_id, lp.lesson_id, lp.completed_at, 'conclusao'::text
  from formacao.lesson_progress lp
  where lp.completed and lp.lesson_id in (select id from aulas)
    and exists (select 1 from formacao.enrollments e
                where e.user_id = lp.user_id and e.course_id = p_course and e.status = 'approved')
    and not exists (select 1 from formacao.attendance_records ar
                    where ar.user_id = lp.user_id and ar.lesson_id = lp.lesson_id)
$$;
revoke all on function formacao.presencas_efetivas(uuid) from public, anon, authenticated;

-- Painel por aluno (mesma assinatura de antes; muda só a origem das presenças).
create or replace function formacao.painel_presenca(p_course uuid)
returns table (
  user_id uuid, full_name text, email text, matriculado boolean,
  presencas integer, total_aulas integer, percentual integer, aprovado boolean
)
language sql stable security definer set search_path = formacao, public as $$
  with total as (
    select count(*)::int as n from formacao.lessons l join formacao.modules m on m.id = l.module_id where m.course_id = p_course
  ),
  pres as (
    select pe.user_id, count(*)::int as n from formacao.presencas_efetivas(p_course) pe group by pe.user_id
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
         t.n > 0 and coalesce(p.n, 0) * 100 >= 75 * t.n
  from alunos a
  join formacao.profiles pf on pf.id = a.user_id
  cross join total t
  left join pres p on p.user_id = a.user_id
  where formacao.is_admin(auth.uid()) or formacao.facilita(p_course)
  order by pf.full_name
$$;

-- Quantos presentes em cada aula do curso.
create or replace function formacao.painel_presenca_aulas(p_course uuid)
returns table (lesson_id uuid, presentes integer)
language sql stable security definer set search_path = formacao, public as $$
  select pe.lesson_id, count(*)::int
  from formacao.presencas_efetivas(p_course) pe
  where formacao.is_admin(auth.uid()) or formacao.facilita(p_course)
  group by pe.lesson_id
$$;
revoke all on function formacao.painel_presenca_aulas(uuid) from public, anon;
grant execute on function formacao.painel_presenca_aulas(uuid) to authenticated;

-- Quem esteve presente numa aula, e de que forma (link da aula ou aula marcada como concluída).
create or replace function formacao.painel_presenca_aula(p_lesson uuid)
returns table (user_id uuid, full_name text, email text, quando timestamptz, forma text)
language sql stable security definer set search_path = formacao, public as $$
  with curso as (
    select m.course_id as id from formacao.lessons l join formacao.modules m on m.id = l.module_id where l.id = p_lesson
  )
  select pe.user_id, pf.full_name, pf.email, pe.quando, pe.forma
  from curso c
  cross join lateral formacao.presencas_efetivas(c.id) pe
  join formacao.profiles pf on pf.id = pe.user_id
  where pe.lesson_id = p_lesson
    and (formacao.is_admin(auth.uid()) or formacao.facilita(c.id))
  order by pe.quando nulls last, pf.full_name
$$;
revoke all on function formacao.painel_presenca_aula(uuid) from public, anon;
grant execute on function formacao.painel_presenca_aula(uuid) to authenticated;
