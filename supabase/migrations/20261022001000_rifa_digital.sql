-- Rifa digital com PIX conferido à mão.
-- A pessoa escolhe os números na página pública e recebe a chave PIX; os números ficam reservados
-- até a coordenação marcar como pago ou liberar. Voluntários vendedores registram vendas pelo celular.
-- O sorteio é presencial: a coordenação registra o número sorteado.

do $$ begin
  create type governanca.rifa_status as enum ('rascunho', 'vendendo', 'encerrada', 'sorteada');
exception when duplicate_object then null; end $$;
do $$ begin
  create type governanca.rifa_pedido_status as enum ('reservado', 'pago', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists governanca.raffles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  title text not null,
  prize text not null,
  description text,
  cover_url text,
  ticket_price numeric(10,2) not null check (ticket_price > 0),
  total_numbers int not null check (total_numbers between 10 and 10000),
  max_per_order int not null default 50 check (max_per_order between 1 and 500),
  pix_key text,
  pix_name text,
  pix_city text default 'NISIA FLORESTA',
  whatsapp text,
  draw_date date,
  draw_place text,
  rules text,
  authorization_note text,
  project_id uuid references governanca.projects(id) on delete set null,
  status governanca.rifa_status not null default 'rascunho',
  winner_number int,
  winner_order_id uuid,
  drawn_at timestamptz,
  draw_notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists governanca.raffle_sellers (
  raffle_id uuid not null references governanca.raffles(id) on delete cascade,
  person_id uuid not null references governanca.people(id) on delete cascade,
  quota int check (quota is null or quota > 0),
  created_at timestamptz not null default now(),
  primary key (raffle_id, person_id)
);

create table if not exists governanca.raffle_orders (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references governanca.raffles(id) on delete cascade,
  code text not null unique,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text,
  channel text not null default 'site' check (channel in ('site', 'vendedor')),
  seller_person_id uuid references governanca.people(id) on delete set null,
  received_by_seller boolean not null default false,
  status governanca.rifa_pedido_status not null default 'reservado',
  amount numeric(10,2) not null,
  paid_at timestamptz,
  paid_confirmed_by uuid references governanca.people(id) on delete set null,
  canceled_at timestamptz,
  cancel_reason text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists raffle_orders_raffle_idx on governanca.raffle_orders (raffle_id, status);

create table if not exists governanca.raffle_tickets (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references governanca.raffles(id) on delete cascade,
  order_id uuid not null references governanca.raffle_orders(id) on delete cascade,
  number int not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
-- Um número só pode estar com um pedido ativo por vez; ao liberar, o bilhete fica inativo e o número volta a ficar livre.
create unique index if not exists raffle_tickets_numero_ativo on governanca.raffle_tickets (raffle_id, number) where ativo;
create index if not exists raffle_tickets_order_idx on governanca.raffle_tickets (order_id);

-- Quem cuida das rifas: gestão, Direção ou quem opera as ações sociais.
create or replace function governanca.opera_rifas() returns boolean
language sql stable security definer set search_path = governanca, public as $$
  select governanca.opera_acoes() or governanca.eh_direcao()
$$;

create or replace function governanca.vende_rifa(p_raffle uuid) returns boolean
language sql stable security definer set search_path = governanca, public as $$
  select exists (select 1 from governanca.raffle_sellers s where s.raffle_id = p_raffle and s.person_id = governanca.minha_pessoa())
$$;

alter table governanca.raffles enable row level security;
alter table governanca.raffle_sellers enable row level security;
alter table governanca.raffle_orders enable row level security;
alter table governanca.raffle_tickets enable row level security;

create policy rifas_ver on governanca.raffles for select to authenticated using (governanca.opera_rifas() or governanca.vende_rifa(id));
create policy rifas_gerir on governanca.raffles for all to authenticated using (governanca.opera_rifas()) with check (governanca.opera_rifas());

create policy rifa_vendedores_ver on governanca.raffle_sellers for select to authenticated using (governanca.opera_rifas() or person_id = governanca.minha_pessoa());
create policy rifa_vendedores_gerir on governanca.raffle_sellers for all to authenticated using (governanca.opera_rifas()) with check (governanca.opera_rifas());

create policy rifa_pedidos_ver on governanca.raffle_orders for select to authenticated using (governanca.opera_rifas() or seller_person_id = governanca.minha_pessoa());
create policy rifa_pedidos_editar on governanca.raffle_orders for update to authenticated using (governanca.opera_rifas()) with check (governanca.opera_rifas());

create policy rifa_bilhetes_ver on governanca.raffle_tickets for select to authenticated using (
  governanca.opera_rifas() or exists (select 1 from governanca.raffle_orders o where o.id = order_id and o.seller_person_id = governanca.minha_pessoa()));

grant select, insert, update on governanca.raffles, governanca.raffle_sellers, governanca.raffle_orders, governanca.raffle_tickets to authenticated;
grant delete on governanca.raffle_sellers to authenticated;

-- Código curto do pedido, fácil de ditar no WhatsApp (sem 0/O, 1/I).
create or replace function governanca.rifa_novo_codigo() returns text
language plpgsql volatile set search_path = governanca, public as $$
declare v text; letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  loop
    v := 'R' || (select string_agg(substr(letras, 1 + floor(random() * length(letras))::int, 1), '') from generate_series(1, 5));
    exit when not exists (select 1 from governanca.raffle_orders where code = v);
  end loop;
  return v;
end $$;

create or replace function governanca.so_digitos(t text) returns text
language sql immutable as $$ select regexp_replace(coalesce(t, ''), '\D', '', 'g') $$;

-- Cria o pedido e os bilhetes, com trava para duas pessoas não pegarem o mesmo número.
create or replace function governanca.rifa_criar_pedido(
  p_raffle uuid, p_numeros int[], p_nome text, p_telefone text, p_email text,
  p_canal text, p_vendedor uuid, p_recebido boolean, p_pago boolean
) returns governanca.raffle_orders
language plpgsql security definer set search_path = governanca, public as $$
declare r governanca.raffles; v_nums int[]; v_ocupados int[]; v_pedido governanca.raffle_orders;
begin
  select * into r from governanca.raffles where id = p_raffle;
  if r.id is null then raise exception 'Rifa não encontrada'; end if;
  if r.status <> 'vendendo' then raise exception 'Esta rifa não está vendendo números agora'; end if;
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
end $$;
revoke all on function governanca.rifa_criar_pedido(uuid, int[], text, text, text, text, uuid, boolean, boolean) from public, anon, authenticated;

-- Página pública: dados da rifa e situação de cada número (sem dados de quem comprou).
create or replace function governanca.rifa_publica(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = governanca, public as $$
declare r governanca.raffles;
begin
  select * into r from governanca.raffles where slug = p_slug;
  if r.id is null or (r.status = 'rascunho' and not governanca.opera_rifas()) then return null; end if;
  return jsonb_build_object(
    'id', r.id, 'slug', r.slug, 'titulo', r.title, 'premio', r.prize, 'descricao', r.description, 'capa', r.cover_url,
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
end $$;

create or replace function governanca.rifas_publicas() returns jsonb
language sql stable security definer set search_path = governanca, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', r.slug, 'titulo', r.title, 'premio', r.prize, 'capa', r.cover_url, 'preco', r.ticket_price, 'total', r.total_numbers,
    'status', r.status, 'data_sorteio', r.draw_date,
    'vendidos', (select count(*) from governanca.raffle_tickets t where t.raffle_id = r.id and t.ativo)
  ) order by r.draw_date nulls last, r.created_at desc), '[]'::jsonb)
  from governanca.raffles r where r.status in ('vendendo', 'encerrada', 'sorteada')
$$;

-- Reserva feita pela própria pessoa, na página pública.
create or replace function governanca.rifa_reservar(p_slug text, p_numeros int[], p_nome text, p_telefone text, p_email text default null)
returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare r governanca.raffles; v governanca.raffle_orders;
begin
  select * into r from governanca.raffles where slug = p_slug;
  if r.id is null then raise exception 'Rifa não encontrada'; end if;
  -- Evita que uma pessoa segure a rifa toda com pedidos sem pagar.
  if (select count(*) from governanca.raffle_orders o where o.raffle_id = r.id and o.status = 'reservado'
        and governanca.so_digitos(o.buyer_phone) = governanca.so_digitos(p_telefone)) >= 5 then
    raise exception 'Você já tem 5 reservas esperando pagamento. Pague ou fale com a coordenação antes de reservar mais.';
  end if;
  v := governanca.rifa_criar_pedido(r.id, p_numeros, p_nome, p_telefone, p_email, 'site', null, false, false);
  return jsonb_build_object('codigo', v.code, 'valor', v.amount, 'status', v.status,
    'numeros', (select jsonb_agg(number order by number) from governanca.raffle_tickets where order_id = v.id));
end $$;

-- A pessoa confere a própria reserva com o código e o WhatsApp.
create or replace function governanca.rifa_minha_reserva(p_codigo text, p_telefone text) returns jsonb
language sql stable security definer set search_path = governanca, public as $$
  select jsonb_build_object('codigo', o.code, 'valor', o.amount, 'status', o.status, 'nome', o.buyer_name, 'criado', o.created_at,
    'pago_em', o.paid_at, 'rifa', r.slug, 'titulo', r.title,
    'numeros', (select jsonb_agg(t.number order by t.number) from governanca.raffle_tickets t where t.order_id = o.id))
  from governanca.raffle_orders o join governanca.raffles r on r.id = o.raffle_id
  where o.code = upper(trim(p_codigo)) and governanca.so_digitos(o.buyer_phone) = governanca.so_digitos(p_telefone)
$$;

-- Venda feita por um voluntário vendedor (ou pela coordenação).
create or replace function governanca.rifa_vender(p_raffle uuid, p_numeros int[], p_nome text, p_telefone text, p_recebido boolean default false)
returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare v governanca.raffle_orders; v_opera boolean := governanca.opera_rifas();
begin
  if not (v_opera or governanca.vende_rifa(p_raffle)) then raise exception 'Você não é vendedor desta rifa'; end if;
  -- O vendedor marca que recebeu; quem confirma o pagamento é a coordenação. Quem coordena já pode lançar como pago.
  v := governanca.rifa_criar_pedido(p_raffle, p_numeros, p_nome, p_telefone, null, 'vendedor', governanca.minha_pessoa(),
                                    coalesce(p_recebido, false), v_opera and coalesce(p_recebido, false));
  return jsonb_build_object('codigo', v.code, 'valor', v.amount, 'status', v.status,
    'numeros', (select jsonb_agg(number order by number) from governanca.raffle_tickets where order_id = v.id));
end $$;

create or replace function governanca.rifa_marcar_pago(p_pedido uuid, p_pago boolean default true) returns void
language plpgsql security definer set search_path = governanca, public as $$
begin
  if not governanca.opera_rifas() then raise exception 'Só a coordenação da rifa confirma pagamentos'; end if;
  update governanca.raffle_orders
     set status = case when p_pago then 'pago'::governanca.rifa_pedido_status else 'reservado' end,
         paid_at = case when p_pago then now() end,
         paid_confirmed_by = case when p_pago then governanca.minha_pessoa() end
   where id = p_pedido and status <> 'cancelado';
end $$;

-- Libera os números de um pedido (desistência ou falta de pagamento). O pedido fica no histórico como cancelado.
create or replace function governanca.rifa_liberar(p_pedido uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path = governanca, public as $$
declare o governanca.raffle_orders;
begin
  select * into o from governanca.raffle_orders where id = p_pedido;
  if o.id is null then raise exception 'Pedido não encontrado'; end if;
  if not (governanca.opera_rifas() or (o.seller_person_id = governanca.minha_pessoa() and o.status = 'reservado')) then
    raise exception 'Sem permissão para liberar este pedido';
  end if;
  update governanca.raffle_orders set status = 'cancelado', canceled_at = now(), cancel_reason = nullif(trim(coalesce(p_motivo, '')), '') where id = o.id;
  update governanca.raffle_tickets set ativo = false where order_id = o.id;
end $$;

-- Sorteio presencial: registra o número sorteado e quem tinha esse número pago.
create or replace function governanca.rifa_registrar_sorteio(p_raffle uuid, p_numero int, p_notas text default null) returns jsonb
language plpgsql security definer set search_path = governanca, public as $$
declare r governanca.raffles; v_pedido uuid;
begin
  if not governanca.opera_rifas() then raise exception 'Só a coordenação registra o sorteio'; end if;
  select * into r from governanca.raffles where id = p_raffle;
  if r.id is null then raise exception 'Rifa não encontrada'; end if;
  if p_numero < 1 or p_numero > r.total_numbers then raise exception 'Número fora da rifa'; end if;
  select t.order_id into v_pedido from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
   where t.raffle_id = r.id and t.ativo and t.number = p_numero and o.status = 'pago';
  update governanca.raffles set status = 'sorteada', winner_number = p_numero, winner_order_id = v_pedido,
         drawn_at = now(), draw_notes = nullif(trim(coalesce(p_notas, '')), ''), updated_at = now()
   where id = r.id;
  return jsonb_build_object('numero', p_numero, 'tem_ganhador', v_pedido is not null,
    'ganhador', (select jsonb_build_object('nome', buyer_name, 'telefone', buyer_phone, 'codigo', code) from governanca.raffle_orders where id = v_pedido));
end $$;

-- Rifas em que a pessoa é vendedora, com o que ela já vendeu.
create or replace function governanca.minhas_rifas_venda() returns jsonb
language sql stable security definer set search_path = governanca, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'slug', r.slug, 'titulo', r.title, 'premio', r.prize, 'preco', r.ticket_price, 'status', r.status, 'cota', s.quota,
    'data_sorteio', r.draw_date,
    'vendidos', (select count(*) from governanca.raffle_tickets t join governanca.raffle_orders o on o.id = t.order_id
                  where t.raffle_id = r.id and t.ativo and o.seller_person_id = s.person_id),
    'a_repassar', (select coalesce(sum(o.amount), 0) from governanca.raffle_orders o
                    where o.raffle_id = r.id and o.seller_person_id = s.person_id and o.status = 'reservado' and o.received_by_seller)
  ) order by r.draw_date nulls last), '[]'::jsonb)
  from governanca.raffle_sellers s join governanca.raffles r on r.id = s.raffle_id
  where s.person_id = governanca.minha_pessoa() and r.status in ('vendendo', 'encerrada', 'sorteada')
