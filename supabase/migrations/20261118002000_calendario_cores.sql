-- Cores bem distintas entre as categorias do calendário de trabalhos (feriado segue em cinza claro).
update governanca.cal_categorias c set cor = v.cor from (values
  ('inicio-termino','#1e3a8a'),      -- azul-marinho
  ('dia-trabalho','#facc15'),        -- amarelo
  ('atendimento','#ec4899'),         -- rosa
  ('reuniao-voluntarios','#f97316'), -- laranja
  ('reuniao-admin','#7c3aed'),       -- roxo
  ('curso','#16a34a'),               -- verde
  ('curso-mediunico','#92400e'),     -- marrom
  ('inicio-esde','#06b6d4'),         -- ciano
  ('inicio-mediunica','#dc2626'),    -- vermelho
  ('eventos','#84cc16'),             -- verde-limão
  ('cafe-amor','#111827'),           -- preto
  ('aniversario','#d4a373')          -- bege
) as v(slug, cor) where c.slug = v.slug;
