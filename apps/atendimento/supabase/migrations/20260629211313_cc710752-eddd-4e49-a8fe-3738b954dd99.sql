
-- Remove a restrição antiga (uma única designação ativa por consulente)
DROP INDEX IF EXISTS public.uniq_designacao_ativa;

-- Função que impede duas designações ativas no mesmo dia para o mesmo consulente
CREATE OR REPLACE FUNCTION public.fn_check_designacao_dia_unico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia text;
  v_conflito uuid;
BEGIN
  IF NEW.status <> 'ativa' THEN
    RETURN NEW;
  END IF;

  SELECT m.dia::text INTO v_dia
    FROM public.macas m
    WHERE m.id = NEW.maca_id;

  IF v_dia IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT d.id INTO v_conflito
    FROM public.designacoes d
    JOIN public.macas m ON m.id = d.maca_id
    WHERE d.consulente_id = NEW.consulente_id
      AND d.status = 'ativa'
      AND d.id <> NEW.id
      AND m.dia::text = v_dia
    LIMIT 1;

  IF v_conflito IS NOT NULL THEN
    RAISE EXCEPTION 'Consulente já possui designação ativa em uma maca do mesmo dia (%).', v_dia
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_designacao_dia_unico ON public.designacoes;
CREATE TRIGGER trg_check_designacao_dia_unico
  BEFORE INSERT OR UPDATE OF status, maca_id, consulente_id ON public.designacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_check_designacao_dia_unico();
