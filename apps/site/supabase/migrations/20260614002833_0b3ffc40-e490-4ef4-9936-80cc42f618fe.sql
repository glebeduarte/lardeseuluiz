
-- ============================================================
-- FASE 1: Nova estrutura de pessoas (paralela à atual)
-- ============================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.person_role AS ENUM ('trabalhador','frequentador','beneficiario_social','doador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_category AS ENUM ('fundador','efetivo','colaborador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_status AS ENUM ('ativo','inadimplente','afastado','desligado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.worker_function AS ENUM (
    'mediunidade','dialogador','recepcao','coordenacao_passe',
    'evangelizacao','administrativo','outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- HELPER: normalize CPF ----------
CREATE OR REPLACE FUNCTION public.normalize_cpf(v text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN v IS NULL OR btrim(v) = '' THEN NULL
              ELSE regexp_replace(v, '\D', '', 'g') END
$$;

-- ============================================================
-- TABLE: people
-- ============================================================
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  cpf text UNIQUE,
  email text,
  phone text,
  birth_date date,
  address jsonb,
  photo_url text,
  notes text,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "people_select_authenticated" ON public.people
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "people_insert_admin" ON public.people
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "people_update_admin" ON public.people
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "people_delete_admin" ON public.people
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Normalize CPF on insert/update
CREATE OR REPLACE FUNCTION public.people_normalize_cpf()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.cpf := public.normalize_cpf(NEW.cpf);
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_people_normalize
BEFORE INSERT OR UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.people_normalize_cpf();

CREATE TRIGGER trg_people_updated_at
BEFORE UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLE: person_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.person_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role public.person_role NOT NULL,
  started_at date DEFAULT CURRENT_DATE,
  ended_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, role, started_at)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_roles TO authenticated;
GRANT ALL ON public.person_roles TO service_role;

ALTER TABLE public.person_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "person_roles_select_authenticated" ON public.person_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "person_roles_write_admin" ON public.person_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_person_roles_updated_at
BEFORE UPDATE ON public.person_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce CPF when role = trabalhador
CREATE OR REPLACE FUNCTION public.person_roles_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _cpf text;
BEGIN
  IF NEW.role = 'trabalhador' THEN
    SELECT cpf INTO _cpf FROM public.people WHERE id = NEW.person_id;
    IF _cpf IS NULL OR length(_cpf) < 11 THEN
      RAISE EXCEPTION 'CPF é obrigatório para pessoas com papel "trabalhador" (person_id=%)', NEW.person_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_person_roles_validate
BEFORE INSERT OR UPDATE ON public.person_roles
FOR EACH ROW EXECUTE FUNCTION public.person_roles_validate();

-- ============================================================
-- TABLE: associate_memberships
-- ============================================================
CREATE TABLE IF NOT EXISTS public.associate_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  category public.membership_category NOT NULL,
  status public.membership_status NOT NULL DEFAULT 'ativo',
  admission_date date NOT NULL DEFAULT CURRENT_DATE,
  exit_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_one_active
  ON public.associate_memberships(person_id)
  WHERE exit_date IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.associate_memberships TO authenticated;
GRANT ALL ON public.associate_memberships TO service_role;

ALTER TABLE public.associate_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_select_authenticated" ON public.associate_memberships
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "memberships_write_admin" ON public.associate_memberships
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_memberships_updated_at
BEFORE UPDATE ON public.associate_memberships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce CPF on membership
CREATE OR REPLACE FUNCTION public.memberships_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _cpf text;
BEGIN
  SELECT cpf INTO _cpf FROM public.people WHERE id = NEW.person_id;
  IF _cpf IS NULL OR length(_cpf) < 11 THEN
    RAISE EXCEPTION 'CPF é obrigatório para vínculo associativo (person_id=%)', NEW.person_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_memberships_validate
BEFORE INSERT OR UPDATE ON public.associate_memberships
FOR EACH ROW EXECUTE FUNCTION public.memberships_validate();

-- ============================================================
-- TABLE: worker_functions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.worker_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  function public.worker_function NOT NULL,
  started_at date DEFAULT CURRENT_DATE,
  ended_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_functions TO authenticated;
GRANT ALL ON public.worker_functions TO service_role;

ALTER TABLE public.worker_functions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worker_functions_select_authenticated" ON public.worker_functions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "worker_functions_write_admin" ON public.worker_functions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_worker_functions_updated_at
BEFORE UPDATE ON public.worker_functions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TRIGGER: handle_new_user → also populate `people`
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email text := lower(btrim(NEW.email));
  _name  text := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  _person_id uuid;
BEGIN
  -- keep existing profiles behavior
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, _name, NEW.email);

  -- link or create person by email
  SELECT id INTO _person_id
  FROM public.people
  WHERE user_id IS NULL AND email = _email
  LIMIT 1;

  IF _person_id IS NOT NULL THEN
    UPDATE public.people SET user_id = NEW.id WHERE id = _person_id;
  ELSE
    INSERT INTO public.people (full_name, email, user_id)
    VALUES (COALESCE(NULLIF(_name,''),'(sem nome)'), _email, NEW.id);
  END IF;

  RETURN NEW;
END $$;
