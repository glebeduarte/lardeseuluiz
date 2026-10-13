
-- Enums
CREATE TYPE public.associate_category AS ENUM ('fundador', 'efetivo', 'colaborador', 'frequentador');
CREATE TYPE public.associate_status AS ENUM ('ativo', 'inadimplente', 'afastado', 'desligado');
CREATE TYPE public.app_role AS ENUM ('admin', 'diretor', 'secretario', 'associado');

-- Profiles (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles (separate table per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Associates
CREATE TABLE public.associates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  cpf TEXT UNIQUE,
  phone TEXT,
  birth_date DATE,
  category associate_category NOT NULL DEFAULT 'frequentador',
  status associate_status NOT NULL DEFAULT 'ativo',
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view associates" ON public.associates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert associates" ON public.associates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can update associates" ON public.associates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete associates" ON public.associates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Contributions (mensalidades / doações)
CREATE TABLE public.contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reference_month TEXT NOT NULL, -- 'YYYY-MM'
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contributions" ON public.contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage contributions" ON public.contributions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));

-- Contact form submissions (public insert, admin read)
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact" ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view contacts" ON public.contact_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));

-- Volunteer interest submissions (public insert)
CREATE TABLE public.volunteer_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  interest_area TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.volunteer_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit volunteer interest" ON public.volunteer_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view volunteers" ON public.volunteer_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_associates_updated_at BEFORE UPDATE ON public.associates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
