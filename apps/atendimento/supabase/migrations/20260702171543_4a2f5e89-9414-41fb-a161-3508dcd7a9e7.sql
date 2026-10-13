CREATE POLICY "roles dialogadores view dialog roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  role IN ('dialogador','admin')
  AND (public.has_role(auth.uid(),'dialogador') OR public.has_role(auth.uid(),'admin'))
);