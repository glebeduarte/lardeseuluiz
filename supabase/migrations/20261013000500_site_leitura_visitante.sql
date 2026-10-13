-- Visitantes sem login não executam funções de permissão: políticas separadas por papel
alter policy atividades_ler on public.atividades to authenticated
  using (publico and ativa or public.tem_permissao('site.publicar'));
create policy atividades_ler_publico on public.atividades for select to anon using (publico and ativa);

alter policy eventos_ler on public.eventos to authenticated
  using (publicado or public.tem_permissao('site.publicar'));
create policy eventos_ler_publico on public.eventos for select to anon using (publicado);

alter policy interesse_enviar on public.interesses_voluntariado to authenticated
  with check (situacao = 'novo' and (pessoa_id is null or pessoa_id = public.pessoa_atual()));
create policy interesse_enviar_publico on public.interesses_voluntariado for insert to anon
  with check (situacao = 'novo' and pessoa_id is null);
