
-- Permitir que qualquer médium (não só os vinculados à maca) registre
-- presenças, encaminhamentos e altas dos consulentes.

-- presencas: INSERT
DROP POLICY IF EXISTS "presencas insert" ON public.presencas;
CREATE POLICY "presencas insert"
  ON public.presencas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'dialogador'::public.app_role)
    OR public.has_role(auth.uid(), 'medium'::public.app_role)
  );

-- presencas: UPDATE
DROP POLICY IF EXISTS "presencas update" ON public.presencas;
CREATE POLICY "presencas update"
  ON public.presencas FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'dialogador'::public.app_role)
    OR public.has_role(auth.uid(), 'medium'::public.app_role)
  );

-- designacoes: INSERT (qualquer médium pode criar designação)
DROP POLICY IF EXISTS "designacoes insert operacional" ON public.designacoes;
CREATE POLICY "designacoes insert operacional"
  ON public.designacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_recepcao_or_dialog_or_admin(auth.uid())
    OR public.has_role(auth.uid(), 'medium'::public.app_role)
  );

-- designacoes: SELECT (qualquer médium pode ver designações)
DROP POLICY IF EXISTS "designacoes read" ON public.designacoes;
CREATE POLICY "designacoes read"
  ON public.designacoes FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'recepcao'::public.app_role)
    OR public.has_role(auth.uid(), 'dialogador'::public.app_role)
    OR public.has_role(auth.uid(), 'medium'::public.app_role)
  );

-- designacoes: UPDATE (qualquer médium pode encaminhar/dar alta/prorrogar)
DROP POLICY IF EXISTS "designacoes update" ON public.designacoes;
CREATE POLICY "designacoes update"
  ON public.designacoes FOR UPDATE
  TO authenticated
  USING (
    public.is_dialogador_or_admin(auth.uid())
    OR public.has_role(auth.uid(), 'medium'::public.app_role)
  );

-- consulentes: SELECT (qualquer médium pode abrir ficha)
DROP POLICY IF EXISTS "consulentes read" ON public.consulentes;
CREATE POLICY "consulentes read"
  ON public.consulentes FOR SELECT
  TO authenticated
  USING (
    public.is_recepcao_or_dialog_or_admin(auth.uid())
    OR public.has_role(auth.uid(), 'medium'::public.app_role)
  );

-- consulentes: UPDATE (qualquer médium pode marcar dialogo_pendente etc.)
DROP POLICY IF EXISTS "consulentes update" ON public.consulentes;
CREATE POLICY "consulentes update"
  ON public.consulentes FOR UPDATE
  TO authenticated
  USING (
    public.is_dialogador_or_admin(auth.uid())
    OR public.has_role(auth.uid(), 'medium'::public.app_role)
  );
