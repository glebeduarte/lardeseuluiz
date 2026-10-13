-- Add audience field for target audience (trabalhadores, frequentadores, or both)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'ambos';

-- Add constraint to ensure valid values
ALTER TABLE public.courses ADD CONSTRAINT courses_audience_check CHECK (audience IN ('trabalhadores', 'frequentadores', 'ambos'));