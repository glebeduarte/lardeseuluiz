
-- Drop the storage policy that depends on has_role (will recreate)
DROP POLICY IF EXISTS "Admins can delete docs" ON storage.objects;

-- Drop policies that depend on has_role
DROP POLICY IF EXISTS "Admins can delete agenda" ON public.agenda_items;
DROP POLICY IF EXISTS "Admins can manage agenda" ON public.agenda_items;
DROP POLICY IF EXISTS "Admins can update agenda" ON public.agenda_items;
DROP POLICY IF EXISTS "Admins can create assemblies" ON public.assemblies;
DROP POLICY IF EXISTS "Admins can delete assemblies" ON public.assemblies;
DROP POLICY IF EXISTS "Admins can update assemblies" ON public.assemblies;
DROP POLICY IF EXISTS "Admins can delete attendees" ON public.assembly_attendees;
DROP POLICY IF EXISTS "Admins can manage attendees" ON public.assembly_attendees;
DROP POLICY IF EXISTS "memberships_write_admin" ON public.associate_memberships;
DROP POLICY IF EXISTS "Admins can delete associates" ON public.associates;
DROP POLICY IF EXISTS "Admins can insert associates" ON public.associates;
DROP POLICY IF EXISTS "Admins can update associates" ON public.associates;
DROP POLICY IF EXISTS "Admins can view contacts" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can manage contributions" ON public.contributions;
DROP POLICY IF EXISTS "Admins can manage data requests" ON public.data_requests;
DROP POLICY IF EXISTS "Admins can delete docs" ON public.documents;
DROP POLICY IF EXISTS "Admins can manage docs" ON public.documents;
DROP POLICY IF EXISTS "Admins can update docs" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can manage consents" ON public.lgpd_consents;
DROP POLICY IF EXISTS "people_delete_admin" ON public.people;
DROP POLICY IF EXISTS "people_insert_admin" ON public.people;
DROP POLICY IF EXISTS "people_update_admin" ON public.people;
DROP POLICY IF EXISTS "person_roles_write_admin" ON public.person_roles;
DROP POLICY IF EXISTS "Admins and coordinators can insert actions" ON public.secretaria_actions;
DROP POLICY IF EXISTS "Admins and coordinators can update actions" ON public.secretaria_actions;
DROP POLICY IF EXISTS "Admins can delete actions" ON public.secretaria_actions;
DROP POLICY IF EXISTS "Admins and coordinators can manage members" ON public.secretaria_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.secretaria_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.secretaria_members;
DROP POLICY IF EXISTS "Admins can delete responsibilities" ON public.secretaria_responsibilities;
DROP POLICY IF EXISTS "Admins can manage responsibilities" ON public.secretaria_responsibilities;
DROP POLICY IF EXISTS "Admins can update responsibilities" ON public.secretaria_responsibilities;
DROP POLICY IF EXISTS "Admins can delete secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Admins can manage secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Admins can update secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Admins can delete events" ON public.site_events;
DROP POLICY IF EXISTS "Admins can insert events" ON public.site_events;
DROP POLICY IF EXISTS "Admins can update events" ON public.site_events;
DROP POLICY IF EXISTS "Admins can manage spiritual sessions" ON public.spiritual_sessions;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view volunteers" ON public.volunteer_submissions;
DROP POLICY IF EXISTS "worker_functions_write_admin" ON public.worker_functions;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.auto_assign_first_admin() CASCADE;

ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('admin','gestor','trabalhador','aluno');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING (
    CASE role::text
      WHEN 'admin' THEN 'admin'
      WHEN 'diretor' THEN 'gestor'
      WHEN 'secretario' THEN 'gestor'
      WHEN 'associado' THEN 'trabalhador'
      ELSE 'trabalhador'
    END::public.app_role
  );

DROP TYPE public.app_role_old;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_first_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_first_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_first_admin();

-- Recreate policies
CREATE POLICY "Admins can delete agenda" ON public.agenda_items FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can manage agenda" ON public.agenda_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can update agenda" ON public.agenda_items FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can create assemblies" ON public.assemblies FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can delete assemblies" ON public.assemblies FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update assemblies" ON public.assemblies FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can delete attendees" ON public.assembly_attendees FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can manage attendees" ON public.assembly_attendees FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "memberships_write_admin" ON public.associate_memberships FOR ALL TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor')) WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can delete associates" ON public.associates FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert associates" ON public.associates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can update associates" ON public.associates FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can view contacts" ON public.contact_submissions FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can manage contributions" ON public.contributions FOR ALL TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can manage data requests" ON public.data_requests FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can delete docs" ON public.documents FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can manage docs" ON public.documents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can update docs" ON public.documents FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can manage consents" ON public.lgpd_consents FOR ALL TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor')) WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "people_delete_admin" ON public.people FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "people_insert_admin" ON public.people FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "people_update_admin" ON public.people FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "person_roles_write_admin" ON public.person_roles FOR ALL TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor')) WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins and coordinators can insert actions" ON public.secretaria_actions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins and coordinators can update actions" ON public.secretaria_actions FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can delete actions" ON public.secretaria_actions FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins and coordinators can manage members" ON public.secretaria_members FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can delete members" ON public.secretaria_members FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can update members" ON public.secretaria_members FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can delete responsibilities" ON public.secretaria_responsibilities FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can manage responsibilities" ON public.secretaria_responsibilities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can update responsibilities" ON public.secretaria_responsibilities FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can delete secretarias" ON public.secretarias FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can manage secretarias" ON public.secretarias FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can update secretarias" ON public.secretarias FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can delete events" ON public.site_events FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert events" ON public.site_events FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Admins can update events" ON public.site_events FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can manage spiritual sessions" ON public.spiritual_sessions FOR ALL TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor')) WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can view volunteers" ON public.volunteer_submissions FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "worker_functions_write_admin" ON public.worker_functions FOR ALL TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor')) WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

-- Recreate storage.objects policy for documents bucket
CREATE POLICY "Admins can delete docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND has_role(auth.uid(),'admin'));
