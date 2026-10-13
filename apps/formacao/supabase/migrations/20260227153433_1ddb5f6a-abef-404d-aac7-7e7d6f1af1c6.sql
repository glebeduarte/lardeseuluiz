
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: send enrollment approved email on new enrollment
CREATE OR REPLACE FUNCTION public.notify_enrollment_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email TEXT;
  _name TEXT;
  _course_title TEXT;
  _supabase_url TEXT := current_setting('app.settings.supabase_url', true);
  _service_key TEXT := current_setting('app.settings.service_role_key', true);
BEGIN
  -- Only for approved enrollments
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT email, full_name INTO _email, _name
  FROM public.profiles WHERE id = NEW.user_id;

  SELECT title INTO _course_title
  FROM public.courses WHERE id = NEW.course_id;

  IF _email IS NOT NULL AND _course_title IS NOT NULL THEN
    PERFORM extensions.net.http_post(
      url := 'https://ffzchmpezpamxiglpwug.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object(
        'type', 'enrollment_approved',
        'user_email', _email,
        'user_name', _name,
        'course_title', _course_title
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on enrollments table
DROP TRIGGER IF EXISTS on_enrollment_notify ON public.enrollments;
CREATE TRIGGER on_enrollment_notify
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_enrollment_approved();
