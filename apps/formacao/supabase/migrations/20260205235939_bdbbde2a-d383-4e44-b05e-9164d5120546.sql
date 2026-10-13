-- 1. Renomear o curso ESDE para ESDE I
UPDATE courses 
SET title = 'ESDE I', 
    updated_at = now()
WHERE id = '348d7a02-2159-4fee-9aa6-a92cbdc9696f';

-- 2. Criar o curso ESDE II com as mesmas configurações
INSERT INTO courses (
  title, 
  description, 
  thumbnail_url, 
  cover_url, 
  status, 
  category, 
  audience, 
  enrollment_open,
  study_lines
)
VALUES (
  'ESDE II',
  'Estudo sistematizado da doutrina espírita - Parte II',
  'https://ffzchmpezpamxiglpwug.supabase.co/storage/v1/object/public/course-assets/thumbnails/1764762069970-s45hfj.png',
  'https://ffzchmpezpamxiglpwug.supabase.co/storage/v1/object/public/course-assets/covers/1764762079181-rn5evc.png',
  'published',
  'formacoes',
  'ambos',
  true,
  ARRAY['espirita']
);

-- 3. Mover os módulos VI, VII e VIII para o novo curso ESDE II
-- Primeiro precisamos obter o ID do novo curso, então faremos isso em duas partes