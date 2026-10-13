-- O aceite marcado na tela de cadastro vira consentimento registrado para dados pessoais
create or replace function public.vincular_conta()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_pessoa uuid;
begin
  if new.email_confirmed_at is null or new.email is null then
    return new;
  end if;
  if exists (select 1 from public.pessoas where user_id = new.id) then
    return new;
  end if;

  select id into v_pessoa from public.pessoas
   where email = new.email::citext and user_id is null
   limit 1;

  if v_pessoa is not null then
    update public.pessoas set user_id = new.id where id = v_pessoa;
  else
    insert into public.pessoas (nome, email, telefone, user_id)
    values (
      coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)),
      new.email,
      nullif(new.raw_user_meta_data->>'telefone', ''),
      new.id
    )
    returning id into v_pessoa;
  end if;

  if public.estagio_atual(v_pessoa) is null then
    insert into public.pessoa_estagios (pessoa_id, estagio, motivo)
    values (v_pessoa, 'frequentador', 'Conta criada no site');
  end if;

  if (new.raw_user_meta_data->>'aceite_dados')::boolean is true
     and not exists (select 1 from public.consentimentos
                      where pessoa_id = v_pessoa and finalidade = 'dados_pessoais' and revogado_em is null) then
    insert into public.consentimentos (pessoa_id, finalidade, concedido, registrado_por, versao_termo)
    values (v_pessoa, 'dados_pessoais', true, v_pessoa, 'cadastro-v1');
  end if;
  return new;
end $$;
