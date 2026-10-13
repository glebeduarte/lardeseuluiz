
-- Event types enum
CREATE TYPE public.site_event_type AS ENUM ('palestra', 'evento', 'acao_social', 'curso', 'outro');

-- Main events table
CREATE TABLE public.site_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type site_event_type NOT NULL DEFAULT 'evento',
  event_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  speaker TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

-- Public can view published events
CREATE POLICY "Public can view published events"
  ON public.site_events FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Authenticated can view all events
CREATE POLICY "Authenticated can view all events"
  ON public.site_events FOR SELECT TO authenticated
  USING (true);

-- Admins/directors can insert
CREATE POLICY "Admins can insert events"
  ON public.site_events FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));

-- Admins/directors can update
CREATE POLICY "Admins can update events"
  ON public.site_events FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));

-- Admins can delete
CREATE POLICY "Admins can delete events"
  ON public.site_events FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
