
ALTER TABLE public.assembly_attendees ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE CASCADE;
ALTER TABLE public.votes              ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE CASCADE;
ALTER TABLE public.lgpd_consents      ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE CASCADE;
ALTER TABLE public.data_requests      ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;

-- Backfill helper CTE pattern
WITH map AS (
  SELECT a.id AS associate_id, p.id AS person_id
  FROM public.associates a
  JOIN public.people p
    ON (a.cpf IS NOT NULL AND public.normalize_cpf(a.cpf) = p.cpf)
    OR (a.cpf IS NULL AND a.email IS NOT NULL AND lower(btrim(a.email)) = p.email)
)
UPDATE public.assembly_attendees t SET person_id = m.person_id FROM map m WHERE t.associate_id = m.associate_id AND t.person_id IS NULL;

WITH map AS (
  SELECT a.id AS associate_id, p.id AS person_id
  FROM public.associates a
  JOIN public.people p
    ON (a.cpf IS NOT NULL AND public.normalize_cpf(a.cpf) = p.cpf)
    OR (a.cpf IS NULL AND a.email IS NOT NULL AND lower(btrim(a.email)) = p.email)
)
UPDATE public.votes t SET person_id = m.person_id FROM map m WHERE t.associate_id = m.associate_id AND t.person_id IS NULL;

WITH map AS (
  SELECT a.id AS associate_id, p.id AS person_id
  FROM public.associates a
  JOIN public.people p
    ON (a.cpf IS NOT NULL AND public.normalize_cpf(a.cpf) = p.cpf)
    OR (a.cpf IS NULL AND a.email IS NOT NULL AND lower(btrim(a.email)) = p.email)
)
UPDATE public.lgpd_consents t SET person_id = m.person_id FROM map m WHERE t.associate_id = m.associate_id AND t.person_id IS NULL;

WITH map AS (
  SELECT a.id AS associate_id, p.id AS person_id
  FROM public.associates a
  JOIN public.people p
    ON (a.cpf IS NOT NULL AND public.normalize_cpf(a.cpf) = p.cpf)
    OR (a.cpf IS NULL AND a.email IS NOT NULL AND lower(btrim(a.email)) = p.email)
)
UPDATE public.data_requests t SET person_id = m.person_id FROM map m WHERE t.associate_id = m.associate_id AND t.person_id IS NULL;

-- Allow associate_id NULL going forward
ALTER TABLE public.assembly_attendees ALTER COLUMN associate_id DROP NOT NULL;
ALTER TABLE public.votes              ALTER COLUMN associate_id DROP NOT NULL;
ALTER TABLE public.lgpd_consents      ALTER COLUMN associate_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assembly_attendees_person_id ON public.assembly_attendees(person_id);
CREATE INDEX IF NOT EXISTS idx_votes_person_id              ON public.votes(person_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_consents_person_id      ON public.lgpd_consents(person_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_person_id      ON public.data_requests(person_id);
