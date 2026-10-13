-- 1. Novo valor de enum
ALTER TYPE public.presenca_status ADD VALUE IF NOT EXISTS 'falta_justificada';

-- 2. Função que inativa designação após 2 faltas consecutivas
CREATE OR REPLACE FUNCTION public.fn_inativa_por_faltas_consecutivas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last2 text[];
BEGIN
  SELECT ARRAY(
    SELECT p.status::text
    FROM public.presencas p
    JOIN public.sessoes s ON s.id = p.sessao_id
    WHERE p.designacao_id = NEW.designacao_id
    ORDER BY s.data DESC, p.created_at DESC
    LIMIT 2
  ) INTO v_last2;

  IF array_length(v_last2, 1) = 2
     AND v_last2[1] = 'ausente'
     AND v_last2[2] = 'ausente' THEN
    UPDATE public.designacoes
       SET status = 'cancelada'::designacao_status,
           closed_at = COALESCE(closed_at, now())
     WHERE id = NEW.designacao_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inativa_por_faltas_consecutivas ON public.presencas;
CREATE TRIGGER trg_inativa_por_faltas_consecutivas
AFTER INSERT OR UPDATE ON public.presencas
FOR EACH ROW
EXECUTE FUNCTION public.fn_inativa_por_faltas_consecutivas();

-- 3. Função: médium possui designação ativa do consulente
CREATE OR REPLACE FUNCTION public.is_medium_of_consulente_ativa(_user_id uuid, _consulente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.designacoes d
    JOIN public.maca_mediuns mm ON mm.maca_id = d.maca_id
    WHERE d.consulente_id = _consulente_id
      AND d.status = 'ativa'
      AND mm.user_id = _user_id
  );
$$;

-- 4. Atualiza policy de update do consulente
DROP POLICY IF EXISTS "consulentes update dialog" ON public.consulentes;
CREATE POLICY "consulentes update"
ON public.consulentes
FOR UPDATE
USING (
  public.is_dialogador_or_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'medium'::app_role)
    AND public.is_medium_of_consulente_ativa(auth.uid(), id)
  )
);