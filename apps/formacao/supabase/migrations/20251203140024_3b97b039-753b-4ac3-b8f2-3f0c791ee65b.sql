-- Update category constraint to allow 'ambos'
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_category_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_category_check CHECK (category IN ('trabalhadores', 'frequentadores', 'ambos'));