-- Testes de acesso do núcleo de identidade.
-- Roda tudo dentro de um bloco que termina com erro de propósito: o banco desfaz
-- todas as alterações e a mensagem de erro traz o resultado de cada caso.
-- Uso: colar no SQL Editor do Supabase ou rodar via execute_sql. Toda linha deve começar com "t" ou "true".
-- A: frequentador | B: voluntário com Acolhimento | C: voluntário Diretor | D: admin técnico

do $t$
declare res text := ''; ok boolean; n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
    ('00000000-0000-4000-a000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@teste.lsl', now(), '{"nome":"Teste A"}', now(), now()),
    ('00000000-0000-4000-a000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@teste.lsl', now(), '{"nome":"Teste B"}', now(), now()),
    ('00000000-0000-4000-a000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@teste.lsl', now(), '{"nome":"Teste C"}', now(), now()),
    ('00000000-0000-4000-a000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@teste.lsl', now(), '{"nome":"Teste D"}', now(), now());

  select count(*) = 4 into ok from public.pessoas p join public.pessoa_estagios e on e.pessoa_id = p.id and e.fim is null and e.estagio = 'frequentador' where p.email like '%@teste.lsl';
  res := res || format(E'\n%s conta nova vira pessoa frequentadora', ok);

  update public.pessoa_estagios set fim = current_date where fim is null and pessoa_id in (select id from public.pessoas where email in ('b@teste.lsl','c@teste.lsl'));
  insert into public.pessoa_estagios (pessoa_id, estagio, motivo) select id, 'voluntario', 'teste' from public.pessoas where email in ('b@teste.lsl','c@teste.lsl');
  insert into public.pessoa_funcoes (pessoa_id, funcao_id) select p.id, f.id from public.pessoas p, public.funcoes f where p.email = 'b@teste.lsl' and f.slug = 'acolhimento';
  insert into public.pessoa_cargos (pessoa_id, area_id, cargo) select p.id, a.id, 'diretor' from public.pessoas p, public.areas a where p.email = 'c@teste.lsl' and a.slug = 'direcao';
  insert into public.admins_plataforma (user_id) values ('00000000-0000-4000-a000-00000000000d');

  begin
    insert into public.pessoa_cargos (pessoa_id, area_id, cargo) select p.id, a.id, 'membro' from public.pessoas p, public.areas a where p.email = 'a@teste.lsl' and a.slug = 'social';
    res := res || E'\nfalse frequentador não recebe cargo';
  exception when others then res := res || E'\ntrue frequentador não recebe cargo'; end;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);
  select count(*) = 1 into ok from public.pessoas; res := res || format(E'\n%s A vê só o próprio cadastro', ok);
  select count(*) = 0 into ok from public.minhas_permissoes(); res := res || format(E'\n%s A não tem permissões', ok);
  update public.pessoas set telefone = '(84) 99999-0000' where user_id = auth.uid();
  select telefone = '84999990000' into ok from public.pessoas where user_id = auth.uid(); res := res || format(E'\n%s A edita o próprio telefone', ok);
  begin
    update public.pessoas set cpf = '12345678901' where user_id = auth.uid();
    res := res || E'\nfalse A não altera o próprio CPF';
  exception when others then res := res || E'\ntrue A não altera o próprio CPF'; end;
  begin
    insert into public.pessoa_funcoes (pessoa_id, funcao_id) select public.pessoa_atual(), id from public.funcoes where slug = 'dialogador';
    res := res || E'\nfalse A não se atribui função';
  exception when others then res := res || E'\ntrue A não se atribui função'; end;
  select count(*) = 0 into ok from public.pessoa_cargos where cargo = 'diretor'; res := res || format(E'\n%s A não vê organograma (é frequentador)', ok);
  execute 'reset role';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
  select count(*) = 4 into ok from public.pessoas where email like '%@teste.lsl'; res := res || format(E'\n%s B vê os 4 cadastros', ok);
  res := res || format(E'\n%s B tem atendimento.acolhimento', public.tem_permissao('atendimento.acolhimento'));
  res := res || format(E'\n%s B não tem atendimento.dialogo', not public.tem_permissao('atendimento.dialogo'));
  update public.pessoas set observacoes = 'x' where email = 'a@teste.lsl';
  get diagnostics n = row_count; res := res || format(E'\n%s B não edita cadastro alheio', n = 0);
  execute 'reset role';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}', true);
  res := res || format(E'\n%s C tem governanca.financeiro', public.tem_permissao('governanca.financeiro'));
  res := res || format(E'\n%s C lê auditoria', public.tem_permissao('auditoria.ler'));
  res := res || format(E'\n%s C não abre ficha de maca', not public.tem_permissao('atendimento.maca'));
  begin
    insert into public.pessoa_funcoes (pessoa_id, funcao_id) select p.id, f.id from public.pessoas p, public.funcoes f where p.email = 'b@teste.lsl' and f.slug = 'dialogador';
    res := res || E'\ntrue C atribui função a voluntário';
  exception when others then res := res || E'\nfalse C atribui função a voluntário: ' || sqlerrm; end;
  execute 'reset role';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000d","role":"authenticated"}', true);
  res := res || format(E'\n%s D configura a plataforma', public.tem_permissao('plataforma.configurar'));
  res := res || format(E'\n%s D não abre dados sensíveis', not public.tem_permissao('atendimento.dialogo') and not public.tem_permissao('auditoria.ler'));
  execute 'reset role';

  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) = 13 into ok from public.areas; res := res || format(E'\n%s visitante vê as áreas públicas', ok);
  select count(*) = 0 into ok from public.pessoas; res := res || format(E'\n%s visitante não vê pessoas', ok);
  begin
    perform public.minhas_permissoes();
    res := res || E'\nfalse visitante não chama funções de permissão';
  exception when others then res := res || E'\ntrue visitante não chama funções de permissão'; end;
  execute 'reset role';

  raise exception 'RESULTADOS (tudo desfeito):%', res;
end $t$;
