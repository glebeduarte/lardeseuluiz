
-- Add new metadata fields to courses table for the redesign
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS long_description text,
ADD COLUMN IF NOT EXISTS learning_topics text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS schedule text,
ADD COLUMN IF NOT EXISTS facilitator text,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;
