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
BEGIN
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT email, full_name INTO _email, _name
  FROM public.profiles WHERE id = NEW.user_id;

  SELECT title INTO _course_title
  FROM public.courses WHERE id = NEW.course_id;

  IF _email IS NOT NULL AND _course_title IS NOT NULL THEN
    PERFORM extensions.http((
      'POST',
      'https://ffzchmpezpamxiglpwug.supabase.co/functions/v1/send-notification',
      ARRAY[extensions.http_header('Content-Type', 'application/json')],
      'application/json',
      jsonb_build_object(
        'type', 'enrollment_approved',
        'user_email', _email,
        'user_name', _name,
        'course_title', _course_title
      )::text
    )::extensions.http_request);
  END IF;

  RETURN NEW;
END;
$function$;