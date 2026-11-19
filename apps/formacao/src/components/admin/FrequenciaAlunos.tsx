import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, Download, Loader2, Search } from 'lucide-react';

// Frequência por aluno de um curso: presenças (link da aula ou aula marcada como concluída) sobre o total de aulas do curso.
// Aprovado com 75% de presença. Quem usa o painel pode ligar um segundo critério: aprovação em todas as
// avaliações publicadas do curso. A escolha fica guardada neste aparelho, por curso.
// Os números vêm de formacao.painel_presenca (administrador ou facilitador do curso).

const MINIMO_APROVACAO = 75;

interface LinhaAluno {
  user_id: string;
  full_name: string;
  email: string;
  matriculado: boolean;
  presencas: number;
  total_aulas: number;
  percentual: number;
  aprovado: boolean;
  avaliacoes_aprovadas: number;
  total_avaliacoes: number;
}

const chaveCriterio = (courseId: string) => `lsl-formacao-criterio-avaliacoes-${courseId}`;

function lerCriterio(courseId: string) {
  try { return localStorage.getItem(chaveCriterio(courseId)) === '1'; } catch { return false; }
}

export function FrequenciaAlunos({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [linhas, setLinhas] = useState<LinhaAluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [exigeAvaliacoes, setExigeAvaliacoes] = useState(() => lerCriterio(courseId));

  useEffect(() => { setExigeAvaliacoes(lerCriterio(courseId)); }, [courseId]);

  const mudarCriterio = (ligado: boolean) => {
    setExigeAvaliacoes(ligado);
    try { localStorage.setItem(chaveCriterio(courseId), ligado ? '1' : '0'); } catch { /* sem armazenamento local: vale só nesta visita */ }
  };

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('painel_presenca', { p_course: courseId }).then(({ data, error }: { data: LinhaAluno[] | null; error: { message: string } | null }) => {
      if (!ativo) return;
      if (error) setErro(error.message);
      setLinhas(data ?? []);
      setCarregando(false);
    });
    return () => { ativo = false; };
  }, [courseId]);

  const totalAulas = linhas[0]?.total_aulas ?? 0;
  const minimoPresencas = Math.ceil((MINIMO_APROVACAO * totalAulas) / 100);
  const totalAvaliacoes = linhas[0]?.total_avaliacoes ?? 0;
  const passouAvaliacoes = (l: LinhaAluno) => l.avaliacoes_aprovadas >= l.total_avaliacoes;
  const estaAprovado = (l: LinhaAluno) => l.aprovado && (!exigeAvaliacoes || passouAvaliacoes(l));
  const aprovados = linhas.filter(estaAprovado).length;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return linhas;
    return linhas.filter((l) => l.full_name?.toLowerCase().includes(termo) || l.email?.toLowerCase().includes(termo));
  }, [linhas, busca]);

  const exportarCSV = () => {
    const cabecalho = 'Nome;E-mail;Presenças;Total de aulas;Percentual;Avaliações aprovadas;Total de avaliações;Situação\n';
    const corpo = linhas
      .map((l) => `"${l.full_name ?? ''}";"${l.email ?? ''}";${l.presencas};${l.total_aulas};${l.percentual}%;${l.avaliacoes_aprovadas};${l.total_avaliacoes};${estaAprovado(l) ? 'Aprovado' : ''}`)
      .join('\n');
    const blob = new Blob(['﻿' + cabecalho + corpo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frequencia-${courseTitle.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (carregando) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (erro) {
    return <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">Não foi possível carregar a frequência dos alunos. Atualize a página e tente de novo.</p>;
  }

  if (linhas.length === 0) {
    return <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">Nenhum aluno matriculado neste curso.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {aprovados} de {linhas.length} alunos aprovados
          </p>
          <p className="text-muted-foreground">
            Aprovação com {MINIMO_APROVACAO}% de presença: {minimoPresencas} de {totalAulas} aulas
            {exigeAvaliacoes && totalAvaliacoes > 0 ? ` e aprovação nas ${totalAvaliacoes} avaliações do curso.` : '.'}
          </p>
          <label className="mt-3 flex items-center gap-2 cursor-pointer">
            <Switch checked={exigeAvaliacoes} onCheckedChange={mudarCriterio} />
            <span className="text-foreground">Exigir aprovação nas avaliações</span>
          </label>
          {exigeAvaliacoes && totalAvaliacoes === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Este curso ainda não tem avaliação publicada, então vale só a presença.</p>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto" onClick={exportarCSV}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno por nome ou e-mail" className="pl-9" />
      </div>

      <ul className="rounded-lg border bg-card divide-y divide-border">
        {visiveis.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum aluno encontrado com essa busca.</li>
        )}
        {visiveis.map((l) => {
          const faltam = Math.max(minimoPresencas - l.presencas, 0);
          const faltamAvaliacoes = exigeAvaliacoes ? Math.max(l.total_avaliacoes - l.avaliacoes_aprovadas, 0) : 0;
          const aprovadoFinal = estaAprovado(l);
          return (
            <li key={l.user_id} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">
                  {l.full_name || 'Sem nome'}
                  {!l.matriculado && <span className="ml-2 text-xs font-normal text-muted-foreground">(sem matrícula no curso)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{l.email}</p>
              </div>
              <div className="flex items-center gap-3 sm:w-[360px]">
                <div className="flex-1">
                  <Progress value={l.percentual} className="h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.presencas} de {l.total_aulas} aulas
                    {exigeAvaliacoes && l.total_avaliacoes > 0 && ` · ${l.avaliacoes_aprovadas} de ${l.total_avaliacoes} avaliações`}
                  </p>
                </div>
                <span className={`w-12 text-right text-sm font-semibold ${aprovadoFinal ? 'text-emerald-700' : 'text-foreground'}`}>{l.percentual}%</span>
                <div className="w-[116px] text-right">
                  {aprovadoFinal ? (
                    <Badge variant="outline" className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-300">
                      <CheckCircle className="h-3 w-3" />
                      Aprovado
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {faltam > 0 && <span className="block">{faltam === 1 ? 'Falta 1 presença' : `Faltam ${faltam} presenças`}</span>}
                      {faltamAvaliacoes > 0 && <span className="block">{faltamAvaliacoes === 1 ? 'Falta 1 avaliação' : `Faltam ${faltamAvaliacoes} avaliações`}</span>}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
