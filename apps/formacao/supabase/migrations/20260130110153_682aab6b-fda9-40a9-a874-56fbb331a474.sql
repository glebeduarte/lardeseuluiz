-- Enable realtime for enrollments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;

-- Enable realtime for profiles table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;