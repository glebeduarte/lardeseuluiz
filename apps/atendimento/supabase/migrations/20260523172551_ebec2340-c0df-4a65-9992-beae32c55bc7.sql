
ALTER TABLE public.presencas
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE OR REPLACE FUNCTION public.fn_presencas_set_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presencas_set_updated ON public.presencas;
CREATE TRIGGER trg_presencas_set_updated
BEFORE UPDATE ON public.presencas
FOR EACH ROW
EXECUTE FUNCTION public.fn_presencas_set_updated();
