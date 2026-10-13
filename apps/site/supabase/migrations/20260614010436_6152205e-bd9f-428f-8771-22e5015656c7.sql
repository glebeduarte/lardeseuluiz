
-- ============ PDR 2 — Fase 1: Banco de dados ============

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.function_category AS ENUM ('atendimento_espiritual','apoio_operacional','estrutura_organizacional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.module_permission AS ENUM (
    'modulo_macas','modulo_passes','modulo_dialogo','modulo_recepcao',
    'modulo_formacao','modulo_secretaria','modulo_projetos',
    'modulo_gestao','modulo_financeiro','modulo_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assignment_context AS ENUM ('casa','secretaria','projeto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('planejamento','ativo','encerrado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) functions
CREATE TABLE public.functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category public.function_category NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.functions TO authenticated;
GRANT ALL ON public.functions TO service_role;
ALTER TABLE public.functions ENABLE ROW LEVEL SECURITY;

-- 3) function_permissions
CREATE TABLE public.function_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id uuid NOT NULL REFERENCES public.functions(id) ON DELETE CASCADE,
  permission public.module_permission NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (function_id, permission)
);
GRANT SELECT ON public.function_permissions TO authenticated;
GRANT ALL ON public.function_permissions TO service_role;
ALTER TABLE public.function_permissions ENABLE ROW LEVEL SECURITY;

-- 4) projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  coordinator_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  status public.project_status NOT NULL DEFAULT 'planejamento',
  started_at date,
  ended_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 5) Ajuste em secretarias: adicionar coordinator_id e is_active
ALTER TABLE public.secretarias
  ADD COLUMN IF NOT EXISTS coordinator_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 6) worker_assignments
CREATE TABLE public.worker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  function_id uuid NOT NULL REFERENCES public.functions(id) ON DELETE RESTRICT,
  context_type public.assignment_context NOT NULL DEFAULT 'casa',
  context_id uuid,
  started_at date NOT NULL DEFAULT current_date,
  ended_at date,
  assigned_by uuid REFERENCES public.people(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_assignments TO authenticated;
GRANT ALL ON public.worker_assignments TO service_role;
ALTER TABLE public.worker_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_worker_assignments_person ON public.worker_assignments(person_id) WHERE ended_at IS NULL;
CREATE INDEX idx_worker_assignments_function ON public.worker_assignments(function_id);
CREATE INDEX idx_worker_assignments_context ON public.worker_assignments(context_type, context_id);

-- Validação de context_id vs context_type (trigger, não CHECK)
CREATE OR REPLACE FUNCTION public.worker_assignments_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.context_type = 'casa' THEN
    NEW.context_id := NULL;
  ELSIF NEW.context_type = 'secretaria' THEN
    IF NEW.context_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.secretarias WHERE id = NEW.context_id) THEN
      RAISE EXCEPTION 'context_id deve referenciar uma secretaria existente';
    END IF;
  ELSIF NEW.context_type = 'projeto' THEN
    IF NEW.context_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.context_id) THEN
      RAISE EXCEPTION 'context_id deve referenciar um projeto existente';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_worker_assignments_validate
BEFORE INSERT OR UPDATE ON public.worker_assignments
FOR EACH ROW EXECUTE FUNCTION public.worker_assignments_validate();

-- updated_at triggers
CREATE TRIGGER trg_functions_updated_at BEFORE UPDATE ON public.functions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_worker_assignments_updated_at BEFORE UPDATE ON public.worker_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) get_person_permissions
CREATE OR REPLACE FUNCTION public.get_person_permissions(_person_id uuid)
RETURNS SETOF public.module_permission
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT fp.permission
  FROM public.worker_assignments wa
  JOIN public.function_permissions fp ON fp.function_id = wa.function_id
  JOIN public.functions f ON f.id = wa.function_id
  WHERE wa.person_id = _person_id
    AND wa.ended_at IS NULL
    AND f.is_active = true;
$$;

-- Helper baseado em auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_has_permission(_perm public.module_permission)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.people p
    WHERE p.user_id = auth.uid()
      AND _perm IN (SELECT public.get_person_permissions(p.id))
  )
  OR public.has_role(auth.uid(), 'admin');
$$;

-- 8) RLS Policies
-- functions: read auth, write admin
CREATE POLICY "functions_read_auth" ON public.functions FOR SELECT TO authenticated USING (true);
CREATE POLICY "functions_admin_write" ON public.functions FOR ALL TO authenticated
  USING (public.current_user_has_permission('modulo_admin'))
  WITH CHECK (public.current_user_has_permission('modulo_admin'));

CREATE POLICY "fp_read_auth" ON public.function_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "fp_admin_write" ON public.function_permissions FOR ALL TO authenticated
  USING (public.current_user_has_permission('modulo_admin'))
  WITH CHECK (public.current_user_has_permission('modulo_admin'));

