CREATE OR REPLACE FUNCTION public.fn_atualiza_sessoes_realizadas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_total int;
  v_meta int;
begin
  select count(*) into v_total from public.presencas
    where designacao_id = NEW.designacao_id and status in ('presente', 'atendimento_distancia');
  select sessoes_totais into v_meta from public.designacoes where id = NEW.designacao_id;

  update public.designacoes
    set sessoes_realizadas = v_total,
        status = case when v_total >= coalesce(v_meta, 4) then 'concluida'::designacao_status else status end,
        closed_at = case when v_total >= coalesce(v_meta, 4) and closed_at is null then now() else closed_at end
    where id = NEW.designacao_id;
  return NEW;
end;
$function$;