-- Link do grupo de WhatsApp do ESDE, para a tela de confirmação de inscrição.
-- O link fica na descrição da primeira aula do curso ESDE ("Informações Iniciais",
-- módulo "Comece aqui"). A função lê de lá, então trocar o grupo é só editar a aula.
-- Devolve apenas a URL do convite, nunca o restante do conteúdo da aula.

create or replace function formacao.esde_link_grupo_whatsapp()
returns text
language sql
stable
security definer
set search_path = formacao, public
as $$
  select substring(l.description from 'https://chat\.whatsapp\.com/[A-Za-z0-9]+')
  from formacao.lessons l
  join formacao.modules m on m.id = l.module_id
  where m.course_id = '348d7a02-2159-4fee-9aa6-a92cbdc9696f'
    and l.description ~ 'https://chat\.whatsapp\.com/'
  order by m.order_index, l.order_index
  limit 1;
$$;

revoke all on function formacao.esde_link_grupo_whatsapp() from public;
grant execute on function formacao.esde_link_grupo_whatsapp() to anon, authenticated;
