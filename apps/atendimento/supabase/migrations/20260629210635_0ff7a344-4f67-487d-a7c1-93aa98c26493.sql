
CREATE TABLE public.consulente_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulente_id uuid NOT NULL REFERENCES public.consulentes(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consulente_observacoes_consulente ON public.consulente_observacoes(consulente_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consulente_observacoes TO authenticated;
GRANT ALL ON public.consulente_observacoes TO service_role;

ALTER TABLE public.consulente_observacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mediums, dialogadores e admins podem ler observacoes"
  ON public.consulente_observacoes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'medium')
    OR public.has_role(auth.uid(), 'dialogador')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Mediums, dialogadores e admins podem criar observacoes"
  ON public.consulente_observacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'medium')
      OR public.has_role(auth.uid(), 'dialogador')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Autor ou admin podem editar observacao"
  ON public.consulente_observacoes FOR UPDATE
  TO authenticated
  USING (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Autor ou admin podem remover observacao"
  ON public.consulente_observacoes FOR DELETE
  TO authenticated
  USING (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_consulente_observacoes_updated
  BEFORE UPDATE ON public.consulente_observacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_presencas_set_updated();