$$;

grant execute on function governanca.rifa_publica(text), governanca.rifas_publicas(), governanca.rifa_reservar(text, int[], text, text, text),
  governanca.rifa_minha_reserva(text, text) to anon, authenticated;
revoke execute on function governanca.rifa_vender(uuid, int[], text, text, boolean), governanca.rifa_marcar_pago(uuid, boolean),
  governanca.rifa_liberar(uuid, text), governanca.rifa_registrar_sorteio(uuid, int, text), governanca.minhas_rifas_venda() from public, anon;
grant execute on function governanca.rifa_vender(uuid, int[], text, text, boolean), governanca.rifa_marcar_pago(uuid, boolean),
  governanca.rifa_liberar(uuid, text), governanca.rifa_registrar_sorteio(uuid, int, text), governanca.minhas_rifas_venda(),
  governanca.opera_rifas(), governanca.vende_rifa(uuid) to authenticated;

-- O lançador e o perfil precisam saber se a pessoa cuida ou vende rifas.
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.minhas_areas'::regproc) into v_def;
  if position('''rifas''' in v_def) = 0 then
    v_def := replace(v_def,
      $a$'gestao', governanca.eh_gestao(),$a$,
      $b$'gestao', governanca.eh_gestao(),
    'rifas', jsonb_build_object('opera', governanca.opera_rifas(),
                                'vende', exists (select 1 from governanca.raffle_sellers s join governanca.raffles r on r.id = s.raffle_id
                                                  where s.person_id = v_pessoa and r.status = 'vendendo')),$b$);
    execute v_def;
  end if;
end $$;
