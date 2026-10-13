
-- Table: attendance_links
CREATE TABLE public.attendance_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: attendance_records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.attendance_links(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  UNIQUE(lesson_id, user_id)
);

-- RLS on attendance_links
ALTER TABLE public.attendance_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance links"
  ON public.attendance_links
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS on attendance_records
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all attendance records"
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own attendance records"
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role inserts attendance records"
  ON public.attendance_records
  FOR INSERT
  TO service_role
  WITH CHECK (true);
