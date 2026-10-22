-- Rifa: itens do prêmio (lista) e valor do prêmio, mostrados na caixa do cabeçalho da página da rifa.
alter table governanca.raffles add column if not exists prize_items text[] not null default '{}';
alter table governanca.raffles add column if not exists prize_value text;

do $$
declare v_def text;
begin
  select pg_get_functiondef('governanca.rifa_publica'::regproc) into v_def;
  if position('''itens_premio''' in v_def) = 0 then
    v_def := replace(v_def, $a$'premio', r.prize,$a$, $b$'premio', r.prize, 'itens_premio', to_jsonb(r.prize_items), 'valor_premio', r.prize_value,$b$);
    execute v_def;
  end if;
end $$;

-- Primeira rifa (rascunho): transformação no Salão de Hegley
update governanca.raffles
   set prize = 'Transformação completa no Salão de Hegley',
       prize_items = array['Consultoria de imagem', 'Mechas', 'Corte', 'Tratamento', 'Maquiagem', 'Todos os produtos incluídos'],
       prize_value = 'Mais de R$ 1.000',
       description = 'Quem for sorteada ganha uma transformação completa no Salão de Hegley, feita pelo cabeleireiro Lipe Anderson. O salão doou o prêmio e toda a arrecadação vai para o Lar de Seu Luiz.',
       rules = E'O prêmio é oferecido pelo Salão de Hegley e pelo cabeleireiro Lipe Anderson e inclui todos os produtos necessários.\n\nO atendimento é feito no salão, em data combinada diretamente com a pessoa sorteada.\n\nO prêmio é pessoal e não pode ser trocado por dinheiro.',
       updated_at = now()
 where slug = 'rifa-transformacao';
