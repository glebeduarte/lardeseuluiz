CREATE OR REPLACE FUNCTION public.fn_inativa_por_faltas_consecutivas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last2 text[];
  v_justificadas int;
BEGIN
  -- 2 faltas (não justificadas) consecutivas
  SELECT ARRAY(
    SELECT p.status::text
    FROM public.presencas p
    JOIN public.sessoes s ON s.id = p.sessao_id
    WHERE p.designacao_id = NEW.designacao_id
    ORDER BY s.data DESC, p.created_at DESC
    LIMIT 2
  ) INTO v_last2;

  IF array_length(v_last2, 1) = 2
     AND v_last2[1] = 'ausente'
     AND v_last2[2] = 'ausente' THEN
    UPDATE public.designacoes
       SET status = 'cancelada'::designacao_status,
           closed_at = COALESCE(closed_at, now())
     WHERE id = NEW.designacao_id;
    RETURN NEW;
  END IF;

  -- 4 faltas justificadas no total
  SELECT count(*) INTO v_justificadas
    FROM public.presencas
    WHERE designacao_id = NEW.designacao_id
      AND status = 'falta_justificada';

  IF v_justificadas >= 4 THEN
    UPDATE public.designacoes
       SET status = 'cancelada'::designacao_status,
           closed_at = COALESCE(closed_at, now())
     WHERE id = NEW.designacao_id;
  END IF;

  RETURN NEW;
END;
$function$;