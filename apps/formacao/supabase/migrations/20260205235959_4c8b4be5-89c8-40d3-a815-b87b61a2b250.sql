-- Mover os módulos VI, VII e VIII para o curso ESDE II
-- Reencarnação (order_index 6) -> order_index 0
-- Pluralidade dos Mundos Habitados (order_index 7) -> order_index 1
-- Movimento Espírita e Unificação (order_index 8) -> order_index 2

UPDATE modules 
SET course_id = 'eae5c3e3-16f2-42ef-b595-6665b055a04a',
    order_index = 0,
    updated_at = now()
WHERE id = '5ba8bf77-f7d8-4163-8075-a066d387f2b8'; -- Reencarnação

UPDATE modules 
SET course_id = 'eae5c3e3-16f2-42ef-b595-6665b055a04a',
    order_index = 1,
    updated_at = now()
WHERE id = 'badd3197-2eb6-4718-87d2-c4ce9c05efea'; -- Pluralidade dos Mundos Habitados

UPDATE modules 
SET course_id = 'eae5c3e3-16f2-42ef-b595-6665b055a04a',
    order_index = 2,
    updated_at = now()
WHERE id = 'f9fce10d-487d-4ad1-916d-718a11d204aa'; -- Movimento Espírita e Unificação