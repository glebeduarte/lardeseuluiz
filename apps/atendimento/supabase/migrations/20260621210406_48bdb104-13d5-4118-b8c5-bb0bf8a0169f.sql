
CREATE OR REPLACE FUNCTION public.fn_atualiza_sessoes_realizadas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_total int;
  v_meta int;
  v_status designacao_status;
  v_consulente uuid;
  v_was_concluida boolean;
  v_react timestamptz;
begin
  select sessoes_totais, status, consulente_id, (status = 'concluida'), reactivated_at
    into v_meta, v_status, v_consulente, v_was_concluida, v_react
    from public.designacoes where id = NEW.designacao_id;

  select count(*) into v_total from public.presencas
    where designacao_id = NEW.designacao_id
      and status in ('presente', 'atendimento_distancia')
      and (v_react is null or created_at > v_react);

  update public.designacoes
    set sessoes_realizadas = v_total,
        status = case
                   when v_status = 'ativa' and v_total >= coalesce(v_meta, 8) then 'concluida'::designacao_status
                   else status
                 end,
        closed_at = case
                      when v_status = 'ativa' and v_total >= coalesce(v_meta, 8) and closed_at is null then now()
                      else closed_at
                    end
    where id = NEW.designacao_id;

  if v_status = 'ativa' and v_total >= coalesce(v_meta, 8) and not v_was_concluida then
    update public.consulentes
      set dialogo_pendente = true
      where id = v_consulente;
  end if;

  return NEW;
end;
$function$;
