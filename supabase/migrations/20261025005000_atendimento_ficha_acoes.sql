-- Atendimento: ações da ficha do consulente num lugar só.
-- Cada botão da ficha chama atendimento.ficha_acao(consulente, ação). A função confere o papel de quem chama,
-- faz a mudança inteira de uma vez e devolve uma mensagem curta para a tela.
--
-- Ações e quem pode:
--   dar_alta            dialogador ou admin. Encerra a maca ativa (motivo "alta") e grava alta_at / alta_by.
--   reabrir             dialogador ou admin. Desfaz a alta para um novo tratamento (depois escolhe a maca).
--   dialogo_feito       dialogador ou admin. Tira o "diálogo pendente" (por exemplo, depois do cadastro rápido).
--   voltar_maca         dialogador ou admin. Reativa a última maca e recomeça a contagem de sessões.
--   encerrar_sem_alta   dialogador ou admin. Fecha a maca ativa com motivo "encerrado_sem_alta" (não conta como alta).
--   encaminhar_dialogo  médium da maca ou admin. Fecha a maca ativa e deixa o diálogo pendente.
--   encaminhar_alta     médium da maca ou admin. Fecha a maca ativa com motivo "alta" e deixa o diálogo pendente.
--   prorrogar           médium da maca, dialogador ou admin. Soma p_qtd sessões ao ciclo ativo.

create or replace function atendimento.ficha_acao(p_consulente uuid, p_acao text, p_qtd int default null)
returns jsonb
language plpgsql security definer set search_path = atendimento, public as $$
declare
  v_uid uuid := auth.uid();
  c atendimento.consulentes;
  v_ativa atendimento.designacoes;
  v_ultima atendimento.designacoes;
  v_dialogo boolean;
  v_medium boolean := false;
  v_msg text;
begin
  if v_uid is null then raise exception 'Entre na plataforma.'; end if;
  select * into c from atendimento.consulentes where id = p_consulente for update;
  if c.id is null then raise exception 'Consulente não encontrado.'; end if;

  v_dialogo := atendimento.is_dialogador_or_admin(v_uid);
  select * into v_ativa from atendimento.designacoes
   where consulente_id = c.id and status = 'ativa' order by created_at desc limit 1;
  select * into v_ultima from atendimento.designacoes
   where consulente_id = c.id and status <> 'ativa' order by coalesce(closed_at, created_at) desc limit 1;
  if v_ativa.id is not null then
    v_medium := atendimento.has_role(v_uid, 'medium'::atendimento.app_role) and atendimento.is_medium_of_maca(v_uid, v_ativa.maca_id);
  end if;

  if p_acao = 'dar_alta' then
    if not v_dialogo then raise exception 'Só o dialogador ou o administrador dão alta.'; end if;
    if c.alta_at is not null then raise exception 'Este consulente já recebeu alta.'; end if;
    update atendimento.designacoes
       set status = 'concluida', closed_at = coalesce(closed_at, now()), closure_reason = 'alta'
     where consulente_id = c.id and status = 'ativa';
    update atendimento.consulentes set alta_at = now(), alta_by = v_uid, dialogo_pendente = false where id = c.id;
    v_msg := 'Alta concedida.';

  elsif p_acao = 'reabrir' then
    if not v_dialogo then raise exception 'Só o dialogador ou o administrador reabrem o atendimento.'; end if;
    if c.alta_at is null then raise exception 'Este consulente não está de alta.'; end if;
    update atendimento.consulentes set alta_at = null, alta_by = null, dialogo_pendente = false where id = c.id;
    v_msg := 'Atendimento reaberto. Agora escolha a maca.';

  elsif p_acao = 'dialogo_feito' then
    if not v_dialogo then raise exception 'Só o dialogador ou o administrador registram o diálogo.'; end if;
    update atendimento.consulentes set dialogo_pendente = false where id = c.id;
    v_msg := 'Diálogo registrado.';

  elsif p_acao = 'voltar_maca' then
    if not v_dialogo then raise exception 'Só o dialogador ou o administrador reativam a maca.'; end if;
    if c.alta_at is not null then raise exception 'Reabra o atendimento antes de voltar para a maca.'; end if;
    if v_ativa.id is not null then raise exception 'O consulente já está em uma maca.'; end if;
    if v_ultima.id is null then raise exception 'Não há maca anterior. Use "Escolher maca".'; end if;
    update atendimento.designacoes
       set status = 'ativa', closed_at = null, closure_reason = null, sessoes_realizadas = 0,
           reactivated_at = now(), reactivated_by = v_uid
     where id = v_ultima.id;
    update atendimento.consulentes set dialogo_pendente = false where id = c.id;
    v_msg := 'Consulente de volta à maca. A contagem de sessões recomeçou.';

  elsif p_acao = 'encerrar_sem_alta' then
    if not v_dialogo then raise exception 'Só o dialogador ou o administrador encerram o acompanhamento.'; end if;
    if v_ativa.id is null then raise exception 'Não há maca ativa para encerrar.'; end if;
    update atendimento.designacoes
       set status = 'cancelada', closed_at = now(), closure_reason = 'encerrado_sem_alta'
     where consulente_id = c.id and status = 'ativa';
    update atendimento.consulentes set dialogo_pendente = false where id = c.id;
    v_msg := 'Acompanhamento encerrado, sem alta.';

  elsif p_acao in ('encaminhar_dialogo', 'encaminhar_alta') then
    if v_ativa.id is null then raise exception 'Não há maca ativa para este consulente.'; end if;
    if not (v_medium or atendimento.is_admin(v_uid)) then raise exception 'Só o médium da maca ou o administrador encaminham.'; end if;
    update atendimento.designacoes
       set status = case when p_acao = 'encaminhar_alta' then 'concluida'::designacao_status else 'cancelada'::designacao_status end,
           closed_at = now(),
           closure_reason = case when p_acao = 'encaminhar_alta' then 'alta' else 'encaminhamento_dialogo' end
     where id = v_ativa.id;
    update atendimento.consulentes set dialogo_pendente = true where id = c.id;
    v_msg := case when p_acao = 'encaminhar_alta' then 'Encaminhado para alta. O diálogo faz o encerramento.' else 'Encaminhado ao diálogo.' end;

  elsif p_acao = 'prorrogar' then
    if v_ativa.id is null then raise exception 'Não há maca ativa para prorrogar.'; end if;
    if not (v_medium or v_dialogo) then raise exception 'Só o médium da maca, o dialogador ou o administrador prorrogam.'; end if;
    if coalesce(p_qtd, 0) < 1 or p_qtd > 30 then raise exception 'Informe de 1 a 30 atendimentos.'; end if;
    update atendimento.designacoes set sessoes_totais = coalesce(sessoes_totais, 8) + p_qtd where id = v_ativa.id;
    v_msg := format('Prorrogado por mais %s atendimento(s).', p_qtd);

  else
    raise exception 'Ação desconhecida.';
  end if;

  return jsonb_build_object('ok', true, 'mensagem', v_msg);
end $$;

revoke all on function atendimento.ficha_acao(uuid, text, int) from public, anon;
grant execute on function atendimento.ficha_acao(uuid, text, int) to authenticated;

notify pgrst, 'reload schema';
