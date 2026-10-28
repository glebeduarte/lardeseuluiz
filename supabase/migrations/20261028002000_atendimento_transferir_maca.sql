-- Atendimento: transferência de maca pela ficha do consulente.
-- atendimento.transferir_maca(consulente, maca de origem, maca de destino, modo, motivo)
--   modo 'trocar'     sai da maca de origem (motivo "transferencia") e entra na de destino.
--   modo 'adicionar'  continua na maca de origem e entra também na de destino.
-- Quem pode: dialogador, administrador ou o médium da maca de origem.
-- Fica no histórico: a designação nova guarda de onde veio, a antiga fecha como "Transferido"
-- e uma observação na ficha registra quem fez, quando e por quê.

create or replace function atendimento.transferir_maca(
  p_consulente uuid, p_origem uuid, p_destino uuid, p_modo text, p_motivo text default null
) returns jsonb
language plpgsql security definer set search_path = atendimento, public as $$
declare
  v_uid uuid := auth.uid();
  c atendimento.consulentes;
  o atendimento.designacoes;
  mo atendimento.macas;
  md atendimento.macas;
  v_nova uuid;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_txt text;
begin
  if v_uid is null then raise exception 'Entre na plataforma.'; end if;
  if p_modo not in ('trocar', 'adicionar') then raise exception 'Escolha se ele sai da maca atual ou fica nas duas.'; end if;

  select * into c from atendimento.consulentes where id = p_consulente for update;
  if c.id is null then raise exception 'Consulente não encontrado.'; end if;
  if c.alta_at is not null then raise exception 'Este consulente está de alta. Reabra o atendimento antes.'; end if;

  select * into o from atendimento.designacoes
   where id = p_origem and consulente_id = c.id and status = 'ativa' for update;
  if o.id is null then raise exception 'A maca de origem não está ativa para este consulente.'; end if;

  if not (atendimento.is_dialogador_or_admin(v_uid)
          or (atendimento.has_role(v_uid, 'medium'::atendimento.app_role) and atendimento.is_medium_of_maca(v_uid, o.maca_id))) then
    raise exception 'Só o dialogador, o administrador ou o médium da maca transferem o consulente.';
  end if;

  select * into mo from atendimento.macas where id = o.maca_id;
  select * into md from atendimento.macas where id = p_destino;
  if md.id is null or not md.ativa then raise exception 'Maca de destino não encontrada ou inativa.'; end if;
  if md.id = mo.id then raise exception 'Escolha uma maca diferente da atual.'; end if;
  if exists (select 1 from atendimento.designacoes where consulente_id = c.id and maca_id = md.id and status = 'ativa') then
    raise exception 'O consulente já está na Maca %.', md.numero;
  end if;

  insert into atendimento.designacoes (consulente_id, maca_id, dialogador_id, status, observacoes)
  values (c.id, md.id, v_uid, 'ativa',
          case when p_modo = 'trocar' then 'Transferido da Maca ' || mo.numero || ' · ' || mo.nome
               else 'Adicionado mantendo a Maca ' || mo.numero || ' · ' || mo.nome end
          || coalesce('. Motivo: ' || v_motivo, ''))
  returning id into v_nova;

  if p_modo = 'trocar' then
    update atendimento.designacoes
       set status = 'cancelada', closed_at = now(), closure_reason = 'transferencia',
           observacoes = concat_ws(' · ', nullif(observacoes, ''), 'Transferido para a Maca ' || md.numero || ' · ' || md.nome)
     where id = o.id;
    v_txt := 'Transferência de maca: saiu da Maca ' || mo.numero || ' · ' || mo.nome
          || ' (' || o.sessoes_realizadas || ' de ' || o.sessoes_totais || ' sessões) e foi para a Maca '
          || md.numero || ' · ' || md.nome || '.';
  else
    v_txt := 'Maca adicionada: passou a ser atendido também na Maca ' || md.numero || ' · ' || md.nome
          || ', continuando na Maca ' || mo.numero || ' · ' || mo.nome || '.';
  end if;
  if v_motivo is not null then v_txt := v_txt || ' Motivo: ' || v_motivo; end if;

  insert into atendimento.consulente_observacoes (consulente_id, autor_id, conteudo) values (c.id, v_uid, v_txt);

  return jsonb_build_object(
    'designacao', v_nova,
    'mensagem', case when p_modo = 'trocar'
      then 'Transferido para a Maca ' || md.numero || '.'
      else 'Agora também na Maca ' || md.numero || '.' end);
end $$;

revoke all on function atendimento.transferir_maca(uuid, uuid, uuid, text, text) from public, anon;
grant execute on function atendimento.transferir_maca(uuid, uuid, uuid, text, text) to authenticated;

-- Lista de macas para escolher o destino (o médium não enxerga as outras macas pela RLS).
create or replace function atendimento.macas_para_transferencia()
returns table (id uuid, numero int, nome text, cor_hex text, dia text, lotacao_max int, ativos bigint)
language sql stable security definer set search_path = atendimento, public as $$
  select m.id, m.numero, m.nome, m.cor_hex, m.dia::text, m.lotacao_max,
         (select count(*) from atendimento.designacoes d where d.maca_id = m.id and d.status = 'ativa')
    from atendimento.macas m
   where m.ativa and auth.uid() is not null
   order by m.numero
$$;
revoke all on function atendimento.macas_para_transferencia() from public, anon;
grant execute on function atendimento.macas_para_transferencia() to authenticated;
