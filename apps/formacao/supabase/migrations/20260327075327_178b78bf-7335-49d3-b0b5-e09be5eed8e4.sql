
-- Lesson 12: Fígado, vesícula e bile
UPDATE lessons SET description = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(description,
                    '<p class="kicker">Módulo 3 · Aula 12</p>',
                    '<div class="section-kicker">MÓDULO 3 · AULA 12</div>' || chr(10) || '<div class="section-title">Fígado, vesícula e bile.</div>'
                  ),
                  '<p class="lesson-subtitle">O que hepatite, gordura no fígado, cálculos biliares, icterícia e distúrbios hepáticos revelam sobre raiva acumulada, injustiça não digerida e agressividade petrificada</p>',
                  '<div class="section-subtitle">O QUE HEPATITE, GORDURA NO FÍGADO, CÁLCULOS BILIARES, ICTERÍCIA E DISTÚRBIOS HEPÁTICOS REVELAM SOBRE RAIVA ACUMULADA, INJUSTIÇA NÃO DIGERIDA E AGRESSIVIDADE PETRIFICADA</div>'
                ),
                '<span class="badge-time">⏱ Tempo estimado: 40 minutos</span>',
                '<span class="badge-time">40 minutos</span>'
              ),
              '<hr class="divider" />',
              '<hr>'
            ),
            '<h2 class="section-title">',
            '<h2>'
          ),
          '<div class="card-accent">',
          '<div class="callout concept">'
        ),
        '<div class="callout-tip">',
        '<div class="callout tip">'
      ),
      '<div class="affirmation-block">' || chr(10),
      '<div class="callout affirmation"><strong>✨ Afirmação da Aula</strong><br/>' || chr(10)
    ),
    '<div class="callout-warning">',
    '<div class="callout warning">'
  )
WHERE id = '58c21449-dc1a-4640-870e-c59ecb751fdd';

-- Lesson 13: Rins e sistema urinário
UPDATE lessons SET description = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(description,
                    '<p class="kicker">Módulo 3 · Aula 13</p>',
                    '<div class="section-kicker">MÓDULO 3 · AULA 13</div>' || chr(10) || '<div class="section-title">Rins e sistema urinário.</div>'
                  ),
                  '<p class="lesson-subtitle">O que infecções urinárias, cálculos renais, nefrite, bexiga hiperativa e enurese revelam sobre relacionamento, território e o que não conseguimos soltar</p>',
                  '<div class="section-subtitle">O QUE INFECÇÕES URINÁRIAS, CÁLCULOS RENAIS, NEFRITE, BEXIGA HIPERATIVA E ENURESE REVELAM SOBRE RELACIONAMENTO, TERRITÓRIO E O QUE NÃO CONSEGUIMOS SOLTAR</div>'
                ),
                '<span class="badge-time">⏱ Tempo estimado: 40 minutos</span>',
                '<span class="badge-time">40 minutos</span>'
              ),
              '<hr class="divider" />',
              '<hr>'
            ),
            '<h2 class="section-title">',
            '<h2>'
          ),
          '<div class="card-accent">',
          '<div class="callout concept">'
        ),
        '<div class="callout-tip">',
        '<div class="callout tip">'
      ),
      '<div class="affirmation-block">' || chr(10),
      '<div class="callout affirmation"><strong>✨ Afirmação da Aula</strong><br/>' || chr(10)
    ),
    '<div class="callout-warning">',
    '<div class="callout warning">'
  )
WHERE id = 'acaa389e-a06d-47fa-abb9-88e915f407e0';

-- Lesson 14: Coluna vertebral
UPDATE lessons SET description = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(description,
          '<p class="kicker">Módulo 3 · Aula 14</p>' || chr(10) || '<h1>Coluna vertebral — visão integrada</h1>',
          '<div class="section-kicker">MÓDULO 3 · AULA 14</div>' || chr(10) || '<div class="section-title">Coluna vertebral — visão integrada.</div>'
        ),
        '<p class="subtitle">O que cervicalgia, dores torácicas, lombalgia, hérnia de disco, ciática e problemas no cóccix revelam sobre como sustentamos o peso da vida</p>',
        '<div class="section-subtitle">O QUE CERVICALGIA, DORES TORÁCICAS, LOMBALGIA, HÉRNIA DE DISCO, CIÁTICA E PROBLEMAS NO CÓCCIX REVELAM SOBRE COMO SUSTENTAMOS O PESO DA VIDA</div>'
      ),
      '<span class="badge-time">⏱ Tempo estimado: 45 minutos</span>',
      '<span class="badge-time">45 minutos</span>'
    ),
    '<hr class="divider" />',
    '<hr>'
  )
WHERE id = 'ef9bba87-3e2e-4c48-b64b-6818f17facb6';

-- Lesson 15: Joelhos, quadril e articulações
UPDATE lessons SET description = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(description,
          '<p class="kicker">Módulo 3 · Aula 15</p>' || chr(10) || '<h1>Joelhos, quadril e articulações</h1>',
          '<div class="section-kicker">MÓDULO 3 · AULA 15</div>' || chr(10) || '<div class="section-title">Joelhos, quadril e articulações.</div>'
        ),
        '<p class="subtitle">O que artrite, artrose, reumatismo, problemas no joelho e no quadril revelam sobre orgulho, rigidez, agressividade represada e o medo de dobrar</p>',
        '<div class="section-subtitle">O QUE ARTRITE, ARTROSE, REUMATISMO, PROBLEMAS NO JOELHO E NO QUADRIL REVELAM SOBRE ORGULHO, RIGIDEZ, AGRESSIVIDADE REPRESADA E O MEDO DE DOBRAR</div>'
      ),
      '<span class="badge-time">⏱ Tempo estimado: 42 minutos</span>',
      '<span class="badge-time">42 minutos</span>'
    ),
    '<hr class="divider" />',
    '<hr>'
  )
WHERE id = 'df52c5de-cf4c-4f8e-828e-4bc71d01c224';
