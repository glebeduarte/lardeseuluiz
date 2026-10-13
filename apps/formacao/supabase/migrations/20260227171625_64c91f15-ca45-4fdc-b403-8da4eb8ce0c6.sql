CREATE OR REPLACE FUNCTION public.notify_enrollment_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notification via http disabled (extension not available)
  RETURN NEW;
END;
$function$;