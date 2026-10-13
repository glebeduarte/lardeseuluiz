CREATE TABLE public.registration_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  info_day text,
  info_time text,
  info_format text,
  info_extra text,
  free_text text,
  course_ids uuid[] NOT NULL DEFAULT '{}',
  show_course_covers boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  cover_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.registration_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_pages TO authenticated;
GRANT ALL ON public.registration_pages TO service_role;

ALTER TABLE public.registration_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active registration pages"
ON public.registration_pages FOR SELECT
USING (is_active OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage registration pages"
ON public.registration_pages FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_registration_pages_updated_at
BEFORE UPDATE ON public.registration_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();