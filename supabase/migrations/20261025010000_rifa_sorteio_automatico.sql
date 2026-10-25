-- Sorteio feito pela ferramenta: escolhe ao acaso, no banco, um número entre os pagos e registra o resultado.
-- O sorteio presencial digitado continua existindo (rifa_registrar_sorteio).
create or replace function governanca.rifa_sortear(p_raffle uuid, p_notas text default null) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare r governanca.raffles; v_numero int; v_pedido uuid; v_total int; v_nota text;
begin
  if not governanca.opera_rifas() then raise exception 'Só a coordenação faz o sorteio'; end if;
  select * into r from governanca.raffles where id = p_raffle for update;
  if r.id is null then raise exception 'Rifa não encontrada'; end if;
  if r.status = 'sorteada' then raise exception 'Esta rifa já foi sorteada'; end if;

  select count(*) into v_total from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
   where t.raffle_id = r.id and t.ativo and o.status = 'pago';
  if v_total = 0 then raise exception 'Nenhum número pago para sortear'; end if;

  select t.number, o.id into v_numero, v_pedido
    from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
   where t.raffle_id = r.id and t.ativo and o.status = 'pago'
   order by gen_random_uuid() limit 1;

  v_nota := 'Sorteado pela ferramenta entre ' || v_total || ' números pagos.'
            || coalesce(' ' || nullif(trim(coalesce(p_notas, '')), ''), '');
  update governanca.raffles set status = 'sorteada', winner_number = v_numero, winner_order_id = v_pedido,
         drawn_at = now(), draw_notes = v_nota, updated_at = now()
   where id = r.id;

  return (select jsonb_build_object(
    'numero', v_numero, 'concorrendo', v_total,
    'comprador', o.buyer_name, 'codigo', o.code,
    'vendedor', (select p.full_name from governanca.people p where p.id = o.seller_person_id),
    'canal', o.channel)
    from governanca.raffle_orders o where o.id = v_pedido);
end $$;

revoke execute on function governanca.rifa_sortear(uuid, text) from public, anon;
grant execute on function governanca.rifa_sortear(uuid, text) to authenticated;
