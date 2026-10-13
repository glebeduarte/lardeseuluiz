
-- Add person_id columns
ALTER TABLE public.secretaria_members ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE CASCADE;
ALTER TABLE public.spiritual_sessions ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;
ALTER TABLE public.contributions      ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE CASCADE;

-- Backfill via cpf (normalized) then email
WITH map AS (
  SELECT a.id AS associate_id, p.id AS person_id
  FROM public.associates a
  JOIN public.people p
    ON (a.cpf IS NOT NULL AND public.normalize_cpf(a.cpf) = p.cpf)
    OR (a.cpf IS NULL AND a.email IS NOT NULL AND lower(btrim(a.email)) = p.email)
)
UPDATE public.secretaria_members sm
SET person_id = m.person_id
FROM map m
WHERE sm.associate_id = m.associate_id AND sm.person_id IS NULL;

WITH map AS (
  SELECT a.id AS associate_id, p.id AS person_id
  FROM public.associates a
  JOIN public.people p
    ON (a.cpf IS NOT NULL AND public.normalize_cpf(a.cpf) = p.cpf)
    OR (a.cpf IS NULL AND a.email IS NOT NULL AND lower(btrim(a.email)) = p.email)
)
UPDATE public.spiritual_sessions ss
SET person_id = m.person_id
FROM map m
WHERE ss.associate_id = m.associate_id AND ss.person_id IS NULL;

WITH map AS (
  SELECT a.id AS associate_id, p.id AS person_id
  FROM public.associates a
  JOIN public.people p
    ON (a.cpf IS NOT NULL AND public.normalize_cpf(a.cpf) = p.cpf)
    OR (a.cpf IS NULL AND a.email IS NOT NULL AND lower(btrim(a.email)) = p.email)
)
UPDATE public.contributions c
SET person_id = m.person_id
FROM map m
WHERE c.associate_id = m.associate_id AND c.person_id IS NULL;

-- Allow associate_id to be NULL going forward (new inserts can use only person_id)
ALTER TABLE public.secretaria_members ALTER COLUMN associate_id DROP NOT NULL;
ALTER TABLE public.contributions      ALTER COLUMN associate_id DROP NOT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_secretaria_members_person_id ON public.secretaria_members(person_id);
CREATE INDEX IF NOT EXISTS idx_spiritual_sessions_person_id ON public.spiritual_sessions(person_id);
CREATE INDEX IF NOT EXISTS idx_contributions_person_id      ON public.contributions(person_id);

-- Unique pair (secretaria, person) when person_id is set
CREATE UNIQUE INDEX IF NOT EXISTS uq_secretaria_members_secretaria_person
  ON public.secretaria_members(secretaria_id, person_id)
  WHERE person_id IS NOT NULL;
