-- Create notifications table for persistent admin notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'enrollment', 'user_registration'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_id UUID, -- user_id or enrollment_id depending on type
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage notifications
CREATE POLICY "Admins can view notifications" 
ON public.notifications 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update notifications" 
ON public.notifications 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create function to automatically create notification on new profile
CREATE OR REPLACE FUNCTION public.create_user_registration_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for student registrations
  IF NEW.role = 'student' THEN
    INSERT INTO public.notifications (type, title, description, related_id)
    VALUES (
      'user_registration',
      'Novo Usuário Cadastrado',
      COALESCE(NEW.full_name, NEW.email) || ' se cadastrou na plataforma',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registrations
CREATE TRIGGER on_new_user_registration
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_registration_notification();

-- Create function to automatically create notification on new enrollment
CREATE OR REPLACE FUNCTION public.create_enrollment_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  course_title TEXT;
BEGIN
  -- Only create notification for pending enrollments
  IF NEW.status = 'pending' THEN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
    SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;
    
    INSERT INTO public.notifications (type, title, description, related_id)
    VALUES (
      'enrollment',
      'Nova Solicitação de Inscrição',
      COALESCE(user_name, 'Usuário') || ' solicitou inscrição no curso "' || COALESCE(course_title, 'Curso') || '"',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new enrollments
CREATE TRIGGER on_new_enrollment
AFTER INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.create_enrollment_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;