
ALTER TABLE public.presencas ADD COLUMN IF NOT EXISTS admin_editado boolean NOT NULL DEFAULT false;
ALTER TABLE public.sessoes ADD COLUMN IF NOT EXISTS admin_editado boolean NOT NULL DEFAULT false;
ALTER TABLE public.sessoes ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.sessoes ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Marca automaticamente as edições feitas por administradores em presenças
CREATE OR REPLACE FUNCTION public.fn_presencas_set_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    NEW.admin_editado = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Sessões: trigger equivalente
CREATE OR REPLACE FUNCTION public.fn_sessoes_set_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    NEW.admin_editado = true;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sessoes_set_updated ON public.sessoes;
CREATE TRIGGER trg_sessoes_set_updated
BEFORE UPDATE ON public.sessoes
FOR EACH ROW EXECUTE FUNCTION public.fn_sessoes_set_updated();

-- Política para admin poder atualizar/excluir sessões e presenças sem restrição
DROP POLICY IF EXISTS "admins podem atualizar sessoes" ON public.sessoes;
CREATE POLICY "admins podem atualizar sessoes"
ON public.sessoes FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins podem atualizar presencas" ON public.presencas;
CREATE POLICY "admins podem atualizar presencas"
ON public.presencas FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins podem excluir presencas" ON public.presencas;
CREATE POLICY "admins podem excluir presencas"
ON public.presencas FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
