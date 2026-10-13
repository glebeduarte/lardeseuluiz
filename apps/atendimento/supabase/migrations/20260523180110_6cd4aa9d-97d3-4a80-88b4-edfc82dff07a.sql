
DROP POLICY IF EXISTS "consulentes insert operacional" ON public.consulentes;
CREATE POLICY "consulentes insert operacional"
ON public.consulentes
FOR INSERT
WITH CHECK (
  is_recepcao_or_dialog_or_admin(auth.uid())
  OR has_role(auth.uid(), 'medium'::app_role)
);

DROP POLICY IF EXISTS "designacoes insert operacional" ON public.designacoes;
CREATE POLICY "designacoes insert operacional"
ON public.designacoes
FOR INSERT
WITH CHECK (
  is_recepcao_or_dialog_or_admin(auth.uid())
  OR (has_role(auth.uid(), 'medium'::app_role) AND is_medium_of_maca(auth.uid(), maca_id))
);
