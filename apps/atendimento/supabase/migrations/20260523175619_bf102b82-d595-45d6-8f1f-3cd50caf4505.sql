CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'macas_ativas', (SELECT count(*) FROM public.macas WHERE ativa = true),
    'consulentes_cadastrados', (SELECT count(*) FROM public.consulentes),
    'consulentes_em_macas', (SELECT count(*) FROM public.designacoes WHERE status = 'ativa'),
    'mediuns_ativos', (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE role = 'medium')
  )
$$;

ALTER FUNCTION public.get_dashboard_stats() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO anon;
