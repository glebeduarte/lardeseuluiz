
ALTER TABLE public.consulentes
  ADD COLUMN IF NOT EXISTS motivo_saude_fisica_diagnostico boolean,
  ADD COLUMN IF NOT EXISTS motivo_saude_fisica_diagnostico_obs text,
  ADD COLUMN IF NOT EXISTS motivo_saude_fisica_tratamento boolean,
  ADD COLUMN IF NOT EXISTS motivo_saude_fisica_tratamento_obs text,
  ADD COLUMN IF NOT EXISTS motivo_saude_mental_diagnostico boolean,
  ADD COLUMN IF NOT EXISTS motivo_saude_mental_diagnostico_obs text,
  ADD COLUMN IF NOT EXISTS motivo_saude_mental_tratamento boolean,
  ADD COLUMN IF NOT EXISTS motivo_saude_mental_tratamento_obs text;
