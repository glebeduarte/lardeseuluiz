
-- 1) Dia de trabalho da maca
CREATE TYPE public.dia_trabalho AS ENUM ('terca', 'sabado');

ALTER TABLE public.macas
  ADD COLUMN dia public.dia_trabalho NOT NULL DEFAULT 'terca';

-- 2) Atualizar enum de tipo de sessão: sexta -> sabado
ALTER TYPE public.sessao_tipo RENAME VALUE 'sexta' TO 'sabado';
