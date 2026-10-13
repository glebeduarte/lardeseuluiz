
CREATE TABLE public.esde_calendar_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_code text NOT NULL DEFAULT 'ESDE_I',
  date_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  roteiro text NOT NULL DEFAULT '',
  tema text NOT NULL DEFAULT '',
  modulo text NOT NULL DEFAULT '',
  facilitador text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'aula',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.esde_calendar_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view esde calendar"
ON public.esde_calendar_entries FOR SELECT
USING (true);

CREATE POLICY "Admins can manage esde calendar"
ON public.esde_calendar_entries FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER esde_calendar_set_updated_at
BEFORE UPDATE ON public.esde_calendar_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.esde_calendar_entries (course_code, sort_order, date_label, roteiro, tema, modulo, facilitador, tipo) VALUES
('ESDE_I', 1, '26/02/2026', '1', 'Espiritismo ou Doutrina Espírita: conceito e objeto. Tríplice aspecto da Doutrina Espírita', 'Módulo I', 'Glebe Mello', 'aula'),
('ESDE_I', 2, '05/03/2026', '2', 'Princípios básicos da Doutrina Espírita', 'Módulo I', 'Emília Vasconcelos', 'aula'),
('ESDE_I', 3, '12/03/2026', '3', 'O contexto histórico do século XIX na Europa', 'Módulo II', 'Glebe Duarte', 'aula'),
('ESDE_I', 4, '19/03/2026', '4', 'Fenômenos mediúnicos que antecederam a Codificação: Hydesville e mesas girantes', 'Módulo II', 'Hylana Lopes', 'aula'),
('ESDE_I', 5, '26/03/2026', '5', 'Allan Kardec: o professor e o codificador', 'Módulo II', 'Glebe Mello', 'aula'),
('ESDE_I', 6, '02/04/2026', '6', 'Metodologia e critérios utilizados na Codificação Espírita', 'Módulo II', 'Glebe Duarte', 'aula'),
('ESDE_I', 7, '09/04/2026', '7', 'Obras básicas', 'Módulo II', 'Emília Vasconcelos', 'aula'),
('ESDE_I', 8, '16/04/2026', '8', 'Expoentes do Espiritismo nascente', 'Módulo II', 'Hylana Lopes', 'aula'),
('ESDE_I', 9, '23/04/2026', '9', 'Deus: conceito e provas filosóficas de sua existência', 'Módulo III', 'Glebe Mello', 'aula'),
('ESDE_I', 10, '30/04/2026', '10', 'Atributos da divindade', 'Módulo III', 'Emília Vasconcelos', 'aula'),
('ESDE_I', 11, '07/05/2026', '11', 'A Providência Divina', 'Módulo III', 'Glebe Duarte', 'aula'),
('ESDE_I', 12, '14/05/2026', '12', 'Origem e natureza do Espírito', 'Módulo IV', 'Hylana Lopes', 'aula'),
('ESDE_I', 13, '21/05/2026', '13', 'Perispírito: conceito e natureza', 'Módulo IV', 'Glebe Mello', 'aula'),
('ESDE_I', 14, '28/05/2026', '14', 'Provas da existência e da sobrevivência do Espírito', 'Módulo IV', 'Emília Vasconcelos', 'aula'),
('ESDE_I', 15, '04/06/2026', 'Feriado de Corpus Christi', '', '', '', 'feriado'),
('ESDE_I', 16, '11/06/2026', '15', 'Progressão dos Espíritos', 'Módulo IV', 'Glebe Duarte', 'aula'),
('ESDE_I', 17, '18/06/2026', '16', 'Influência dos Espíritos em nossos pensamentos e atos, e nos acontecimentos da vida', 'Módulo V', 'Hylana Lopes', 'aula'),
('ESDE_I', 18, '25/06/2026', '17', 'Mediunidade e médium', 'Módulo V', 'Glebe Mello', 'aula'),
('ESDE_I', 19, '02/07/2026', '18', 'Mediunidade com Jesus', 'Módulo V', 'Emília Vasconcelos', 'aula'),
('ESDE_I', 20, '09/07/2026', 'Recesso', '', '', '', 'recesso'),
('ESDE_I', 21, '16/07/2026', 'Recesso', '', '', '', 'recesso');
