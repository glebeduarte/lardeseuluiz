-- Remover uma venda da rifa (apaga o pedido e solta os números). Só quem criou a rifa pode.
-- Diferente de "Liberar", que mantém o pedido no histórico como cancelado.
-- Cada remoção fica registrada com a cópia do pedido, para conferência.
create table if not exists governanca.raffle_order_removals (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references governanca.raffles(id) on delete cascade,
  order_code text not null,
  snapshot jsonb not null,
  reason text,
  removed_by uuid default auth.uid(),
  removed_at timestamptz not null default now()
);
alter table governanca.raffle_order_removals enable row level security;
drop policy if exists rifa_remocoes_ver on governanca.raffle_order_removals;
create policy rifa_remocoes_ver on governanca.raffle_order_removals for select to authenticated using (governanca.opera_rifas());
grant select on governanca.raffle_order_removals to authenticated;

create or replace function governanca.rifa_remover_pedido(p_pedido uuid, p_motivo text default null) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare o governanca.raffle_orders; r governanca.raffles;
begin
  select * into o from governanca.raffle_orders where id = p_pedido;
  if o.id is null then raise exception 'Venda não encontrada'; end if;
  select * into r from governanca.raffles where id = o.raffle_id;
  if r.created_by is null or r.created_by <> auth.uid() then raise exception 'Só quem criou a rifa pode remover vendas'; end if;
  if r.winner_order_id = o.id then raise exception 'Esta venda tem o número sorteado e não pode ser removida'; end if;

  insert into governanca.raffle_order_removals (raffle_id, order_code, snapshot, reason)
  values (r.id, o.code,
          to_jsonb(o) || jsonb_build_object('numeros', (select jsonb_agg(number order by number) from governanca.raffle_tickets where order_id = o.id)),
          nullif(trim(coalesce(p_motivo, '')), ''));
  delete from governanca.raffle_orders where id = o.id;  -- os bilhetes saem junto (on delete cascade)
  return jsonb_build_object('ok', true, 'codigo', o.code);
end $$;

revoke execute on function governanca.rifa_remover_pedido(uuid, text) from public, anon;
grant execute on function governanca.rifa_remover_pedido(uuid, text) to authenticated;

-- A Rifa da Transformação foi criada antes de o criador ser gravado; fica com o Glebe, que a montou.
update governanca.raffles set created_by = 'de11dfa9-bd9b-454a-8ebf-293200c5adaa'
 where id = '6d1d6f87-e119-4c7d-a895-baeaeb90040f' and created_by is null;
