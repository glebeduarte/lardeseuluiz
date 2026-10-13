-- Ajustes apontados pelo verificador de segurança do Supabase

-- citext fora do schema público
alter extension citext set schema extensions;
alter function public.vincular_conta() set search_path = public, extensions;

-- Funções de autorização não ficam disponíveis para visitantes sem login
revoke execute on function public.pessoa_atual() from public, anon;
revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.estagio_atual(uuid) from public, anon;
revoke execute on function public.eh_voluntario() from public, anon;
revoke execute on function public.tem_funcao(text) from public, anon;
revoke execute on function public.tem_cargo(uuid, public.cargo_tipo[]) from public, anon;
revoke execute on function public.eh_diretor() from public, anon;
revoke execute on function public.minhas_permissoes() from public, anon;
revoke execute on function public.tem_permissao(text) from public, anon;
grant execute on function public.pessoa_atual(), public.eh_admin(), public.estagio_atual(uuid), public.eh_voluntario(),
  public.tem_funcao(text), public.tem_cargo(uuid, public.cargo_tipo[]), public.eh_diretor(),
  public.minhas_permissoes(), public.tem_permissao(text), public.registrar_acesso(uuid, text, text) to authenticated;

-- O estágio de outra pessoa só é revelado a quem pode ver cadastros.
-- Chamadas internas (triggers e funções do núcleo, executadas pelo dono) continuam vendo tudo.
create or replace function public.estagio_atual(p uuid)
returns public.estagio_casa language sql stable security definer set search_path = public as $$
  select e.estagio from public.pessoa_estagios e
   where e.pessoa_id = p and e.fim is null
     and (
       auth.uid() is null
       or p = (select id from public.pessoas where user_id = auth.uid())
       or exists (select 1 from public.minhas_permissoes() m where m in ('pessoas.ler', 'pessoas.atribuir', 'pessoas.aprovar_voluntario'))
     )
$$;
