-- Formação: presença e conclusão de aula passam a andar juntas.
-- 1) Toda presença registrada pelo link da aula marca a aula como concluída para aquela pessoa
--    (formacao.lesson_progress), como se ela tivesse concluído o vídeo.
-- 2) As presenças já registradas recebem a mesma conclusão.
-- 3) formacao.painel_presenca(curso) devolve, por aluno, as presenças, o total de aulas do curso,
--    o percentual e se está aprovado (75% de presença sobre o total de aulas).
-- Zerar a presença de uma aula não desfaz a conclusão: a pessoa pode ter assistido ao vídeo.

create or replace function formacao.presenca_conclui_aula() returns trigger
language plpgsql security definer set search_path = formacao, public as $$
begin
  insert into formacao.lesson_progress (user_id, lesson_id, completed, completed_at)
  values (new.user_id, new.lesson_id, true, coalesce(new.confirmed_at, now()))
  on conflict (user_id, lesson_id) do update
    set completed = true,
        completed_at = coalesce(formacao.lesson_progress.completed_at, excluded.completed_at)
    where formacao.lesson_progress.completed is not true;
  return new;
end $$;
revoke all on function formacao.presenca_conclui_aula() from public, anon, authenticated;

drop trigger if exists presenca_conclui_aula on formacao.attendance_records;
create trigger presenca_conclui_aula after insert on formacao.attendance_records
  for each row execute function formacao.presenca_conclui_aula();

-- Acerto do que já existe. O gatilho de "última atividade" fica desligado só durante o acerto,
-- para não registrar atividade de hoje em quem esteve presente semanas atrás.
alter table formacao.lesson_progress disable trigger on_lesson_progress_update_activity;
insert into formacao.lesson_progress (user_id, lesson_id, completed, completed_at)
select ar.user_id, ar.lesson_id, true, coalesce(ar.confirmed_at, now())
from formacao.attendance_records ar
on conflict (user_id, lesson_id) do update
  set completed = true,
      completed_at = coalesce(formacao.lesson_progress.completed_at, excluded.completed_at)
  where formacao.lesson_progress.completed is not true;
alter table formacao.lesson_progress enable trigger on_lesson_progress_update_activity;

-- Painel de presença por aluno. Só administrador da Formação ou facilitador do curso recebe linhas.
create or replace function formacao.painel_presenca(p_course uuid)
returns table (
  user_id uuid, full_name text, email text, matriculado boolean,
  presencas integer, total_aulas integer, percentual integer, aprovado boolean
)
language sql stable security definer set search_path = formacao, public as $$
  with aulas as (
    select l.id from formacao.lessons l join formacao.modules m on m.id = l.module_id where m.course_id = p_course
  ),
  total as (select count(*)::int as n from aulas),
  pres as (
    select ar.user_id, count(*)::int as n
    from formacao.attendance_records ar where ar.lesson_id in (select id from aulas)
    group by ar.user_id
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
revoke all on function formacao.painel_presenca(uuid) from public, anon;
grant execute on function formacao.painel_presenca(uuid) to authenticated;
