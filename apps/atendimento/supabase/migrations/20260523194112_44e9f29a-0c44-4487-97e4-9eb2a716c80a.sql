-- Adiciona campo opcional 'como_chamar' à tabela profiles
ALTER TABLE public.profiles ADD COLUMN como_chamar text;

-- Atualiza o trigger handle_new_user para popular o novo campo
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, nome, email, telefone, data_nascimento, must_change_password, como_chamar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'telefone', ''),
    nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false),
    nullif(new.raw_user_meta_data->>'como_chamar', '')
  )
  on conflict (id) do update set
    nome = excluded.nome,
    telefone = coalesce(excluded.telefone, public.profiles.telefone),
    data_nascimento = coalesce(excluded.data_nascimento, public.profiles.data_nascimento),
    must_change_password = excluded.must_change_password,
    como_chamar = coalesce(excluded.como_chamar, public.profiles.como_chamar);
  return new;
end;
$function$;