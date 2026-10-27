-- Endereço (slug) da rifa pode ser refeito. Os endereços antigos continuam abrindo a rifa,
-- para não quebrar links que já foram divulgados no WhatsApp.
alter table governanca.raffles add column if not exists slugs_antigos text[] not null default '{}';

create or replace function governanca.raffles_slug_guardar()
returns trigger language plpgsql set search_path = governanca, public as $$
begin
  new.slug := lower(trim(new.slug));
  if new.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new.slug) < 3 or length(new.slug) > 60 then
    raise exception 'Endereço inválido: use de 3 a 60 letras sem acento, números e hífens.';
  end if;
  if exists (select 1 from governanca.raffles r where r.id <> new.id and (r.slug = new.slug or new.slug = any(r.slugs_antigos))) then
    raise exception 'Esse endereço já é usado por outra rifa.';
  end if;
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    new.slugs_antigos := array_remove(array(select distinct x from unnest(coalesce(old.slugs_antigos, '{}') || old.slug) x), new.slug);
  end if;
  return new;
end $$;

drop trigger if exists trg_raffles_slug on governanca.raffles;
create trigger trg_raffles_slug before insert or update of slug on governanca.raffles
for each row execute function governanca.raffles_slug_guardar();

-- A página pública aceita o endereço atual ou um antigo e devolve sempre o atual em 'slug'.
create or replace function governanca.rifa_publica(p_slug text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'governanca', 'public'
as $function$
declare r governanca.raffles;
begin
  select * into r from governanca.raffles where slug = p_slug;
  if r.id is null then
    select * into r from governanca.raffles where p_slug = any(slugs_antigos) limit 1;
  end if;
  if r.id is null or (r.status = 'rascunho' and not governanca.opera_rifas()) then return null; end if;
  return jsonb_build_object(
    'id', r.id, 'slug', r.slug, 'titulo', r.title, 'premio', r.prize, 'itens_premio', to_jsonb(r.prize_items), 'valor_premio', r.prize_value, 'descricao', r.description, 'capa', r.cover_url,
    'preco', r.ticket_price, 'total', r.total_numbers, 'max_por_pedido', r.max_per_order, 'status', r.status,
    'data_sorteio', r.draw_date, 'local_sorteio', r.draw_place, 'regras', r.rules, 'autorizacao', r.authorization_note,
    'whatsapp', r.whatsapp, 'pix_chave', r.pix_key, 'pix_nome', r.pix_name, 'pix_cidade', r.pix_city,
    'numeros', coalesce((select jsonb_agg(jsonb_build_array(t.number, case when o.status = 'pago' then 'p' else 'r' end) order by t.number)
                          from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
                         where t.raffle_id = r.id and t.ativo), '[]'::jsonb),
    'ganhador', case when r.status = 'sorteada' then jsonb_build_object(
                  'numero', r.winner_number, 'data', r.drawn_at,
                  'nome', (select split_part(o.buyer_name, ' ', 1) from governanca.raffle_orders o where o.id = r.winner_order_id)) end
  );
end $function$;
