ALTER TABLE public.registration_pages
  ADD COLUMN IF NOT EXISTS whatsapp_group_url text,
  ADD COLUMN IF NOT EXISTS thanks_text text;