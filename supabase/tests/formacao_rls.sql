-- Testes de acesso da Formação. Termina com erro de propósito: tudo é desfeito
-- e a mensagem traz o resultado de cada caso (toda linha deve começar com "t"/"true").
do $t$
declare res text := ''; ok boolean; v_aluno uuid; v_curso uuid; v_aval uuid; v_vol_curso uuid;
begin
  select m.pessoa_id, m.curso_id, a.id into v_aluno, v_curso, v_aval
    from public.matriculas m join public.avaliacoes a on a.curso_id = m.curso_id and a.situacao = 'publicada'
    join public.pessoa_estagios e on e.pessoa_id = m.pessoa_id and e.fim is null and e.estagio = 'frequentador'
   where m.situacao = 'aprovada' limit 1;
  select id into v_vol_curso from public.cursos where publico = 'voluntarios' and situacao = 'publicado' and inscricoes_abertas limit 1;
  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  values ('00000000-0000-4000-a000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aluno@teste.lsl', now(), now());
  update public.pessoas set user_id = '00000000-0000-4000-a000-0000000000f1' where id = v_aluno;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000f1","role":"authenticated"}', true);
  select count(*) > 0 into ok from public.aulas where public.curso_da_aula(id) = v_curso; res := res || format(E'\n%s aluno vê aulas do próprio curso', ok);
  select count(*) = 0 into ok from public.questoes; res := res || format(E'\n%s aluno não lê gabarito', ok);
  select count(*) > 0 into ok from public.questoes_para_responder(v_aval); res := res || format(E'\n%s aluno recebe questões sem gabarito', ok);
  begin
    perform public.inscrever_em_curso(v_vol_curso);
    res := res || E'\nfalse frequentador bloqueado em curso de voluntários';
  exception when others then res := res || E'\ntrue frequentador bloqueado em curso de voluntários'; end;
  begin
    insert into public.matriculas (pessoa_id, curso_id, situacao) select v_aluno, id, 'aprovada' from public.cursos where id <> v_curso limit 1;
    res := res || E'\nfalse aluno não se matricula direto na tabela';
  exception when others then res := res || E'\ntrue aluno não se matricula direto na tabela'; end;
  execute 'reset role';
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) = 0 into ok from public.aulas; res := res || format(E'\n%s visitante não vê aulas', ok);
  execute 'reset role';
  raise exception 'RESULTADOS (tudo desfeito):%', res;
end $t$;
