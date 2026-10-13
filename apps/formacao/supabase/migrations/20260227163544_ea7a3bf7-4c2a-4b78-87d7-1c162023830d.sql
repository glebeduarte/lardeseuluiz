
-- Create the update_updated_at function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create books table for the catalog
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  spirit TEXT,
  description TEXT,
  cover_url TEXT,
  pdf_url TEXT,
  tags TEXT[] DEFAULT '{}',
  study_lines TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Books are publicly readable
CREATE POLICY "Books are viewable by everyone"
  ON public.books FOR SELECT USING (true);

-- Only admins can manage books
CREATE POLICY "Admins can insert books"
  ON public.books FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update books"
  ON public.books FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete books"
  ON public.books FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
