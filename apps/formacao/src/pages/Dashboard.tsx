import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { enrollUserInCourse } from '@/lib/enrollments';
import { useVitrine, type CursoVitrine } from '@/lib/vitrine';
import { Cartaz, CartaoContinuar, Destaque, FaixaAoVivo, Fileira } from '@/components/aluno/Vitrine';

// Início do aluno na Formação, no estilo de uma plataforma de vídeos:
// destaque no topo, o próximo encontro ao vivo e fileiras com tudo o que há para estudar.

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inscrevendo, setInscrevendo] = useState<string | null>(null);

  // Admin cai no painel, a não ser que tenha pedido a "Visão do aluno"
  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let lembra = false;
    try { lembra = sessionStorage.getItem('lsl:visao-aluno') === '1'; } catch { /* sem armazenamento */ }
    if (!new URLSearchParams(location.search).has('student-view') && !lembra) navigate('/admin', { replace: true });
  }, [isAdmin, authLoading, navigate, location.search]);

  const { data, isLoading, isError, refetch } = useVitrine(user?.id, profile?.user_type);
  const cursos = useMemo(() => data?.cursos ?? [], [data]);

  const { data: avaliacoes } = useQuery({
    queryKey: ['vitrine-avaliacoes', user?.id, cursos.filter((c) => c.matricula === 'approved').map((c) => c.id).join(',')],
    enabled: !!user && cursos.some((c) => c.matricula === 'approved'),
    queryFn: async () => {
      const meus = cursos.filter((c) => c.matricula === 'approved');
      const { data: as } = await supabase.from('assessments').select('id, title, course_id').in('course_id', meus.map((c) => c.id)).eq('status', 'published');
      if (!as?.length) return [];
      const { data: ts } = await supabase.from('assessment_attempts').select('assessment_id, score, passed, submitted_at')
        .in('assessment_id', as.map((a) => a.id)).eq('user_id', user!.id).not('submitted_at', 'is', null).order('submitted_at', { ascending: false });
      return as.map((a) => {
        const t = ts?.find((x) => x.assessment_id === a.id);
        return { id: a.id, titulo: a.title, cursoId: a.course_id, curso: meus.find((c) => c.id === a.course_id)?.titulo ?? '', nota: t?.score ?? null, aprovado: t?.passed ?? null, feita: !!t };
      });
    },
  });

  const inscrever = async (c: CursoVitrine) => {
    if (!user) return;
    setInscrevendo(c.id);
    const { error } = await enrollUserInCourse(user.id, c.id);
    setInscrevendo(null);
    if (error) return toast({ title: 'Não foi possível fazer a inscrição', description: 'Tente de novo ou fale com a Secretaria de Formação.', variant: 'destructive' });
    toast({ title: 'Inscrição feita', description: `Você já pode assistir a ${c.titulo}.` });
    qc.invalidateQueries({ queryKey: ['vitrine-aluno'] });
  };

  // Fileiras
  const meus = cursos.filter((c) => c.matricula === 'approved');
  const continuar = meus.filter((c) => c.feitas > 0 && c.pct < 100 && c.proxima)
    .sort((a, b) => (b.ultimaVez ?? '').localeCompare(a.ultimaVez ?? ''));
  const meusOrdenados = [...meus].sort((a, b) => Number(b.pct > 0 && b.pct < 100) - Number(a.pct > 0 && a.pct < 100) || a.pct - b.pct);
  const abertos = cursos.filter((c) => c.matricula !== 'approved' && c.inscricoesAbertas).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const porCategoria = (cat: string) => cursos.filter((c) => c.categoria === cat).sort((a, b) => (a.ordemDestaque || 99) - (b.ordemDestaque || 99) || a.titulo.localeCompare(b.titulo, 'pt-BR'));

  // Destaques: o curso que a pessoa está fazendo, depois os marcados como destaque
  const destaques = useMemo(() => {
    const lista: CursoVitrine[] = [];
    if (continuar[0]) lista.push(continuar[0]);
    cursos.filter((c) => c.destaque).sort((a, b) => a.ordemDestaque - b.ordemDestaque).forEach((c) => { if (!lista.includes(c)) lista.push(c); });
    if (!lista.length && cursos.length) lista.push(abertos[0] ?? cursos[0]);
    return lista.slice(0, 4);
  }, [cursos]); // eslint-disable-line react-hooks/exhaustive-deps

  const primeiroNome = profile?.full_name?.split(' ')[0];

  return (
    <DashboardLayout>
      <h1 className="sr-only">Início da Formação{primeiroNome ? ` de ${primeiroNome}` : ''}</h1>

      {isLoading ? (
        <div aria-busy="true" aria-label="Carregando seus cursos">
          <div className="bg-[#111] h-[320px] md:h-[520px]" />
          <div className="aluno-coluna mt-10 space-y-10">
            {[0, 1].map((k) => (
              <div key={k}>
                <div className="h-5 w-48 rounded bg-[#1a1a1a] mb-4" />
                <div className="flex gap-3.5 overflow-hidden">{Array.from({ length: 6 }).map((_, j) => <div key={j} className="shrink-0 w-[152px] sm:w-[188px] aspect-[4/5] rounded-lg bg-[#1a1a1a]" />)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="aluno-coluna py-16">
          <p className="text-white text-[16px]">Não conseguimos carregar os cursos agora.</p>
          <button className="aluno-botao aluno-botao--secundario mt-4" onClick={() => refetch()}>Tentar de novo</button>
        </div>
      ) : (
        <>
          <Destaque itens={destaques} aoInscrever={inscrever} inscrevendo={inscrevendo} />

          <div className="aluno-coluna mt-8 md:mt-10 space-y-10 md:space-y-12">
            {data?.proximoEncontro && <FaixaAoVivo e={data.proximoEncontro} />}

            {continuar.length > 0 && (
              <Fileira titulo="Continue de onde parou">
                {continuar.map((c) => <CartaoContinuar key={c.id} c={c} />)}
              </Fileira>
            )}

            {meus.length > 0 ? (
              <Fileira titulo="Meus cursos" detalhe={`${meus.length} ${meus.length === 1 ? 'curso' : 'cursos'} · ${meus.filter((c) => c.pct === 100).length} concluídos`}>
                {meusOrdenados.map((c) => <Cartaz key={c.id} c={c} />)}
              </Fileira>
            ) : (
              <section className="rounded-xl bg-[#111] p-6">
                <h2 className="text-[20px] font-semibold text-white">Você ainda não está em nenhum curso</h2>
                <p className="mt-1 text-[15px] text-[#b4b4b4]">Escolha um curso abaixo e toque em Inscrever-se. A inscrição vale na hora.</p>
              </section>
            )}

            {abertos.length > 0 && (
              <Fileira titulo="Inscrições abertas para você" detalhe="Entre agora e comece quando quiser" verTodos="/explore">
                {abertos.map((c) => <Cartaz key={c.id} c={c} />)}
              </Fileira>
            )}

            {porCategoria('formacoes').length > 0 && (
              <Fileira titulo="Formações contínuas" detalhe="Estudos com calendário e turma">
                {porCategoria('formacoes').map((c) => <Cartaz key={c.id} c={c} />)}
              </Fileira>
            )}
            {porCategoria('cursos_extras').length > 0 && (
              <Fileira titulo="Cursos extras" detalhe="Para aprofundar um tema">
                {porCategoria('cursos_extras').map((c) => <Cartaz key={c.id} c={c} />)}
              </Fileira>
            )}
            {porCategoria('materiais').length > 0 && (
              <Fileira titulo="Materiais de apoio" detalhe="Para consultar quando precisar">
                {porCategoria('materiais').map((c) => <Cartaz key={c.id} c={c} />)}
              </Fileira>
            )}

            {(avaliacoes?.length ?? 0) > 0 && (
              <section aria-labelledby="avaliacoes-titulo">
                <h2 id="avaliacoes-titulo" className="text-[20px] font-semibold text-white mb-3">Suas avaliações</h2>
                <ul className="rounded-xl bg-[#111] divide-y divide-[#1f1f1f]">
                  {avaliacoes!.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <Link to={`/course/${a.cursoId}`} className="flex items-center gap-4 px-5 py-4 hover:bg-[#1a1a1a] transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-white truncate">{a.titulo}</p>
                          <p className="text-[13px] text-[#949494] truncate">{a.curso}</p>
                        </div>
                        {a.feita && a.nota != null && <span className="text-[18px] font-semibold text-white tabular-nums">{a.nota}%</span>}
                        <span className={`text-[12px] font-semibold rounded-full px-2.5 py-1 ${a.feita ? (a.aprovado ? 'bg-[#172a1d] text-[#3fc07a]' : 'bg-[#2b2206] text-[#ffc116]') : 'bg-[#2a2a2a] text-white'}`}>
                          {a.feita ? (a.aprovado ? 'Aprovado' : 'Refazer') : 'Fazer agora'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(data?.avisos.length ?? 0) > 0 && (
              <section aria-labelledby="avisos-titulo">
                <div className="flex items-end justify-between mb-3">
                  <h2 id="avisos-titulo" className="text-[20px] font-semibold text-white">Avisos da Casa</h2>
                  <Link to="/avisos" className="text-[14px] font-semibold text-[#b4b4b4] hover:text-white">Ver todos</Link>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {data!.avisos.map((a) => (
                    <Link key={a.id} to="/avisos" className="rounded-xl bg-[#111] p-5 hover:bg-[#1a1a1a] transition-colors">
                      <p className="text-[12px] text-[#949494]">{new Date(a.starts_at || a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                      <p className="mt-1 text-[16px] font-semibold text-white leading-snug line-clamp-2">{a.title}</p>
                      {a.description && <p className="mt-1 text-[14px] text-[#b4b4b4] line-clamp-2">{a.description}</p>}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
