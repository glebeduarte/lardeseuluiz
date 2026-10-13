
-- Assembly types and status
CREATE TYPE public.assembly_type AS ENUM ('ordinaria', 'extraordinaria');
CREATE TYPE public.assembly_status AS ENUM ('convocada', 'em_andamento', 'encerrada', 'cancelada');
CREATE TYPE public.vote_option AS ENUM ('sim', 'nao', 'abstencao');

-- Assemblies
CREATE TABLE public.assemblies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  assembly_type assembly_type NOT NULL DEFAULT 'ordinaria',
  status assembly_status NOT NULL DEFAULT 'convocada',
  description TEXT,
  scheduled_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  quorum_required INTEGER NOT NULL DEFAULT 50, -- percentage
  convocation_text TEXT,
  minutes_text TEXT, -- generated ata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view assemblies" ON public.assemblies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create assemblies" ON public.assemblies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can update assemblies" ON public.assemblies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete assemblies" ON public.assemblies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_assemblies_updated_at BEFORE UPDATE ON public.assemblies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agenda items (pauta)
CREATE TABLE public.agenda_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  item_order INTEGER NOT NULL DEFAULT 0,
  requires_vote BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view agenda" ON public.agenda_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage agenda" ON public.agenda_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can update agenda" ON public.agenda_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete agenda" ON public.agenda_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Assembly attendees (presença)
CREATE TABLE public.assembly_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assembly_id, associate_id)
);
ALTER TABLE public.assembly_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendees" ON public.assembly_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage attendees" ON public.assembly_attendees FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete attendees" ON public.assembly_attendees FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));

-- Votes
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_item_id UUID NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
  vote vote_option NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agenda_item_id, associate_id)
);
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view votes" ON public.votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can cast vote" ON public.votes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "No vote updates" ON public.votes FOR UPDATE TO authenticated USING (false);

-- Enable realtime for votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assembly_attendees;
