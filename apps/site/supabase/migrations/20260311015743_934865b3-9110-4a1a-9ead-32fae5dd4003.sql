
-- Update secretaria names and descriptions from the Guia do Voluntariado

UPDATE public.secretarias SET name = 'Diretoria Geral', description = 'Coordenação executiva e estratégica da casa. Guardiã do propósito do Lar, zelando pela unidade das secretarias e garantindo que todas as atividades ocorram de forma harmoniosa.' WHERE id = 'ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f';

UPDATE public.secretarias SET description = 'Primeiro abraço espiritual de quem chega ao Lar. Cria um ambiente de segurança, respeito e calor humano, onde cada pessoa se sinta vista, acolhida e amada.' WHERE id = 'f2974012-f443-4de0-b010-ee7707a1fcdd';

UPDATE public.secretarias SET name = 'Cultura e Artes', icon = '🎨', description = 'Traduz por meio da beleza, da música e da sensibilidade aquilo que a alma ainda não consegue dizer em palavras. Eleva o ambiente, toca corações e abre espaço para reflexões profundas.' WHERE id = '4385da8d-bb69-4dbd-a6e7-7cd4a30d932c';

UPDATE public.secretarias SET description = 'Pilar doutrinário e educativo do Lar. Cria caminhos para que todos compreendam a Doutrina Espírita com profundidade, se fortaleçam espiritualmente e sirvam com mais consciência.' WHERE id = '0f04f632-3582-4f0b-83d1-ccb39ca34591';

UPDATE public.secretarias SET name = 'Social', icon = '🥳', description = 'Braço da caridade visível e do afeto coletivo. Organiza ações que aproximam corações, amparam vidas e despertam o senso de fraternidade.' WHERE id = '2fe0278b-f995-4860-b2f5-b9c9826b50cc';

UPDATE public.secretarias SET description = 'Guardiã dos trabalhos espirituais mais sutis e profundos da casa. Coordena com responsabilidade e zelo as atividades que envolvem o intercâmbio com o mundo espiritual.' WHERE id = '33f8f79c-f207-42e8-b7c0-649f792be5c8';

UPDATE public.secretarias SET description = 'Força silenciosa que garante que o ambiente do Lar esteja sempre funcional, seguro, limpo e acolhedor. Cada área cuidada contribui para a harmonia dos trabalhos.' WHERE id = 'd526f134-13ef-47e8-b7cb-441e4aad8dd7';

UPDATE public.secretarias SET description = 'Responsável por garantir a sustentabilidade material da casa, com organização, transparência e zelo pelos recursos que sustentam todas as atividades.' WHERE id = '4190777d-a1d8-452a-a098-315587a5c433';

UPDATE public.secretarias SET description = 'Voz que ecoa para dentro e para fora da casa. Transforma palavras, imagens e mensagens em pontes de conexão entre o Lar e as pessoas que ele toca.' WHERE id = '92b5f060-67f2-459d-9089-cb02b811f601';

-- Responsibilities: Diretoria Geral
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Coordenar, alinhar e supervisionar todas as atividades realizadas na casa', 1),
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Definir diretrizes, prioridades e agendas das atividades semanais e especiais', 2),
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Apoiar e acompanhar as coordenações de todas as secretarias', 3),
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Atuar em situações de crise, conflito ou necessidade de reorganização', 4),
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Promover a harmonia entre os trabalhadores e facilitar a escuta ativa', 5),
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Representar o Lar institucionalmente perante a comunidade externa', 6),
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Autorizar e validar novas propostas, ações e comunicações antes da execução', 7),
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Garantir que o direcionamento espiritual dos trabalhos seja preservado', 8),
('ca9d7d1a-2c3c-455a-9be4-66f8972c6c3f', 'Participar da sustentação vibracional dos trabalhos mais sensíveis da casa', 9);

