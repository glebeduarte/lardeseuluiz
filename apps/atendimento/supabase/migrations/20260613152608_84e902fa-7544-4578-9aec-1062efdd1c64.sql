
ALTER TABLE public.consulentes
  ADD COLUMN IF NOT EXISTS motivo_saude_fisica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_saude_fisica_especificacao text,
  ADD COLUMN IF NOT EXISTS motivo_saude_mental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_saude_mental_especificacao text,
  ADD COLUMN IF NOT EXISTS motivo_saude_espiritual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_saude_espiritual_especificacao text;

-- Migra dados antigos de "Saúde" para "Saúde Física"
UPDATE public.consulentes
SET motivo_saude_fisica = true,
    motivo_saude_fisica_especificacao = COALESCE(motivo_saude_fisica_especificacao, motivo_saude_especificacao)
WHERE motivo_saude = true;

ALTER TABLE public.consulentes
  DROP COLUMN IF EXISTS motivo_saude,
  DROP COLUMN IF EXISTS motivo_saude_especificacao,
  DROP COLUMN IF EXISTS motivo_mediunidade,
  DROP COLUMN IF EXISTS motivo_obsessao,
  DROP COLUMN IF EXISTS motivo_depressao;
