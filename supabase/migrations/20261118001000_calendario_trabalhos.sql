-- Calendário de trabalhos da casa, trazido do projeto Lovable "Seu Luiz's Activity Calendar"
-- (calendario.lardeseuluiz.com.br) para dentro da Governança.
-- Um calendário por ano (um deles ativo), categorias com cor, marcações por dia e feriados.
-- Leitura aberta (o calendário é público); edição só para admin, gestão ou direção.

create table if not exists governanca.cal_calendarios (
  id uuid primary key default gen_random_uuid(),
  ano integer not null unique,
  ativo boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists governanca.cal_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  cor text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists governanca.cal_eventos (
  id uuid primary key default gen_random_uuid(),
  calendario_id uuid not null references governanca.cal_calendarios(id) on delete cascade,
  categoria_id uuid not null references governanca.cal_categorias(id) on delete cascade,
  data date not null,
  criado_em timestamptz not null default now(),
  unique (calendario_id, data, categoria_id)
);
create index if not exists cal_eventos_cal_idx on governanca.cal_eventos (calendario_id, data);

create table if not exists governanca.cal_feriados (
  id uuid primary key default gen_random_uuid(),
  calendario_id uuid not null references governanca.cal_calendarios(id) on delete cascade,
  data date not null,
  nome text,
  unique (calendario_id, data)
);

create or replace function governanca.pode_editar_calendario()
returns boolean language sql stable security definer set search_path = governanca, public
as $$
  select auth.uid() is not null and (
    coalesce(governanca.has_role(auth.uid(), 'admin'), false)
    or coalesce(governanca.eh_gestao(), false)
    or coalesce(governanca.eh_direcao(), false)
  )
$$;
grant execute on function governanca.pode_editar_calendario() to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['cal_calendarios','cal_categorias','cal_eventos','cal_feriados'] loop
    execute format('alter table governanca.%I enable row level security', t);
    execute format('drop policy if exists "Ler calendário" on governanca.%I', t);
    execute format('create policy "Ler calendário" on governanca.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "Editar calendário" on governanca.%I', t);
    execute format('create policy "Editar calendário" on governanca.%I for all to authenticated using (governanca.pode_editar_calendario()) with check (governanca.pode_editar_calendario())', t);
    execute format('grant select on governanca.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on governanca.%I to authenticated', t);
  end loop;
end $$;

-- Troca o calendário ativo de uma vez (evita ficar com dois ativos).
create or replace function governanca.cal_ativar(p_id uuid)
returns void language plpgsql security definer set search_path = governanca, public
as $$
begin
  if not governanca.pode_editar_calendario() then raise exception 'Sem permissão'; end if;
  update governanca.cal_calendarios set ativo = (id = p_id);
end $$;
grant execute on function governanca.cal_ativar(uuid) to authenticated;

-- Dados de 2026 copiados do calendário antigo
insert into governanca.cal_calendarios (id, ano, ativo)
values ('ca886e68-3316-4d27-b37a-17b4633db95a', 2026, true)
on conflict (ano) do nothing;

insert into governanca.cal_categorias (id, nome, slug, cor, ordem) values
  ('5556f7b0-0633-4ff6-b28a-123f4cc68d03','Início/Término do Ano','inicio-termino','#3b82f6',1),
  ('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','Dia de Trabalho','dia-trabalho','#fde047',2),
  ('ce50be39-4a7c-4caf-963a-87d971b1c0fc','Atendimento ao Público','atendimento','#f472b6',3),
  ('8567d0b9-4a6c-43ae-9224-8f2b90c86002','Reunião de Voluntários','reuniao-voluntarios','#eab308',4),
  ('1d6c45ce-f031-413f-88d3-f26dc22ac51a','Reunião Administrativa','reuniao-admin','#a855f7',5),
  ('7820264d-430c-4149-9aed-72efefcf3954','Curso','curso','#22c55e',6),
  ('8ad53021-a615-476d-91cb-8189c8eaafbe','Curso Mediúnico','curso-mediunico','#6366f1',7),
  ('2a42200a-86fa-489f-8e41-febc72930051','Início ESDE','inicio-esde','#06b6d4',8),
  ('e2cdd3d5-2e02-4074-b806-6454cc9cbea9','Início Mediúnica','inicio-mediunica','#0ea5e9',9),
  ('a06c6456-2de9-4498-86e0-30009434d1db','Eventos Especiais','eventos','#f97316',10),
  ('360a96d3-c017-4256-b103-1c9219a9f579','CaFÉ & AMor','cafe-amor','#4ade80',11),
  ('a8483f81-790c-45df-9e09-42adf53f06d3','Aniversário do Lar de Seu Luiz','aniversario','#6b7280',12)
on conflict (id) do nothing;

insert into governanca.cal_eventos (calendario_id, categoria_id, data)
select 'ca886e68-3316-4d27-b37a-17b4633db95a', v.c::uuid, v.d::date from (values
('5556f7b0-0633-4ff6-b28a-123f4cc68d03','2026-01-13'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-01-16'),('1d6c45ce-f031-413f-88d3-f26dc22ac51a','2026-01-20'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-01-23'),('8567d0b9-4a6c-43ae-9224-8f2b90c86002','2026-01-24'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-01-27'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-01-30'),('e2cdd3d5-2e02-4074-b806-6454cc9cbea9','2026-02-02'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-02-03'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-02-06'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-02-07'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-02-10'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-02-20'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-02-21'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-02-24'),('2a42200a-86fa-489f-8e41-febc72930051','2026-02-26'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-02-27'),('7820264d-430c-4149-9aed-72efefcf3954','2026-02-28'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-03-03'),('1d6c45ce-f031-413f-88d3-f26dc22ac51a','2026-03-04'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-03-06'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-03-07'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-03-10'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-03-13'),('a06c6456-2de9-4498-86e0-30009434d1db','2026-03-15'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-03-17'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-03-20'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-03-21'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-03-24'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-03-27'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-03-31'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-04-04'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-04-07'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-04-10'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-04-14'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-04-17'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-04-18'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-04-21'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-04-24'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-04-25'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-04-28'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-05-01'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-05-02'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-05-05'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-05-08'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-05-09'),('a8483f81-790c-45df-9e09-42adf53f06d3','2026-05-12'),('a06c6456-2de9-4498-86e0-30009434d1db','2026-05-13'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-05-15'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-05-16'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-05-19'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-05-22'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-05-23'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-05-26'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-05-29'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-05-30'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-05-30'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-06-02'),('1d6c45ce-f031-413f-88d3-f26dc22ac51a','2026-06-03'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-06-05'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-06-06'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-06-09'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-06-13'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-06-16'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-06-19'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-06-20'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-06-23'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-06-26'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-06-27'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-06-27'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-06-30'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-07-03'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-07-04'),('8567d0b9-4a6c-43ae-9224-8f2b90c86002','2026-07-06'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-07-07'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-07-11'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-07-14'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-07-17'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-07-21'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-07-24'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-07-25'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-07-25'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-07-28'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-07-31'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-08-01'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-08-04'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-08-07'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-08-08'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-08-11'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-08-14'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-08-15'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-08-18'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-08-21'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-08-22'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-08-22'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-08-25'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-08-28'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-09-01'),('1d6c45ce-f031-413f-88d3-f26dc22ac51a','2026-09-02'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-09-04'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-09-05'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-09-08'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-09-11'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-09-12'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-09-15'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-09-18'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-09-19'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-09-22'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-09-25'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-09-26'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-09-29'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-10-02'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-10-03'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-10-06'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-10-09'),('a06c6456-2de9-4498-86e0-30009434d1db','2026-10-11'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-10-13'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-10-16'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-10-17'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-10-17'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-10-20'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-10-23'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-10-24'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-10-27'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-10-30'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-10-31'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-10-31'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-11-03'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-11-06'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-11-07'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-11-10'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-11-13'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-11-14'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-11-14'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-11-17'),('8567d0b9-4a6c-43ae-9224-8f2b90c86002','2026-11-20'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-11-20'),('360a96d3-c017-4256-b103-1c9219a9f579','2026-11-21'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-11-24'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-11-27'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-11-28'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-12-01'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-12-04'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-12-05'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-12-08'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-12-11'),('ce50be39-4a7c-4caf-963a-87d971b1c0fc','2026-12-12'),('8ad53021-a615-476d-91cb-8189c8eaafbe','2026-12-12'),('a06c6456-2de9-4498-86e0-30009434d1db','2026-12-13'),('5556f7b0-0633-4ff6-b28a-123f4cc68d03','2026-12-15'),('34b6dadf-d3f5-43a7-bac6-f4ac4e0077c3','2026-12-18')
) as v(c, d)
on conflict do nothing;

insert into governanca.cal_feriados (calendario_id, data)
select 'ca886e68-3316-4d27-b37a-17b4633db95a', d::date from unnest(array[
'2026-01-01','2026-02-16','2026-02-17','2026-04-03','2026-04-21','2026-05-01','2026-06-04','2026-09-07','2026-10-03','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-11-21','2026-12-25']) d
on conflict do nothing;
