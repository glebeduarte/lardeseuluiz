
CREATE UNIQUE INDEX IF NOT EXISTS uq_assembly_attendees_assembly_person
  ON public.assembly_attendees(assembly_id, person_id) WHERE person_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_votes_agenda_person
  ON public.votes(agenda_item_id, person_id) WHERE person_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lgpd_consents_person_type
  ON public.lgpd_consents(person_id, consent_type) WHERE person_id IS NOT NULL;

-- secretaria_actions.published_by currently FK to associates(id). To allow assigning a person,
-- we drop the FK and rely on application logic (the field is informational; no cascading needed).
ALTER TABLE public.secretaria_actions DROP CONSTRAINT IF EXISTS secretaria_actions_published_by_fkey;
