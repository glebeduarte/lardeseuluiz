-- Buckets da Formação (aplicado em 13/10/2026)
insert into storage.buckets (id, name, public, file_size_limit) values
  ('formacao', 'formacao', true, 52428800),
  ('formacao-anexos', 'formacao-anexos', false, 52428800)
on conflict (id) do nothing;

create policy formacao_publico_gerir on storage.objects for all to authenticated
  using (bucket_id = 'formacao' and public.tem_permissao('formacao.gerir'))
  with check (bucket_id = 'formacao' and public.tem_permissao('formacao.gerir'));
create policy formacao_anexos_ler on storage.objects for select to authenticated
  using (bucket_id = 'formacao-anexos' and (
    public.gere_formacao()
    or public.tem_matricula(public.curso_da_aula(nullif((storage.foldername(name))[1], '')::uuid))
  ));
create policy formacao_anexos_gerir on storage.objects for all to authenticated
  using (bucket_id = 'formacao-anexos' and public.tem_permissao('formacao.gerir'))
  with check (bucket_id = 'formacao-anexos' and public.tem_permissao('formacao.gerir'));

-- A migração usou uma política temporária (formacao_migracao_temporaria), já desativada
-- (with check false), e funções temporárias migracao_* sem permissão de execução.
-- Remover as duas quando houver confirmação no painel.
