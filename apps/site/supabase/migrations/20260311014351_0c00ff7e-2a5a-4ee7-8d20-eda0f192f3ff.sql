
-- Secretarias table
CREATE TABLE public.secretarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text DEFAULT '📋',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view secretarias" ON public.secretarias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage secretarias" ON public.secretarias FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can update secretarias" ON public.secretarias FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete secretarias" ON public.secretarias FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_secretarias_updated_at BEFORE UPDATE ON public.secretarias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Secretaria members (coordenadores e participantes)
CREATE TYPE public.secretaria_member_role AS ENUM ('coordenador', 'participante');

CREATE TABLE public.secretaria_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria_id uuid NOT NULL REFERENCES public.secretarias(id) ON DELETE CASCADE,
  associate_id uuid NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
  member_role secretaria_member_role NOT NULL DEFAULT 'participante',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(secretaria_id, associate_id)
);

ALTER TABLE public.secretaria_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view members" ON public.secretaria_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and coordinators can manage members" ON public.secretaria_members FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can update members" ON public.secretaria_members FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete members" ON public.secretaria_members FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));

-- Responsibilities
CREATE TABLE public.secretaria_responsibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria_id uuid NOT NULL REFERENCES public.secretarias(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  item_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.secretaria_responsibilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view responsibilities" ON public.secretaria_responsibilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage responsibilities" ON public.secretaria_responsibilities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can update responsibilities" ON public.secretaria_responsibilities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete responsibilities" ON public.secretaria_responsibilities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));

-- Actions (ações publicadas pelos coordenadores)
CREATE TYPE public.action_status AS ENUM ('planejada', 'em_andamento', 'concluida', 'cancelada');

CREATE TABLE public.secretaria_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria_id uuid NOT NULL REFERENCES public.secretarias(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  action_status action_status NOT NULL DEFAULT 'planejada',
  action_date date,
  published_by uuid REFERENCES public.associates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.secretaria_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view actions" ON public.secretaria_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and coordinators can insert actions" ON public.secretaria_actions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins and coordinators can update actions" ON public.secretaria_actions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete actions" ON public.secretaria_actions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));

CREATE TRIGGER update_secretaria_actions_updated_at BEFORE UPDATE ON public.secretaria_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