-- worker_assignments: gestao/admin
CREATE POLICY "wa_read_gestao" ON public.worker_assignments FOR SELECT TO authenticated
  USING (public.current_user_has_permission('modulo_gestao') OR public.current_user_has_permission('modulo_admin'));
CREATE POLICY "wa_write_gestao" ON public.worker_assignments FOR ALL TO authenticated
  USING (public.current_user_has_permission('modulo_gestao') OR public.current_user_has_permission('modulo_admin'))
  WITH CHECK (public.current_user_has_permission('modulo_gestao') OR public.current_user_has_permission('modulo_admin'));

-- secretarias: read all, write admin (sobrescreve antigas)
DROP POLICY IF EXISTS "Secretarias are viewable by everyone" ON public.secretarias;
DROP POLICY IF EXISTS "Authenticated can view secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Admins can manage secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Admins can insert secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Admins can update secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Admins can delete secretarias" ON public.secretarias;
CREATE POLICY "secretarias_read_auth" ON public.secretarias FOR SELECT TO authenticated USING (true);
CREATE POLICY "secretarias_read_anon" ON public.secretarias FOR SELECT TO anon USING (true);
CREATE POLICY "secretarias_admin_write" ON public.secretarias FOR ALL TO authenticated
  USING (public.current_user_has_permission('modulo_admin'))
  WITH CHECK (public.current_user_has_permission('modulo_admin'));

-- projects: read auth, write gestao/admin
CREATE POLICY "projects_read_auth" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_write_gestao" ON public.projects FOR ALL TO authenticated
  USING (public.current_user_has_permission('modulo_gestao') OR public.current_user_has_permission('modulo_admin'))
  WITH CHECK (public.current_user_has_permission('modulo_gestao') OR public.current_user_has_permission('modulo_admin'));

-- 9) Seed das 10 funções iniciais com permissões
WITH inserted AS (
  INSERT INTO public.functions (name, description, category) VALUES
    ('Voluntário Geral','Presença voluntária sem função específica','apoio_operacional'),
    ('Recepção','Entrada e acolhimento de frequentadores','apoio_operacional'),
    ('Passista','Aplicação de passes','atendimento_espiritual'),
    ('Médium de Maca','Atendimento em maca','atendimento_espiritual'),
    ('Dialogador','Diálogo fraterno','atendimento_espiritual'),
    ('Coordenador de Passe','Coordenação do passe','atendimento_espiritual'),
    ('Membro de Secretaria','Membro de secretaria','estrutura_organizacional'),
    ('Coordenador de Secretaria','Coordena uma secretaria','estrutura_organizacional'),
    ('Membro de Projeto Social','Membro de projeto social','estrutura_organizacional'),
    ('Direção','Direção da casa','estrutura_organizacional')
  RETURNING id, name
)
INSERT INTO public.function_permissions (function_id, permission)
SELECT i.id, p.permission::public.module_permission
FROM inserted i
JOIN (VALUES
  ('Recepção','modulo_recepcao'),
  ('Recepção','modulo_macas'),
  ('Passista','modulo_passes'),
  ('Médium de Maca','modulo_macas'),
  ('Dialogador','modulo_dialogo'),
  ('Coordenador de Passe','modulo_passes'),
  ('Coordenador de Passe','modulo_macas'),
  ('Membro de Secretaria','modulo_secretaria'),
  ('Coordenador de Secretaria','modulo_secretaria'),
  ('Coordenador de Secretaria','modulo_gestao'),
  ('Membro de Projeto Social','modulo_projetos'),
  ('Direção','modulo_gestao'),
  ('Direção','modulo_financeiro')
) AS p(fname, permission) ON p.fname = i.name;

-- 10) Migrar worker_functions -> worker_assignments
-- Mapeia o enum antigo (function) para nomes em functions
INSERT INTO public.worker_assignments (person_id, function_id, context_type, started_at, ended_at, notes)
SELECT
  wf.person_id,
  f.id,
  'casa'::public.assignment_context,
  COALESCE(wf.started_at, current_date),
  wf.ended_at,
  wf.notes
FROM public.worker_functions wf
JOIN public.functions f ON f.name = CASE wf.function::text
  WHEN 'passista' THEN 'Passista'
  WHEN 'medium_maca' THEN 'Médium de Maca'
  WHEN 'dialogador' THEN 'Dialogador'
  WHEN 'recepcao' THEN 'Recepção'
  WHEN 'coordenador_passe' THEN 'Coordenador de Passe'
  WHEN 'coordenador_secretaria' THEN 'Coordenador de Secretaria'
  WHEN 'membro_secretaria' THEN 'Membro de Secretaria'
  WHEN 'direcao' THEN 'Direção'
  WHEN 'voluntario_geral' THEN 'Voluntário Geral'
  ELSE 'Voluntário Geral'
END;

-- 11) Drop worker_functions
DROP TABLE public.worker_functions CASCADE;
