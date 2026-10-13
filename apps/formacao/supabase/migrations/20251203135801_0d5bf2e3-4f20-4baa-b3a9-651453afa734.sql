-- Add category column to courses table
ALTER TABLE public.courses 
ADD COLUMN category text DEFAULT 'trabalhadores' CHECK (category IN ('trabalhadores', 'frequentadores'));