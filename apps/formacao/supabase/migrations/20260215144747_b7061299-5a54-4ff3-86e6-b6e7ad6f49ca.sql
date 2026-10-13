
-- Table to store student dashboard configuration
CREATE TABLE public.dashboard_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_image_url text,
  hero_title text DEFAULT 'Olá, {name}! 👋',
  hero_subtitle text DEFAULT 'Continue sua jornada de aprendizado',
  announcement_enabled boolean DEFAULT false,
  announcement_text text,
  announcement_type text DEFAULT 'info',
  show_hero boolean DEFAULT true,
  show_filters boolean DEFAULT true,
  show_search boolean DEFAULT true,
  sections_order text[] DEFAULT ARRAY['enrolled', 'catalog'],
  custom_css text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.dashboard_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the config
CREATE POLICY "Authenticated users can view dashboard config"
ON public.dashboard_config
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage dashboard config"
ON public.dashboard_config
FOR ALL
USING (is_admin(auth.uid()));

-- Insert default row
INSERT INTO public.dashboard_config (id) VALUES (gen_random_uuid());
