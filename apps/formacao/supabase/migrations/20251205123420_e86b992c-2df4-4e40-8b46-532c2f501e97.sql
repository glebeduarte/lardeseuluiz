-- Add study_lines column to courses table (array to support multiple selections)
ALTER TABLE public.courses 
ADD COLUMN study_lines text[] DEFAULT '{}' NOT NULL;