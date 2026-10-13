
ALTER TABLE public.designacoes
  ADD COLUMN IF NOT EXISTS sessoes_totais integer NOT NULL DEFAULT 4;

UPDATE public.designacoes SET sessoes_totais = 4 WHERE sessoes_totais IS NULL OR sessoes_totais = 0;

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
    where designacao_id = NEW.designacao_id and status = 'presente';
  select sessoes_totais into v_meta from public.designacoes where id = NEW.designacao_id;

  update public.designacoes
    set sessoes_realizadas = v_total,
        status = case when v_total >= coalesce(v_meta, 4) then 'concluida'::designacao_status else status end,
        closed_at = case when v_total >= coalesce(v_meta, 4) and closed_at is null then now() else closed_at end
    where id = NEW.designacao_id;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS trg_atualiza_sessoes ON public.presencas;
CREATE TRIGGER trg_atualiza_sessoes
  AFTER INSERT OR UPDATE ON public.presencas
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualiza_sessoes_realizadas();
