
-- Create enum for user type
CREATE TYPE public.user_type AS ENUM ('frequentador', 'trabalhador');

-- Add user_type column to profiles with default 'frequentador'
ALTER TABLE public.profiles 
ADD COLUMN user_type public.user_type NOT NULL DEFAULT 'frequentador';

-- Update existing profiles to 'frequentador'
UPDATE public.profiles SET user_type = 'frequentador';

-- Update handle_new_user trigger to read user_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student'),
    COALESCE((NEW.raw_user_meta_data ->> 'user_type')::user_type, 'frequentador')
  );
  RETURN NEW;
END;
$$;
