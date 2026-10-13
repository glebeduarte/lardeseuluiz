-- Add columns to track user activity and reminder status
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS inactivity_reminder_sent_at timestamp with time zone;

-- Create a trigger to update last_activity_at when lesson_progress is inserted/updated
CREATE OR REPLACE FUNCTION public.update_user_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET last_activity_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lesson_progress_update_activity
  AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_last_activity();