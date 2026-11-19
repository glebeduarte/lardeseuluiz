-- Rifa com vários números sorteados.
-- Cada rifa define quantos números saem (draw_count). O sorteio é feito um número por vez e cada um fica
-- registrado em governanca.raffle_draws. O número que saiu não concorre de novo, mas a mesma pessoa pode ser
-- sorteada mais de uma vez, com números diferentes. A rifa só passa para "sorteada" quando sai o último.

alter table governanca.raffles
  add column if not exists draw_count integer not null default 1;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'raffles_draw_count_check') then
    alter table governanca.raffles add constraint raffles_draw_count_check check (draw_count between 1 and 100);
  end if;
end $$;

create table if not exists governanca.raffle_draws (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references governanca.raffles(id) on delete cascade,
  position integer not null check (position >= 1),
  number integer not null,
  order_id uuid references governanca.raffle_orders(id) on delete set null,
  pool integer,                 -- quantos números concorriam neste sorteio (só no sorteio pela ferramenta)
  manual boolean not null default false,
  drawn_by uuid references governanca.people(id) on delete set null,
  drawn_at timestamptz not null default now(),
  unique (raffle_id, position),
  unique (raffle_id, number)
);

alter table governanca.raffle_draws enable row level security;
revoke all on governanca.raffle_draws from anon, authenticated;
grant select on governanca.raffle_draws to authenticated;

drop policy if exists rifa_sorteados_ver on governanca.raffle_draws;
create policy rifa_sorteados_ver on governanca.raffle_draws for select to authenticated
  using (governanca.opera_rifas());

-- Rifas que já tinham resultado ganham o registro do 1º número
insert into governanca.raffle_draws (raffle_id, position, number, order_id, manual, drawn_at)
select r.id, 1, r.winner_number, r.winner_order_id, true, coalesce(r.drawn_at, now())
  from governanca.raffles r
 where r.winner_number is not null
   and not exists (select 1 from governanca.raffle_draws d where d.raffle_id = r.id);

/* ───── Sorteio pela ferramenta: um número por chamada ───── */

-- Parte interna, sem conferência de permissão. Só é chamada por rifa_sortear.
create or replace function governanca.rifa_sortear_interno(p_raffle uuid, p_notas text default null)
returns jsonb language plpgsql security definer set search_path to 'governanca', 'public' as $function$
declare r governanca.raffles; v_numero int; v_pedido uuid; v_total int; v_feitos int; v_pos int; v_fim boolean;
begin
  select * into r from governanca.raffles where id = p_raffle for update;
  if r.id is null then raise exception 'Rifa não encontrada'; end if;
  if r.status = 'sorteada' then raise exception 'Esta rifa já foi sorteada'; end if;

  select count(*) into v_feitos from governanca.raffle_draws where raffle_id = r.id;
  if v_feitos >= r.draw_count then raise exception 'Todos os números desta rifa já foram sorteados'; end if;

  if v_feitos = 0 and not exists (
    select 1 from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
     where t.raffle_id = r.id and t.ativo and o.status = 'pago') then
    raise exception 'Nenhum número pago para sortear';
  end if;

  -- Concorrem os números pagos que ainda não saíram. A mesma pessoa pode ganhar de novo com outro número.
  select count(*) over (), c.number, c.order_id into v_total, v_numero, v_pedido
    from (
      select t.number, o.id as order_id
        from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
       where t.raffle_id = r.id and t.ativo and o.status = 'pago'
         and not exists (select 1 from governanca.raffle_draws d where d.raffle_id = r.id and d.number = t.number)
    ) c
   order by gen_random_uuid() limit 1;

  if v_numero is null then
    raise exception 'Não há mais números pagos concorrendo: todos já foram sorteados';
  end if;

  v_pos := v_feitos + 1;
  v_fim := v_pos >= r.draw_count;
  insert into governanca.raffle_draws (raffle_id, position, number, order_id, pool, manual, drawn_by)
  values (r.id, v_pos, v_numero, v_pedido, v_total, false, governanca.minha_pessoa());

  update governanca.raffles set
         winner_number = case when v_pos = 1 then v_numero else winner_number end,
         winner_order_id = case when v_pos = 1 then v_pedido else winner_order_id end,
         status = case when v_fim then 'sorteada'::governanca.rifa_status else status end,
         drawn_at = case when v_fim then now() else drawn_at end,
         draw_notes = case when v_fim then
             case when r.draw_count = 1 then 'Sorteado pela ferramenta entre ' || v_total || ' números pagos.'
                  else 'Sorteio pela ferramenta: ' || r.draw_count || ' números, um por vez, entre os números pagos. Cada número sai uma vez só.' end
             || coalesce(' ' || nullif(trim(coalesce(p_notas, '')), ''), '')
           else draw_notes end,
         updated_at = now()
   where id = r.id;

  return (select jsonb_build_object(
    'numero', v_numero, 'concorrendo', v_total, 'posicao', v_pos, 'total', r.draw_count, 'concluido', v_fim,
    'comprador', o.buyer_name, 'codigo', o.code,
    'vendedor', (select p.full_name from governanca.people p where p.id = o.seller_person_id),
    'canal', o.channel)
    from governanca.raffle_orders o where o.id = v_pedido);
