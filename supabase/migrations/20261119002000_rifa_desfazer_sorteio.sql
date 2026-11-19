-- Desfazer sorteio da rifa: a coordenação pode desfazer o último número sorteado ou o sorteio inteiro.
-- O que foi desfeito fica guardado em governanca.raffle_draw_undos (número, ordem, quem desfez, quando e por quê).
-- Uma rifa que estava "sorteada" volta para "encerrada" (vendas fechadas), pronta para sortear de novo.

create table if not exists governanca.raffle_draw_undos (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references governanca.raffles(id) on delete cascade,
  position integer not null,
  number integer not null,
  order_id uuid references governanca.raffle_orders(id) on delete set null,
  manual boolean not null default false,
  drawn_at timestamptz,
  undone_by uuid references governanca.people(id) on delete set null,
  undone_at timestamptz not null default now(),
  reason text
);
create index if not exists raffle_draw_undos_raffle_idx on governanca.raffle_draw_undos (raffle_id, undone_at);

alter table governanca.raffle_draw_undos enable row level security;
revoke all on governanca.raffle_draw_undos from anon, authenticated;
grant select on governanca.raffle_draw_undos to authenticated;

drop policy if exists rifa_desfeitos_ver on governanca.raffle_draw_undos;
create policy rifa_desfeitos_ver on governanca.raffle_draw_undos for select to authenticated
  using (governanca.opera_rifas());

-- Parte interna, sem conferência de permissão. Só é chamada por rifa_desfazer_sorteio.
create or replace function governanca.rifa_desfazer_sorteio_interno(p_raffle uuid, p_tudo boolean default false, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path to 'governanca', 'public' as $function$
declare r governanca.raffles; v_feitos int; v_desfeitos int; v_restam int; v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  select * into r from governanca.raffles where id = p_raffle for update;
  if r.id is null then raise exception 'Rifa não encontrada'; end if;

  select count(*) into v_feitos from governanca.raffle_draws where raffle_id = r.id;
  if v_feitos = 0 then raise exception 'Esta rifa não tem número sorteado para desfazer'; end if;

  with fora as (
    delete from governanca.raffle_draws d
     where d.raffle_id = r.id and (coalesce(p_tudo, false) or d.position = v_feitos)
    returning d.position, d.number, d.order_id, d.manual, d.drawn_at
  ), guardados as (
    insert into governanca.raffle_draw_undos (raffle_id, position, number, order_id, manual, drawn_at, undone_by, reason)
    select r.id, f.position, f.number, f.order_id, f.manual, f.drawn_at, governanca.minha_pessoa(), v_motivo from fora f
    returning 1
  )
  select count(*) into v_desfeitos from guardados;

  v_restam := v_feitos - v_desfeitos;
  update governanca.raffles set
         winner_number = case when v_restam = 0 then null else winner_number end,
         winner_order_id = case when v_restam = 0 then null else winner_order_id end,
         status = case when status = 'sorteada' then 'encerrada'::governanca.rifa_status else status end,
         drawn_at = null,
         draw_notes = null,
         updated_at = now()
   where id = r.id;

  return jsonb_build_object('desfeitos', v_desfeitos, 'restam', v_restam, 'total', r.draw_count);
end $function$;

revoke all on function governanca.rifa_desfazer_sorteio_interno(uuid, boolean, text) from public, anon, authenticated;

create or replace function governanca.rifa_desfazer_sorteio(p_raffle uuid, p_tudo boolean default false, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path to 'governanca', 'public' as $function$
begin
  if not governanca.opera_rifas() then raise exception 'Só a coordenação desfaz o sorteio'; end if;
  return governanca.rifa_desfazer_sorteio_interno(p_raffle, p_tudo, p_motivo);
end $function$;

revoke all on function governanca.rifa_desfazer_sorteio(uuid, boolean, text) from public, anon;
grant execute on function governanca.rifa_desfazer_sorteio(uuid, boolean, text) to authenticated;
