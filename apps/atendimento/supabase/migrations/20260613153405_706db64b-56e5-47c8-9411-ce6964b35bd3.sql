ALTER TABLE public.consulentes
  ADD COLUMN pratica_religiosa boolean NOT NULL DEFAULT false,
  ADD COLUMN pratica_religiosa_descricao text;