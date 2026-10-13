-- 1) Sessões só podem existir em terça ou sábado; tipo derivado da data real
CREATE OR REPLACE FUNCTION public.fn_valida_sessao_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dow int;
BEGIN
  v_dow := extract(dow from NEW.data);
  IF v_dow NOT IN (2, 6) THEN
    RAISE EXCEPTION 'Atendimentos só podem ser registrados em terças-feiras ou sábados (data informada: %)', to_char(NEW.data, 'DD/MM/YYYY');
  END IF;
  NEW.tipo := CASE WHEN v_dow = 6 THEN 'sabado'::sessao_tipo ELSE 'terca'::sessao_tipo END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_valida_sessao_data ON public.sessoes;
CREATE TRIGGER trg_valida_sessao_data
BEFORE INSERT OR UPDATE OF data, tipo ON public.sessoes
FOR EACH ROW EXECUTE FUNCTION public.fn_valida_sessao_data();

-- 2) Bloqueio de lotação máxima da maca
CREATE OR REPLACE FUNCTION public.fn_valida_lotacao_maca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int;
  v_atual int;
  v_nome text;
  v_numero int;
BEGIN
  IF NEW.status <> 'ativa'::designacao_status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'ativa'::designacao_status AND OLD.maca_id = NEW.maca_id THEN
    RETURN NEW;
  END IF;

  SELECT lotacao_max, nome, numero INTO v_max, v_nome, v_numero
    FROM public.macas WHERE id = NEW.maca_id;

  SELECT count(*) INTO v_atual
    FROM public.designacoes
    WHERE maca_id = NEW.maca_id
      AND status = 'ativa'::designacao_status
      AND id <> NEW.id;

  IF v_atual >= coalesce(v_max, 10) THEN
    RAISE EXCEPTION 'A maca % (%) já atingiu a lotação máxima de % consulentes.', v_numero, v_nome, coalesce(v_max, 10);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_valida_lotacao_maca ON public.designacoes;
CREATE TRIGGER trg_valida_lotacao_maca
BEFORE INSERT OR UPDATE OF maca_id, status ON public.designacoes
FOR EACH ROW EXECUTE FUNCTION public.fn_valida_lotacao_maca();

-- 3) Data do diálogo (permite registro retroativo)
ALTER TABLE public.consulentes ADD COLUMN IF NOT EXISTS data_dialogo date;
UPDATE public.consulentes SET data_dialogo = created_at::date WHERE data_dialogo IS NULL;