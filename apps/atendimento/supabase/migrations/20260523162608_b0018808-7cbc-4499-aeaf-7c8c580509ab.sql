
CREATE TABLE IF NOT EXISTS public.maca_mediuns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maca_id uuid NOT NULL REFERENCES public.macas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (maca_id, user_id)
);

ALTER TABLE public.maca_mediuns ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_medium_of_maca(_user_id uuid, _maca_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.maca_mediuns
    WHERE user_id = _user_id AND maca_id = _maca_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_medium_of_designacao(_user_id uuid, _designacao_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.designacoes d
    JOIN public.maca_mediuns mm ON mm.maca_id = d.maca_id
    WHERE d.id = _designacao_id AND mm.user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "maca_mediuns admin all" ON public.maca_mediuns;
CREATE POLICY "maca_mediuns admin all" ON public.maca_mediuns
  FOR ALL TO public
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "maca_mediuns read" ON public.maca_mediuns;
CREATE POLICY "maca_mediuns read" ON public.maca_mediuns
  FOR SELECT TO public
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "macas read auth" ON public.macas;
CREATE POLICY "macas read auth" ON public.macas
  FOR SELECT TO public
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'recepcao')
    OR public.has_role(auth.uid(), 'dialogador')
    OR (
      public.has_role(auth.uid(), 'medium')
      AND public.is_medium_of_maca(auth.uid(), id)
    )
  );

DROP POLICY IF EXISTS "designacoes read" ON public.designacoes;
CREATE POLICY "designacoes read" ON public.designacoes
  FOR SELECT TO public
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'recepcao')
    OR public.has_role(auth.uid(), 'dialogador')
    OR (
      public.has_role(auth.uid(), 'medium')
      AND public.is_medium_of_maca(auth.uid(), maca_id)
    )
  );

DROP POLICY IF EXISTS "designacoes update dialog" ON public.designacoes;
DROP POLICY IF EXISTS "designacoes update" ON public.designacoes;
CREATE POLICY "designacoes update" ON public.designacoes
  FOR UPDATE TO public
  USING (
    public.is_dialogador_or_admin(auth.uid())
    OR (
      public.has_role(auth.uid(), 'medium')
      AND public.is_medium_of_maca(auth.uid(), maca_id)
    )
  );

DROP POLICY IF EXISTS "presencas insert" ON public.presencas;
CREATE POLICY "presencas insert" ON public.presencas
  FOR INSERT TO public
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'dialogador')
    OR (
      public.has_role(auth.uid(), 'medium')
      AND public.is_medium_of_designacao(auth.uid(), designacao_id)
    )
  );

DROP POLICY IF EXISTS "presencas update" ON public.presencas;
CREATE POLICY "presencas update" ON public.presencas
  FOR UPDATE TO public
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'dialogador')
    OR (
      public.has_role(auth.uid(), 'medium')
      AND public.is_medium_of_designacao(auth.uid(), designacao_id)
    )
  );
