
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change account activation';
  END IF;
  IF NEW.user_type IS DISTINCT FROM OLD.user_type AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change user type';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_change_trg ON public.profiles;
CREATE TRIGGER prevent_profile_role_change_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

DROP POLICY IF EXISTS "Service role can manage email usage" ON public.email_daily_usage;
CREATE POLICY "Service role can manage email usage" ON public.email_daily_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage email queue" ON public.email_queue;
CREATE POLICY "Service role can manage email queue" ON public.email_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;
CREATE POLICY "Service role can insert email logs" ON public.email_logs
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update email logs" ON public.email_logs;
CREATE POLICY "Service role can update email logs" ON public.email_logs
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view lesson attachments" ON storage.objects;
CREATE POLICY "Enrolled users can view lesson attachments" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'lesson-attachments' AND (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.attachments a
      JOIN public.lessons l ON l.id = a.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.enrollments e ON e.course_id = m.course_id
      WHERE position(storage.objects.name in a.url) > 0
        AND e.user_id = auth.uid()
        AND e.status = 'approved'
    )
  )
);

DROP POLICY IF EXISTS "Anyone can view course assets" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_enrollment_approved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_last_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_user_registration_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_enrollment_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_class_group_capacity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_daily_email_usage(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_daily_email_remaining() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_change() FROM PUBLIC, anon, authenticated;
