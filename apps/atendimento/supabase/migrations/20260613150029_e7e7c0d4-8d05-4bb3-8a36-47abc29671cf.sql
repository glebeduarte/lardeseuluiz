DROP POLICY "consulentes read" ON public.consulentes;

CREATE POLICY "consulentes read" ON public.consulentes
FOR SELECT
USING (
  is_recepcao_or_dialog_or_admin(auth.uid())
  OR (
    has_role(auth.uid(), 'medium'::app_role)
    AND is_medium_of_consulente_ativa(auth.uid(), id)
  )
);