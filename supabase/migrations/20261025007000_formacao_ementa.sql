-- Formação: ementa pública dos cursos publicados para quem está logado.
-- Mostra só títulos de módulos e aulas (sem vídeo, sem material), para a vitrine dizer
-- quantas aulas cada curso tem e o aluno ver o conteúdo antes de se inscrever.
create or replace function formacao.ementa_cursos(p_curso uuid default null)
returns table (course_id uuid, module_id uuid, module_title text, module_order int, lesson_id uuid, lesson_title text, lesson_order int)
language sql stable security definer set search_path = formacao, public as $$
  select m.course_id, m.id, m.title, coalesce(m.order_index, 0), l.id, l.title, coalesce(l.order_index, 0)
    from formacao.modules m
    join formacao.courses c on c.id = m.course_id and c.status = 'published'
    left join formacao.lessons l on l.module_id = m.id
   where auth.uid() is not null and (p_curso is null or m.course_id = p_curso)
   order by m.course_id, coalesce(m.order_index, 0), coalesce(l.order_index, 0)
$$;
revoke all on function formacao.ementa_cursos(uuid) from public, anon;
grant execute on function formacao.ementa_cursos(uuid) to authenticated;
notify pgrst, 'reload schema';
