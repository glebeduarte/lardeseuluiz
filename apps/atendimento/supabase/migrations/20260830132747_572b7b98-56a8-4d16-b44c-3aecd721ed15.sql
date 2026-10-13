REVOKE EXECUTE ON FUNCTION public.fn_valida_sessao_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_valida_lotacao_maca() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_atualiza_sessoes_realizadas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_inativa_por_faltas_consecutivas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_presencas_set_updated() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sessoes_set_updated() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_set_created_by() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;