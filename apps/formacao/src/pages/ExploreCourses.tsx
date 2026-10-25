import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVitrine } from '@/lib/vitrine';
import { Cartaz } from '@/components/aluno/Vitrine';

// Catálogo de cursos do aluno: todos os cursos que a pessoa pode fazer, em cartazes, com busca e linha de estudo.

const LINHAS = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'espirita', rotulo: 'Espírita' },
  { id: 'umbanda', rotulo: 'Umbanda' },
  { id: 'espiritualista', rotulo: 'Espiritualista' },
];
const GRUPOS = [
  { id: 'formacoes', titulo: 'Formações contínuas', detalhe: 'Estudos com calendário e turma' },
  { id: 'cursos_extras', titulo: 'Cursos extras', detalhe: 'Para aprofundar um tema' },
  { id: 'materiais', titulo: 'Materiais de apoio', detalhe: 'Para consultar quando precisar' },
];

export default function ExploreCourses() {
  const { user, profile } = useAuth();
  const { data, isLoading, isError, refetch } = useVitrine(user?.id, profile?.user_type);
  const [busca, setBusca] = useState('');
  const [linha, setLinha] = useState('todas');

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (data?.cursos ?? []).filter((c) =>
      (linha === 'todas' || c.linhas.includes(linha)) &&
      (!q || c.titulo.toLowerCase().includes(q) || (c.descricao ?? '').toLowerCase().includes(q)));
  }, [data, busca, linha]);

  return (
    <DashboardLayout>
      <div className="aluno-coluna pt-8 md:pt-10">
        <h1 className="font-['Playfair_Display'] text-[30px] md:text-[34px] font-bold text-white">Cursos</h1>
        <p className="mt-1 text-[15px] text-[#b4b4b4]">
          {data ? `${data.cursos.length} cursos e materiais para você · ${data.cursos.filter((c) => c.matricula === 'approved').length} em que já está inscrito` : 'Tudo o que a Formação oferece para você'}
        </p>

        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-3">
          <label className="relative md:w-[340px]">
            <span className="sr-only">Buscar curso</span>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#949494]" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar curso"
              className="w-full h-11 rounded-full bg-[#1a1a1a] pl-11 pr-4 text-[15px] text-white placeholder:text-[#949494] outline-none focus:ring-2 focus:ring-[var(--ouro)]" />
          </label>
          <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Linha de estudo">
            {LINHAS.map((l) => (
              <button key={l.id} onClick={() => setLinha(l.id)} aria-pressed={linha === l.id}
                className={`h-11 px-4 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors ${linha === l.id ? 'bg-white text-black' : 'bg-[#1a1a1a] text-[#b4b4b4] hover:text-white'}`}>
                {l.rotulo}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3.5 gap-y-8" aria-busy="true">
            {Array.from({ length: 12 }).map((_, k) => <div key={k} className="aspect-[4/5] rounded-lg bg-[#1a1a1a]" />)}
          </div>
        )}
        {isError && (
          <div className="mt-10">
            <p className="text-white">Não conseguimos carregar os cursos agora.</p>
            <button className="aluno-botao aluno-botao--secundario mt-4" onClick={() => refetch()}>Tentar de novo</button>
          </div>
        )}

        {data && lista.length === 0 && (
          <p className="mt-10 rounded-xl bg-[#111] p-6 text-[15px] text-[#b4b4b4]">Nenhum curso com {busca ? `"${busca}"` : 'esse filtro'}. Tente outra palavra ou volte para Todas.</p>
        )}

        <div className="mt-10 space-y-12">
          {GRUPOS.map((g) => {
            const itens = lista.filter((c) => c.categoria === g.id);
            if (!itens.length) return null;
            return (
              <section key={g.id} aria-labelledby={`grupo-${g.id}`}>
                <h2 id={`grupo-${g.id}`} className="text-[20px] font-semibold text-white">{g.titulo}</h2>
                <p className="text-[13px] text-[#949494] mt-0.5 mb-4">{g.detalhe} · {itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3.5 gap-y-8 [&>a]:w-auto">
                  {itens.map((c) => <Cartaz key={c.id} c={c} />)}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
