
ALTER TABLE public.designacoes
  ADD COLUMN IF NOT EXISTS reactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reactivated_by uuid;

CREATE OR REPLACE FUNCTION public.fn_inativa_por_faltas_consecutivas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_last2 text[];
  v_justificadas int;
  v_react timestamptz;
BEGIN
  SELECT reactivated_at INTO v_react FROM public.designacoes WHERE id = NEW.designacao_id;

  SELECT ARRAY(
    SELECT p.status::text
    FROM public.presencas p
    JOIN public.sessoes s ON s.id = p.sessao_id
    WHERE p.designacao_id = NEW.designacao_id
      AND (v_react IS NULL OR p.created_at > v_react)
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

  SELECT count(*) INTO v_justificadas
    FROM public.presencas
    WHERE designacao_id = NEW.designacao_id
      AND status = 'falta_justificada'
      AND (v_react IS NULL OR created_at > v_react);

  IF v_justificadas >= 4 THEN
    UPDATE public.designacoes
       SET status = 'cancelada'::designacao_status,
           closed_at = COALESCE(closed_at, now())
     WHERE id = NEW.designacao_id;
  END IF;

  RETURN NEW;
END;
$function$;
