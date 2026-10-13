-- Fechar inscrições do ESDE II
UPDATE courses 
SET enrollment_open = false,
    updated_at = now()
WHERE id = 'eae5c3e3-16f2-42ef-b595-6665b055a04a';