-- Responsibilities: Acolhimento
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Receber frequentadores com cordialidade e atenção, oferecendo ambiente fraterno', 1),
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Realizar entrega e recolhimento das fichas de atendimento', 2),
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Organizar e manter atualizado o quadro de atendimentos', 3),
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Realizar chamada dos nomes com serenidade e acolhimento', 4),
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Atuar com atenção especial a pessoas em fragilidade emocional', 5),
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Auxiliar na organização das filas e circulação de pessoas', 6),
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Produzir e entregar lembranças em datas especiais', 7),
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Estar em sintonia com a Secretaria Mediúnica para encaminhamentos', 8),
('f2974012-f443-4de0-b010-ee7707a1fcdd', 'Manter o ambiente externo sereno, silencioso e respeitoso', 9);

-- Responsibilities: Cultura e Artes
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('4385da8d-bb69-4dbd-a6e7-7cd4a30d932c', 'Organizar e conduzir momentos de musicoterapia antes das palestras', 1),
('4385da8d-bb69-4dbd-a6e7-7cd4a30d932c', 'Gerenciar equipamentos de som, microfones, projetores e telões', 2),
('4385da8d-bb69-4dbd-a6e7-7cd4a30d932c', 'Criar ambiência estética e sensível que favoreça o recolhimento', 3),
('4385da8d-bb69-4dbd-a6e7-7cd4a30d932c', 'Realizar intervenções culturais como leitura de poesias e músicas reflexivas', 4),
('4385da8d-bb69-4dbd-a6e7-7cd4a30d932c', 'Cuidar da manutenção das obras de arte e elementos visuais da casa', 5),
('4385da8d-bb69-4dbd-a6e7-7cd4a30d932c', 'Trabalhar com a Comunicação na produção de elementos gráficos e artísticos', 6),
('4385da8d-bb69-4dbd-a6e7-7cd4a30d932c', 'Revezar e organizar escalas de músicos e operadores de som', 7),
('4385da8d-bb69-4dbd-a6e7-7cd4a30d932c', 'Zelar pelo equilíbrio entre arte e espiritualidade', 8);

-- Responsibilities: Formação
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Organizar e conduzir estudos doutrinários semanais (quintas-feiras)', 1),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Produzir, adaptar ou selecionar conteúdos para o EDE e demais cursos', 2),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Criar e manter registros das aulas, facilitando acesso aos conteúdos', 3),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Promover formação continuada de médiuns com estudos específicos', 4),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Planejar clubes de leitura, grupos de estudo temáticos e oficinas', 5),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Oferecer suporte aos trabalhadores com dúvidas doutrinárias', 6),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Estimular hábito de estudo pessoal com indicações de leituras', 7),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Cuidar da organização da biblioteca da casa', 8),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Dialogar com Diretoria e Mediúnica para alinhar necessidades formativas', 9),
('0f04f632-3582-4f0b-83d1-ccb39ca34591', 'Colaborar com demais secretarias em materiais instrutivos', 10);

-- Responsibilities: Social
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Organizar eventos de caridade: sopas, cestas básicas, kits de higiene', 1),
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Coordenar campanhas de arrecadação e ações emergenciais', 2),
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Planejar eventos comemorativos: aniversários, São João, Natal, confraternizações', 3),
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Cuidar da organização dos espaços e decorações de eventos', 4),
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Estimular participação dos voluntários com escalas de apoio', 5),
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Gerenciar arrecadação de fundos: rifas, cantinas, bazares', 6),
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Alinhar com a Financeira sobre orçamentos e registros', 7),
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Apoiar outras secretarias com suporte logístico e decorativo', 8),
('2fe0278b-f995-4860-b2f5-b9c9826b50cc', 'Garantir dignidade, respeito e discrição com os beneficiados', 9);

