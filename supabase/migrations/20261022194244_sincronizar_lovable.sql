-- Ferramentas da migração: trazer para o banco novo as linhas que mudaram nos sistemas da Lovable.
-- Só o dono do banco (SQL Editor / service role) usa. Nenhum app chama estas funções.
-- Regras aplicadas fora daqui, antes de chamar: o id antigo de Glebe na Lovable vira de11dfa9-...;
-- URLs do armazenamento antigo da Formação viram .../storage/v1/object/public/formacao/migrado/.

create or replace function public.sincronizar_linhas(p_schema text, p_tabela text, p_linhas jsonb)
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare v_cols text[]; v_set text; v_lista text; n int := 0;
begin
  if p_schema not in ('formacao', 'atendimento', 'governanca') then raise exception 'schema não permitido'; end if;
  if not exists (select 1 from information_schema.tables where table_schema = p_schema and table_name = p_tabela) then raise exception 'tabela não permitida'; end if;
  if p_linhas is null or jsonb_array_length(p_linhas) = 0 then return 0; end if;
  select array_agg(c.column_name::text order by c.ordinal_position) into v_cols
    from information_schema.columns c
   where c.table_schema = p_schema and c.table_name = p_tabela
     and c.column_name in (select jsonb_object_keys(p_linhas -> 0));
  v_lista := (select string_agg(format('%I', x), ', ') from unnest(v_cols) x);
  v_set := (select string_agg(format('%I = excluded.%I', x, x), ', ') from unnest(v_cols) x where x <> 'id');
  execute format('alter table %I.%I disable trigger user', p_schema, p_tabela);
  execute format('insert into %I.%I (%s) select %s from jsonb_populate_recordset(null::%I.%I, $1) on conflict (id) do update set %s',
                 p_schema, p_tabela, v_lista, v_lista, p_schema, p_tabela, v_set) using p_linhas;
  get diagnostics n = row_count;
  execute format('alter table %I.%I enable trigger user', p_schema, p_tabela);
  return n;
end $$;
revoke all on function public.sincronizar_linhas(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.sincronizar_linhas(text, text, jsonb) to service_role;

-- Mesma coisa, recebendo as linhas como listas na ordem de p_cols (texto bem menor).
create or replace function public.sincronizar_matriz(p_schema text, p_tabela text, p_cols text[], p_linhas jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_obj jsonb;
begin
  select jsonb_agg((select jsonb_object_agg(p_cols[i], l->(i-1)) from generate_series(1, array_length(p_cols,1)) i))
    into v_obj from jsonb_array_elements(p_linhas) l;
  return public.sincronizar_linhas(p_schema, p_tabela, v_obj);
end $$;
revoke all on function public.sincronizar_matriz(text,text,text[],jsonb) from public, anon, authenticated;

-- Para lesson_progress: ignora linhas da Lovable cujo par (aluno, aula) já existe no sistema novo com outro id
-- (o aluno já marcou a aula como feita aqui). Mantém o registro do sistema novo.
create or replace function public.sincronizar_progresso(p_cols text[], p_linhas jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_obj jsonb;
begin
  select jsonb_agg(o) into v_obj from (
    select (select jsonb_object_agg(p_cols[i], l->(i-1)) from generate_series(1, array_length(p_cols,1)) i) o
    from jsonb_array_elements(p_linhas) l) z
  where not exists (select 1 from formacao.lesson_progress lp
    where lp.user_id = (o->>'user_id')::uuid and lp.lesson_id = (o->>'lesson_id')::uuid and lp.id <> (o->>'id')::uuid);
  if v_obj is null then return 0; end if;
  return public.sincronizar_linhas('formacao', 'lesson_progress', v_obj);
end $$;
revoke all on function public.sincronizar_progresso(text[], jsonb) from public, anon, authenticated;
