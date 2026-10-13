CREATE TABLE public.auditoria_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  acao text NOT NULL,
  alvo text,
  justificativa text,
  detalhe jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.auditoria_acoes TO authenticated;
GRANT ALL ON public.auditoria_acoes TO service_role;

ALTER TABLE public.auditoria_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria insert proprio" ON public.auditoria_acoes
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE POLICY "auditoria leitura admin" ON public.auditoria_acoes
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

ALTER TABLE public.macas ADD COLUMN IF NOT EXISTS finalidade text;