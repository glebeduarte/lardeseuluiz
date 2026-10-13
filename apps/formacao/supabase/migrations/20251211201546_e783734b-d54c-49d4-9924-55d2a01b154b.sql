-- Add enrollment_open column to courses table
ALTER TABLE public.courses 
ADD COLUMN enrollment_open boolean NOT NULL DEFAULT true;