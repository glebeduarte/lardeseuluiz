
-- Marca consulentes criados rapidamente pela recepção, com diálogo a preencher depois
ALTER TABLE public.consulentes
  ADD COLUMN IF NOT EXISTS dialogo_pendente boolean NOT NULL DEFAULT false;

-- Função auxiliar: usuário tem qualquer um dos papéis operacionais
CREATE OR REPLACE FUNCTION public.is_recepcao_or_dialog_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select public.has_role(_user_id, 'recepcao')
      or public.has_role(_user_id, 'dialogador')
      or public.has_role(_user_id, 'admin');
$$;

-- Permitir que recepção também crie consulentes (cadastro rápido)
DROP POLICY IF EXISTS "consulentes write dialog" ON public.consulentes;
CREATE POLICY "consulentes insert operacional"
  ON public.consulentes FOR INSERT
  WITH CHECK (public.is_recepcao_or_dialog_or_admin(auth.uid()));

-- Update de consulentes: somente dialogador/admin (preencher / editar ficha)
-- (política existente "consulentes update dialog" permanece)

-- Permitir que recepção também atribua consulentes a uma maca
DROP POLICY IF EXISTS "designacoes write dialog" ON public.designacoes;
CREATE POLICY "designacoes insert operacional"
  ON public.designacoes FOR INSERT
  WITH CHECK (public.is_recepcao_or_dialog_or_admin(auth.uid()));
