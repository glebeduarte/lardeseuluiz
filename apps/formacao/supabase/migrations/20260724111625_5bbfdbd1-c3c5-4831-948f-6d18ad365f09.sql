
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_roles.user_id = is_admin.user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_email_remaining()
RETURNS integer
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(100 - (SELECT sent_count FROM email_daily_usage WHERE usage_date = CURRENT_DATE), 100);
$$;
