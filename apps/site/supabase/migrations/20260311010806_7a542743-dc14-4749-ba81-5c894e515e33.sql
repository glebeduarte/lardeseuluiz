
-- Auto-assign admin role to first registered user
CREATE OR REPLACE FUNCTION public.auto_assign_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only if no admins exist yet
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_first_user_make_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_first_admin();
