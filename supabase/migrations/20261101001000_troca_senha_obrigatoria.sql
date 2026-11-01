-- Troca de senha obrigatória em toda a plataforma (site, Formação e Atendimento).
-- Uma conta precisa trocar a senha quando recebeu uma senha provisória: a marca fica em
-- auth.users.raw_app_meta_data (must_change_password) e, por compatibilidade, no perfil do Atendimento.
-- A marca antiga da Formação (formacao.profiles) não é lida: veio da importação marcada para 163 contas
-- e nunca foi aplicada lá. As três áreas consultam e limpam a marca pelas funções abaixo.

create or replace function public.precisa_trocar_senha()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    coalesce((select (u.raw_app_meta_data->>'must_change_password')::boolean from auth.users u where u.id = auth.uid()), false)
    or exists (select 1 from atendimento.profiles p where p.id = auth.uid() and p.must_change_password)
  );
$$;

create or replace function public.concluir_troca_senha()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Entre na plataforma.'; end if;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'must_change_password' where id = auth.uid();
  update atendimento.profiles set must_change_password = false where id = auth.uid() and must_change_password;
  update formacao.profiles set must_change_password = false where id = auth.uid() and must_change_password;
end;
$$;

revoke all on function public.precisa_trocar_senha() from public, anon;
revoke all on function public.concluir_troca_senha() from public, anon;
grant execute on function public.precisa_trocar_senha() to authenticated;
grant execute on function public.concluir_troca_senha() to authenticated;
