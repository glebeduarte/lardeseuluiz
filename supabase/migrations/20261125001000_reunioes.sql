-- Reuniões na Governança: registro de cada reunião da casa com data e hora, local, participantes,
-- pauta inicial, transcrição (texto ou arquivo) e anotações em blocos (editor no estilo do Notion).
-- Pauta e anotações ficam em jsonb (blocos do editor). Mídias e arquivos vão para o bucket privado "reunioes".
-- Acesso (ler e editar): admin, gestão ou direção. Conferido aqui no banco e também na tela.

create table if not exists governanca.reunioes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Reunião',
  data_hora timestamptz,
  local text,
  participantes text[] not null default '{}',
  pauta jsonb,
  anotacoes jsonb,
  transcricao_texto text,
  -- { caminho, nome, tamanho } do arquivo de transcrição no bucket "reunioes"
  transcricao_arquivo jsonb,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now()
);
create index if not exists reunioes_data_idx on governanca.reunioes (data_hora desc nulls last);

create or replace function governanca.pode_ver_reunioes()
returns boolean language sql stable security definer set search_path = governanca, public
as $$
  select auth.uid() is not null and (
    coalesce(governanca.has_role(auth.uid(), 'admin'), false)
    or coalesce(governanca.eh_gestao(), false)
    or coalesce(governanca.eh_direcao(), false)
  )
$$;
revoke all on function governanca.pode_ver_reunioes() from public;
grant execute on function governanca.pode_ver_reunioes() to authenticated;

create or replace function governanca.reunioes_marcar_alteracao()
returns trigger language plpgsql set search_path = governanca, public
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end $$;

drop trigger if exists reunioes_marcar_alteracao on governanca.reunioes;
create trigger reunioes_marcar_alteracao before update on governanca.reunioes
  for each row execute function governanca.reunioes_marcar_alteracao();

alter table governanca.reunioes enable row level security;
drop policy if exists "Reuniões: gestão e direção" on governanca.reunioes;
create policy "Reuniões: gestão e direção" on governanca.reunioes for all to authenticated
  using (governanca.pode_ver_reunioes()) with check (governanca.pode_ver_reunioes());
revoke all on governanca.reunioes from anon;
grant select, insert, update, delete on governanca.reunioes to authenticated;

-- Arquivos das reuniões (imagens, vídeos, áudios, documentos e transcrições): bucket privado, até 50 MB por arquivo.
insert into storage.buckets (id, name, public, file_size_limit)
values ('reunioes', 'reunioes', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "reunioes: gestão e direção leem" on storage.objects;
create policy "reunioes: gestão e direção leem" on storage.objects for select to authenticated
  using (bucket_id = 'reunioes' and governanca.pode_ver_reunioes());
drop policy if exists "reunioes: gestão e direção enviam" on storage.objects;
create policy "reunioes: gestão e direção enviam" on storage.objects for insert to authenticated
  with check (bucket_id = 'reunioes' and governanca.pode_ver_reunioes());
drop policy if exists "reunioes: gestão e direção alteram" on storage.objects;
create policy "reunioes: gestão e direção alteram" on storage.objects for update to authenticated
  using (bucket_id = 'reunioes' and governanca.pode_ver_reunioes())
  with check (bucket_id = 'reunioes' and governanca.pode_ver_reunioes());
drop policy if exists "reunioes: gestão e direção removem" on storage.objects;
create policy "reunioes: gestão e direção removem" on storage.objects for delete to authenticated
  using (bucket_id = 'reunioes' and governanca.pode_ver_reunioes());