end $function$;

revoke all on function governanca.rifa_sortear_interno(uuid, text) from public, anon, authenticated;

create or replace function governanca.rifa_sortear(p_raffle uuid, p_notas text default null)
returns jsonb language plpgsql security definer set search_path to 'governanca', 'public' as $function$
begin
  if not governanca.opera_rifas() then raise exception 'Só a coordenação faz o sorteio'; end if;
  return governanca.rifa_sortear_interno(p_raffle, p_notas);
end $function$;

/* ───── Sorteio feito à mão: registra o próximo número ───── */

create or replace function governanca.rifa_registrar_sorteio(p_raffle uuid, p_numero integer, p_notas text default null)
returns jsonb language plpgsql security definer set search_path to 'governanca', 'public' as $function$
declare r governanca.raffles; v_pedido uuid; v_feitos int; v_pos int; v_fim boolean;
begin
  if not governanca.opera_rifas() then raise exception 'Só a coordenação registra o sorteio'; end if;
  select * into r from governanca.raffles where id = p_raffle for update;
  if r.id is null then raise exception 'Rifa não encontrada'; end if;
  if r.status = 'sorteada' then raise exception 'Esta rifa já foi sorteada'; end if;
  if p_numero < 1 or p_numero > r.total_numbers then raise exception 'Número fora da rifa'; end if;

  select count(*) into v_feitos from governanca.raffle_draws where raffle_id = r.id;
  if v_feitos >= r.draw_count then raise exception 'Todos os números desta rifa já foram sorteados'; end if;
  if exists (select 1 from governanca.raffle_draws where raffle_id = r.id and number = p_numero) then
    raise exception 'O número % já foi sorteado nesta rifa', p_numero;
  end if;

  select t.order_id into v_pedido from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
   where t.raffle_id = r.id and t.ativo and t.number = p_numero and o.status = 'pago';

  v_pos := v_feitos + 1;
  v_fim := v_pos >= r.draw_count;
  insert into governanca.raffle_draws (raffle_id, position, number, order_id, manual, drawn_by)
  values (r.id, v_pos, p_numero, v_pedido, true, governanca.minha_pessoa());

  update governanca.raffles set
         winner_number = case when v_pos = 1 then p_numero else winner_number end,
         winner_order_id = case when v_pos = 1 then v_pedido else winner_order_id end,
         status = case when v_fim then 'sorteada'::governanca.rifa_status else status end,
         drawn_at = case when v_fim then now() else drawn_at end,
         draw_notes = coalesce(nullif(trim(coalesce(p_notas, '')), ''), draw_notes),
         updated_at = now()
   where id = r.id;

  return jsonb_build_object('numero', p_numero, 'tem_ganhador', v_pedido is not null,
    'posicao', v_pos, 'total', r.draw_count, 'concluido', v_fim,
    'ganhador', (select jsonb_build_object('nome', buyer_name, 'telefone', buyer_phone, 'codigo', code) from governanca.raffle_orders where id = v_pedido));
end $function$;

/* ───── Depois que o sorteio começa, ninguém reserva nem libera pedido sorteado ───── */

