
-- Drop the restrictive user insert policy that blocks admin assignments
DROP POLICY "Users can request enrollment" ON public.enrollments;

-- Recreate it allowing admins too
CREATE POLICY "Users can request enrollment"
ON public.enrollments
FOR INSERT
WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));
