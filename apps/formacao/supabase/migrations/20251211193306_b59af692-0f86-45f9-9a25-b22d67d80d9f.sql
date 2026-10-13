-- Drop the existing category check constraint
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_category_check;

-- Add the new constraint that includes 'materiais'
ALTER TABLE public.courses ADD CONSTRAINT courses_category_check 
CHECK (category IN ('formacoes', 'cursos_extras', 'materiais'));