
CREATE TABLE public.palestras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana text NOT NULL,
  data date NOT NULL,
  hora text NOT NULL DEFAULT '-',
  palestrante text NOT NULL DEFAULT '-',
  tema text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.palestras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view palestras"
  ON public.palestras FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert palestras"
  ON public.palestras FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