-- Responsibilities: Mediúnica
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Coordenar atendimentos espirituais: passes, macas e desobsessão', 1),
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Estabelecer escalas dos médiuns e aplicadores de passe', 2),
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Acompanhar espiritualmente e emocionalmente os médiuns', 3),
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Promover estudo contínuo da mediunidade com a Formação', 4),
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Organizar o trabalho de diálogo fraterno', 5),
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Gerenciar pedidos de entrada de novos trabalhadores mediúnicos', 6),
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Supervisionar psicografias e coerência doutrinária', 7),
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Garantir ambiente preparado com silêncio e harmonia vibracional', 8),
('33f8f79c-f207-42e8-b7c0-649f792be5c8', 'Conduzir encaminhamentos em casos de desequilíbrios ou condutas inadequadas', 9);

-- Responsibilities: Infraestrutura
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Organizar ambientes internos e externos para cada encontro', 1),
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Garantir funcionamento dos equipamentos (ventiladores, iluminação, som)', 2),
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Realizar ou coordenar pequenos reparos estruturais', 3),
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Cuidar da disposição de macas e cadeiras antes e depois dos trabalhos', 4),
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Manter o espaço limpo, bonito e acolhedor', 5),
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Realizar paisagismo e jardinagem', 6),
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Auxiliar na organização e segurança do estacionamento', 7),
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Apoiar logística de eventos internos e externos', 8),
('d526f134-13ef-47e8-b7cb-441e4aad8dd7', 'Zelar pela segurança patrimonial', 9);

-- Responsibilities: Financeira
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('4190777d-a1d8-452a-a098-315587a5c433', 'Gerenciar todas as entradas e saídas financeiras com transparência', 1),
('4190777d-a1d8-452a-a098-315587a5c433', 'Cuidar dos processos de compra e reposição de materiais', 2),
('4190777d-a1d8-452a-a098-315587a5c433', 'Organizar registros documentais e contábeis', 3),
('4190777d-a1d8-452a-a098-315587a5c433', 'Apoiar secretarias em ações com recursos: rifas, bazares, cantinas', 4),
('4190777d-a1d8-452a-a098-315587a5c433', 'Elaborar e apresentar relatórios financeiros periódicos à Direção', 5),
('4190777d-a1d8-452a-a098-315587a5c433', 'Manter comunicação fluida com a Social e Infraestrutura', 6),
('4190777d-a1d8-452a-a098-315587a5c433', 'Avaliar pedidos de uso dos recursos com critério e diálogo', 7),
('4190777d-a1d8-452a-a098-315587a5c433', 'Colaborar em estratégias de sustentabilidade financeira', 8);

-- Responsibilities: Comunicação
INSERT INTO public.secretaria_responsibilities (secretaria_id, title, item_order) VALUES
('92b5f060-67f2-459d-9089-cb02b811f601', 'Gerenciar canais oficiais: Instagram, WhatsApp, cartazes', 1),
('92b5f060-67f2-459d-9089-cb02b811f601', 'Planejar e publicar conteúdos que fortaleçam os valores do Lar', 2),
('92b5f060-67f2-459d-9089-cb02b811f601', 'Criar peças gráficas, vídeos e convites para eventos', 3),
('92b5f060-67f2-459d-9089-cb02b811f601', 'Cuidar do envio de avisos e lembretes para voluntários e frequentadores', 4),
('92b5f060-67f2-459d-9089-cb02b811f601', 'Dar suporte às demais secretarias na divulgação de campanhas', 5),
('92b5f060-67f2-459d-9089-cb02b811f601', 'Promover unidade da linguagem e imagem institucional da casa', 6),
('92b5f060-67f2-459d-9089-cb02b811f601', 'Criar materiais educativos e reflexivos em sintonia com Direção e Formação', 7),
('92b5f060-67f2-459d-9089-cb02b811f601', 'Monitorar e organizar os grupos de WhatsApp da casa', 8),
('92b5f060-67f2-459d-9089-cb02b811f601', 'Ser guardiã do tom de voz e da identidade visual do Lar', 9);
