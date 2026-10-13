-- PENDENTE DE APLICAR (a ferramenta de migração bloqueia comandos DELETE; rode no SQL Editor do Supabase).
-- Quando a pessoa sai da função, sai também o acesso que só aquela função tinha liberado
-- (registrado em governanca.acessos_por_funcao). Acessos dados à mão na Formação ou no Atendimento não são tocados.
create or replace function governanca.retirar_acessos(p_person uuid) returns void
language plpgsql security definer set search_path = governanca, public as $$
declare v_user uuid; r record;
begin
  select user_id into v_user from governanca.people where id = p_person;
  if v_user is null then return; end if;
  for r in select a.sistema, a.papel from governanca.acessos_por_funcao a
            where a.user_id = v_user
              and not exists (select 1 from governanca.acessos_desejados(p_person) d where d.sistema = a.sistema and d.papel = a.papel) loop
    if r.sistema = 'formacao' then
      delete from formacao.user_roles where user_id = v_user and role::text = r.papel;
    else
      delete from atendimento.user_roles where user_id = v_user and role::text = r.papel;
    end if;
    delete from governanca.acessos_por_funcao where user_id = v_user and sistema = r.sistema and papel = r.papel;
  end loop;
end $$;
revoke execute on function governanca.retirar_acessos(uuid) from public, anon, authenticated;

create or replace function governanca.sincronizar_acessos(p_person uuid) returns void
language plpgsql security definer set search_path = governanca, public as $$
begin
  perform governanca.conceder_acessos(p_person);
  perform governanca.retirar_acessos(p_person);
end $$;
