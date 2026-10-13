
ALTER TABLE public.designacoes ALTER COLUMN sessoes_totais SET DEFAULT 8;

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
begin
  select count(*) into v_total from public.presencas
    where designacao_id = NEW.designacao_id and status in ('presente', 'atendimento_distancia');

  select sessoes_totais, status, consulente_id, (status = 'concluida')
    into v_meta, v_status, v_consulente, v_was_concluida
    from public.designacoes where id = NEW.designacao_id;

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
