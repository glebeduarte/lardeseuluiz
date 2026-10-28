-- Médium que atende consulentes de outra maca (quando uma maca não se forma no dia e as
-- pessoas são redistribuídas). A presença é gravada na designação da maca original,
-- então entra no histórico do tratamento dela, com a maca onde o atendimento aconteceu.
alter table atendimento.presencas
  add column if not exists atendido_em_maca_id uuid references atendimento.macas(id) on delete set null;

create or replace function atendimento.pode_lancar_pela_maca(p_maca uuid)
returns boolean language sql stable security definer set search_path = atendimento, public as $$
  select auth.uid() is not null and (
    atendimento.is_admin(auth.uid())
    or (atendimento.has_role(auth.uid(), 'medium'::atendimento.app_role) and atendimento.is_medium_of_maca(auth.uid(), p_maca)))
$$;

-- Outras macas do mesmo dia da maca do médium
create or replace function atendimento.outras_macas_do_dia(p_maca_origem uuid)
returns jsonb language plpgsql stable security definer set search_path = atendimento, public as $$
declare v_dia text;
begin
  if not atendimento.pode_lancar_pela_maca(p_maca_origem) then raise exception 'Sem acesso a esta maca.'; end if;
  select dia::text into v_dia from atendimento.macas where id = p_maca_origem;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'numero', m.numero, 'nome', m.nome, 'cor_hex', m.cor_hex,
      'ativos', (select count(*) from atendimento.designacoes d where d.maca_id = m.id and d.status = 'ativa'),
      'mediuns', coalesce((select jsonb_agg(coalesce(nullif(p.como_chamar, ''), p.nome) order by p.nome)
                           from atendimento.maca_mediuns mm join atendimento.profiles p on p.id = mm.user_id where mm.maca_id = m.id), '[]'::jsonb)
    ) order by m.numero)
    from atendimento.macas m
    where m.ativa and m.dia::text = v_dia and m.id <> p_maca_origem), '[]'::jsonb);
end $$;

-- Consulentes ativos de outra maca, com a presença na sessão escolhida e o histórico de datas
create or replace function atendimento.consulentes_de_outra_maca(p_maca_origem uuid, p_maca uuid, p_sessao uuid)
returns jsonb language plpgsql stable security definer set search_path = atendimento, public as $$
begin
  if not atendimento.pode_lancar_pela_maca(p_maca_origem) then raise exception 'Sem acesso a esta maca.'; end if;
  if (select dia from atendimento.macas where id = p_maca) is distinct from (select dia from atendimento.macas where id = p_maca_origem) then
    raise exception 'A maca escolhida não é do mesmo dia.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'nome', c.nome, 'frequencia', coalesce(c.frequencia, 'semanal'),
      'sessoes_totais', d.sessoes_totais, 'realizados', d.sessoes_realizadas, 'created_at', d.created_at,
      'presenca', (select jsonb_build_object('status', p.status, 'observacao', p.observacao, 'atendido_em_maca_id', p.atendido_em_maca_id)
                   from atendimento.presencas p where p.designacao_id = d.id and p.sessao_id = p_sessao),
      'datas', coalesce((select jsonb_agg(jsonb_build_object('data', s.data, 'status', p.status) order by s.data)
                         from atendimento.presencas p join atendimento.sessoes s on s.id = p.sessao_id where p.designacao_id = d.id), '[]'::jsonb)
    ) order by c.nome)
    from atendimento.designacoes d join atendimento.consulentes c on c.id = d.consulente_id
    where d.maca_id = p_maca and d.status = 'ativa'), '[]'::jsonb);
end $$;

-- Lança presença (e observação) de um consulente de outra maca
create or replace function atendimento.lancar_presenca_outra_maca(
  p_maca_origem uuid, p_designacao uuid, p_sessao uuid, p_status atendimento.presenca_status, p_observacao text default null)
returns jsonb language plpgsql security definer set search_path = atendimento, public as $$
declare v_maca uuid; v_status text;
begin
  if not atendimento.pode_lancar_pela_maca(p_maca_origem) then raise exception 'Sem acesso a esta maca.'; end if;
  select maca_id, status::text into v_maca, v_status from atendimento.designacoes where id = p_designacao;
  if v_maca is null then raise exception 'Consulente não encontrado.'; end if;
  if v_status <> 'ativa' then raise exception 'Este consulente não está ativo na maca dele.'; end if;
  if (select dia from atendimento.macas where id = v_maca) is distinct from (select dia from atendimento.macas where id = p_maca_origem) then
    raise exception 'A maca do consulente não é do mesmo dia.';
  end if;
  insert into atendimento.presencas (designacao_id, sessao_id, status, observacao, atendido_em_maca_id)
  values (p_designacao, p_sessao, p_status, nullif(btrim(coalesce(p_observacao, '')), ''), case when v_maca <> p_maca_origem then p_maca_origem end)
  on conflict (designacao_id, sessao_id) do update
    set status = excluded.status,
        observacao = coalesce(excluded.observacao, atendimento.presencas.observacao),
        atendido_em_maca_id = excluded.atendido_em_maca_id;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function atendimento.pode_lancar_pela_maca(uuid) from public, anon;
revoke execute on function atendimento.outras_macas_do_dia(uuid) from public, anon;
revoke execute on function atendimento.consulentes_de_outra_maca(uuid, uuid, uuid) from public, anon;
revoke execute on function atendimento.lancar_presenca_outra_maca(uuid, uuid, uuid, atendimento.presenca_status, text) from public, anon;
grant execute on function atendimento.pode_lancar_pela_maca(uuid) to authenticated;
grant execute on function atendimento.outras_macas_do_dia(uuid) to authenticated;
grant execute on function atendimento.consulentes_de_outra_maca(uuid, uuid, uuid) to authenticated;
grant execute on function atendimento.lancar_presenca_outra_maca(uuid, uuid, uuid, atendimento.presenca_status, text) to authenticated;
