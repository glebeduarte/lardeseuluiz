
-- Enum for session type
CREATE TYPE public.session_type AS ENUM ('passe', 'orientacao', 'desobsessao', 'estudo', 'outro');

-- Enum for session status
CREATE TYPE public.session_status AS ENUM ('agendada', 'realizada', 'cancelada');

-- Spiritual assistance sessions
CREATE TABLE public.spiritual_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associate_id UUID REFERENCES public.associates(id) ON DELETE SET NULL,
  session_type public.session_type NOT NULL DEFAULT 'passe',
  session_status public.session_status NOT NULL DEFAULT 'agendada',
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  attendant_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  anonymous_name TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spiritual_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: admins/directors can manage, authenticated can view
CREATE POLICY "Admins can manage spiritual sessions" ON public.spiritual_sessions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));

CREATE POLICY "Authenticated can view spiritual sessions" ON public.spiritual_sessions
  FOR SELECT TO authenticated
  USING (true);

-- LGPD consent types
CREATE TYPE public.consent_type AS ENUM ('dados_pessoais', 'comunicacao', 'imagem', 'dados_saude', 'cookies');

-- LGPD consent status
CREATE TYPE public.consent_status AS ENUM ('concedido', 'revogado', 'pendente');

-- LGPD consent tracking
CREATE TABLE public.lgpd_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associate_id UUID REFERENCES public.associates(id) ON DELETE CASCADE NOT NULL,
  consent_type public.consent_type NOT NULL,
  consent_status public.consent_status NOT NULL DEFAULT 'pendente',
  consent_date TIMESTAMP WITH TIME ZONE,
  revocation_date TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(associate_id, consent_type)
);

ALTER TABLE public.lgpd_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage consents" ON public.lgpd_consents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'diretor'));

CREATE POLICY "Authenticated can view consents" ON public.lgpd_consents
  FOR SELECT TO authenticated
  USING (true);

-- Data subject requests (DSAR)
CREATE TYPE public.dsar_type AS ENUM ('acesso', 'retificacao', 'exclusao', 'portabilidade', 'oposicao');
CREATE TYPE public.dsar_status AS ENUM ('aberta', 'em_analise', 'concluida', 'recusada');

CREATE TABLE public.data_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associate_id UUID REFERENCES public.associates(id) ON DELETE SET NULL,
  request_type public.dsar_type NOT NULL,
  request_status public.dsar_status NOT NULL DEFAULT 'aberta',
  description TEXT,
  response_text TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage data requests" ON public.data_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view data requests" ON public.data_requests
  FOR SELECT TO authenticated
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_spiritual_sessions_updated_at BEFORE UPDATE ON public.spiritual_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lgpd_consents_updated_at BEFORE UPDATE ON public.lgpd_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_requests_updated_at BEFORE UPDATE ON public.data_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
