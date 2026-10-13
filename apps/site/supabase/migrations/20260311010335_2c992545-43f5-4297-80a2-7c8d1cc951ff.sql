
-- Expenses table (saídas financeiras)
CREATE TYPE public.expense_category AS ENUM ('manutencao', 'material', 'evento', 'projeto_social', 'administrativo', 'outros');

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category expense_category NOT NULL DEFAULT 'outros',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at TIMESTAMPTZ,
  vendor TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents table (atas, balancetes, regulamentos)
CREATE TYPE public.document_type AS ENUM ('ata', 'balancete', 'regulamento', 'estatuto', 'relatorio', 'outro');

CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  doc_type document_type NOT NULL DEFAULT 'outro',
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT false,
  reference_date DATE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public docs visible to all" ON public.documents FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "Authenticated can view all docs" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage docs" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can update docs" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'diretor'));
CREATE POLICY "Admins can delete docs" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

CREATE POLICY "Authenticated can upload docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Anyone can view docs" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Admins can delete docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
