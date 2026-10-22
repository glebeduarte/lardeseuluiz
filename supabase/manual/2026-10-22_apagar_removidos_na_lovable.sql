-- Atualização dos dados vindos da Lovable, 22/10/2026.
-- Estes registros foram apagados nos sistemas da Lovable depois da cópia de 13/10, mas continuam no banco novo.
-- A ferramenta usada na atualização não deixa apagar nada, por isso eles ficam aqui para rodar à mão:
-- Supabase > SQL Editor > colar este arquivo > Run. Tudo roda numa transação só; se algo falhar, nada é apagado.

begin;

-- Atendimento: médiuns retirados de macas na Lovable
delete from atendimento.maca_mediuns where id in (
  '57de5ade-8a2a-42a2-aa39-8318bf4afa22',
  '62a53116-d3a5-4e16-8ff7-23c0ee1dc864',
  '8777c702-1783-43d6-8b66-792995716e02',
  '95469f94-6c12-4ead-82f9-4b1155dddc40',
  'de08c070-3328-4674-ba97-875d95769168'
);

-- Atendimento: sessão de teste criada no sistema novo em 13/10 (data movida para 01/01/2000) e sua presença
delete from atendimento.presencas where sessao_id = '95c2346d-499f-4474-92c6-f76427ed4a43';
delete from atendimento.sessoes where id = '95c2346d-499f-4474-92c6-f76427ed4a43';

-- Formação: uma aluna removida na Lovable e suas 4 matrículas
delete from formacao.enrollments where user_id = '6f4a8e7f-142f-48d1-ba95-edb67dfa65af';
delete from formacao.profiles where id = '6f4a8e7f-142f-48d1-ba95-edb67dfa65af';

-- Formação: "Encontro Extra 2" (22/10/2026), removido do calendário do ESDE na Lovable
delete from formacao.esde_calendar_entries where id = 'b3da7ba6-56a9-4dd2-9989-f56f8d5821f7';

-- Formação: cópia antiga de um perfil. O acesso dessa pessoa no sistema novo (criado em 22/10)
-- já levou matrículas, aulas e presenças para o perfil novo 02cef05f-454a-470e-bc00-54725e409059.
delete from formacao.profiles where id = '73554771-60f8-4495-a91b-b720bd9ef532'
  and not exists (select 1 from formacao.enrollments where user_id = '73554771-60f8-4495-a91b-b720bd9ef532')
  and not exists (select 1 from formacao.lesson_progress where user_id = '73554771-60f8-4495-a91b-b720bd9ef532');

commit;