create or replace function governanca.rifa_criar_pedido(p_raffle uuid, p_numeros integer[], p_nome text, p_telefone text, p_email text, p_canal text, p_vendedor uuid, p_recebido boolean, p_pago boolean)
returns governanca.raffle_orders language plpgsql security definer set search_path to 'governanca', 'public' as $function$
declare r governanca.raffles; v_nums int[]; v_ocupados int[]; v_pedido governanca.raffle_orders;
begin
  select * into r from governanca.raffles where id = p_raffle;
  if r.id is null then raise exception 'Rifa não encontrada'; end if;
  if r.status <> 'vendendo' then raise exception 'Esta rifa não está vendendo números agora'; end if;
  if exists (select 1 from governanca.raffle_draws where raffle_id = r.id) then
    raise exception 'O sorteio desta rifa já começou. Não dá mais para reservar números';
  end if;
  select array_agg(distinct n order by n) into v_nums from unnest(p_numeros) n;
  if v_nums is null or array_length(v_nums, 1) = 0 then raise exception 'Escolha ao menos um número'; end if;
  if array_length(v_nums, 1) > r.max_per_order then raise exception 'No máximo % números por pedido', r.max_per_order; end if;
  if exists (select 1 from unnest(v_nums) n where n < 1 or n > r.total_numbers) then raise exception 'Número fora da rifa'; end if;
  if length(trim(coalesce(p_nome, ''))) < 3 then raise exception 'Informe o nome'; end if;
  if length(governanca.so_digitos(p_telefone)) < 10 then raise exception 'Informe o WhatsApp com DDD'; end if;

  perform pg_advisory_xact_lock(hashtext('rifa:' || r.id::text));
  select array_agg(number order by number) into v_ocupados from governanca.raffle_tickets
   where raffle_id = r.id and ativo and number = any(v_nums);
  if v_ocupados is not null then
    raise exception 'Estes números acabaram de ser escolhidos por outra pessoa: %', array_to_string(v_ocupados, ', ');
  end if;

  insert into governanca.raffle_orders (raffle_id, code, buyer_name, buyer_phone, buyer_email, channel, seller_person_id,
                                        received_by_seller, status, amount, paid_at, paid_confirmed_by)
  values (r.id, governanca.rifa_novo_codigo(), trim(p_nome), trim(p_telefone), nullif(trim(coalesce(p_email, '')), ''), p_canal, p_vendedor,
          coalesce(p_recebido, false), case when p_pago then 'pago'::governanca.rifa_pedido_status else 'reservado' end,
          r.ticket_price * array_length(v_nums, 1), case when p_pago then now() end, case when p_pago then governanca.minha_pessoa() end)
  returning * into v_pedido;

  insert into governanca.raffle_tickets (raffle_id, order_id, number) select r.id, v_pedido.id, n from unnest(v_nums) n;
  return v_pedido;
end $function$;

create or replace function governanca.rifa_liberar(p_pedido uuid, p_motivo text default null)
returns void language plpgsql security definer set search_path to 'governanca', 'public' as $function$
declare o governanca.raffle_orders;
begin
  select * into o from governanca.raffle_orders where id = p_pedido;
  if o.id is null then raise exception 'Pedido não encontrado'; end if;
  if not (governanca.opera_rifas() or (o.seller_person_id = governanca.minha_pessoa() and o.status = 'reservado')) then
    raise exception 'Sem permissão para liberar este pedido';
  end if;
  if exists (select 1 from governanca.raffle_draws where order_id = o.id) then
    raise exception 'Este pedido tem número sorteado e não pode ser liberado';
  end if;
  update governanca.raffle_orders set status = 'cancelado', canceled_at = now(), cancel_reason = nullif(trim(coalesce(p_motivo, '')), '') where id = o.id;
  update governanca.raffle_tickets set ativo = false where order_id = o.id;
end $function$;

/* ───── Página pública: quantos números saem e a lista dos sorteados ───── */

create or replace function governanca.rifa_publica(p_slug text)
returns jsonb language plpgsql stable security definer set search_path to 'governanca', 'public' as $function$
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
    'qtd_sorteio', r.draw_count,
    'numeros', coalesce((select jsonb_agg(jsonb_build_array(t.number, case when o.status = 'pago' then 'p' else 'r' end) order by t.number)
                          from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
                         where t.raffle_id = r.id and t.ativo), '[]'::jsonb),
    'sorteados', coalesce((select jsonb_agg(jsonb_build_object(
                             'posicao', d.position, 'numero', d.number,
                             'nome', (select split_part(o.buyer_name, ' ', 1) from governanca.raffle_orders o where o.id = d.order_id)) order by d.position)
                            from governanca.raffle_draws d where d.raffle_id = r.id), '[]'::jsonb),
    'ganhador', case when r.status = 'sorteada' then jsonb_build_object(
                  'numero', r.winner_number, 'data', r.drawn_at,
                  'nome', (select split_part(o.buyer_name, ' ', 1) from governanca.raffle_orders o where o.id = r.winner_order_id)) end
  );
end $function$;
