import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Dados da vitrine do aluno (Início e catálogo em estilo streaming).
// Tudo é calculado a partir das linhas: aulas feitas, total, próxima aula e o próximo encontro ao vivo.

export type CursoVitrine = {
  id: string;
  titulo: string;
  descricao: string | null;
  sobre: string | null;
  frase: string | null;
  capa: string | null;        // 4:5, cartaz
  fundo: string | null;       // 21:9, destaque
  categoria: 'formacoes' | 'cursos_extras' | 'materiais' | string | null;
  publico: string | null;
  linhas: string[];
  inscricoesAbertas: boolean;
  destaque: boolean;
  ordemDestaque: number;
  apresentacao: string | null;
  inicio: string | null;
  fim: string | null;
  horario: string | null;
  facilitador: string | null;
  minutosPorAula: number | null;
  criadoEm: string;
  // calculados
  modulos: number;
  aulas: number;
  feitas: number;
  pct: number;
  proxima: { id: string; titulo: string; numero: number } | null;
  matricula: 'approved' | 'pending' | 'rejected' | null;
  ultimaVez: string | null;   // última aula concluída neste curso
};

export type EncontroAoVivo = {
  cursoId: string | null;
  cursoTitulo: string;
  data: Date;
  hora: string;
  tema: string | null;
  roteiro: string | null;
  modulo: string | null;
  facilitador: string | null;
  tipo: string;
  matriculado: boolean;
};

export const SALA_MEET = 'https://meet.google.com/dvh-ooii-vgb';

export const NOME_CATEGORIA: Record<string, string> = {
  formacoes: 'Formação contínua',
  cursos_extras: 'Curso extra',
  materiais: 'Material de apoio',
};

const vePublico = (publico: string | null, tipo: string) =>
  !(publico === 'trabalhadores' && tipo !== 'trabalhador') && !(publico === 'frequentadores' && tipo !== 'frequentador');

/** "Quintas-feiras, às 19:30" → "19h30". */
export function horaDoHorario(horario: string | null) {
  const m = horario?.match(/(\d{1,2})[:h](\d{2})?/);
  if (!m) return '19h30';
  return `${Number(m[1])}h${m[2] ?? ''}`;
}

export function useVitrine(userId: string | undefined, tipoUsuario: string | null | undefined) {
  return useQuery({
    queryKey: ['vitrine-aluno', userId, tipoUsuario],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const tipo = tipoUsuario || 'frequentador';
      const [cursosRes, matrRes, progRes, calRes, avisosRes] = await Promise.all([
        supabase.from('courses')
          .select('id, title, description, long_description, tagline, thumbnail_url, cover_url, category, audience, study_lines, enrollment_open, featured, featured_order, trailer_url, start_date, end_date, schedule, facilitator, estimated_duration_minutes, created_at, status')
          .eq('status', 'published'),
        supabase.from('enrollments').select('course_id, status').eq('user_id', userId!),
        supabase.from('lesson_progress').select('lesson_id, completed_at').eq('user_id', userId!).eq('completed', true),
        supabase.from('esde_calendar_entries').select('course_code, date_label, roteiro, tema, modulo, facilitador, tipo, sort_order'),
        supabase.from('announcements').select('id, title, description, category, starts_at, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(3),
      ]);
      if (cursosRes.error) throw cursosRes.error;

      const matriculas = new Map<string, CursoVitrine['matricula']>();
      (matrRes.data ?? []).forEach((m) => {
        const atual = matriculas.get(m.course_id);
        if (atual !== 'approved') matriculas.set(m.course_id, m.status as CursoVitrine['matricula']);
      });

      // Cursos que esta pessoa vê: os do seu público e os em que já está matriculada
      const visiveis = (cursosRes.data ?? []).filter((c) => matriculas.get(c.id) === 'approved' || vePublico(c.audience, tipo));
      const ids = visiveis.map((c) => c.id);

      // Ementa (títulos de módulos e aulas) de todos os cursos publicados, inclusive os que a pessoa ainda não fez
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ementa } = await (supabase.rpc as any)('ementa_cursos', { p_curso: null });
      type LinhaEmenta = { course_id: string; module_id: string; module_order: number; lesson_id: string | null; lesson_title: string | null; lesson_order: number };
      const linhasEmenta = ((ementa ?? []) as LinhaEmenta[]).filter((e) => ids.includes(e.course_id));
      const mods = Array.from(new Map(linhasEmenta.map((e) => [e.module_id, { id: e.module_id, course_id: e.course_id, order_index: e.module_order }])).values());
      const aulas = linhasEmenta.filter((e) => e.lesson_id).map((e) => ({ id: e.lesson_id!, title: e.lesson_title ?? '', module_id: e.module_id, order_index: e.lesson_order }));

      const feitasEm = new Map<string, string>();
      (progRes.data ?? []).forEach((p) => feitasEm.set(p.lesson_id, p.completed_at ?? ''));

      const ordemModulo = new Map((mods ?? []).map((m) => [m.id, { curso: m.course_id, ordem: m.order_index ?? 0 }]));

      const cursos: CursoVitrine[] = visiveis.map((c) => {
        const daqui = (aulas ?? [])
          .filter((a) => ordemModulo.get(a.module_id)?.curso === c.id)
          .sort((a, b) => (ordemModulo.get(a.module_id)!.ordem - ordemModulo.get(b.module_id)!.ordem) || ((a.order_index ?? 0) - (b.order_index ?? 0)));
        const feitas = daqui.filter((a) => feitasEm.has(a.id));
        const idxProxima = daqui.findIndex((a) => !feitasEm.has(a.id));
        const ultima = feitas.map((a) => feitasEm.get(a.id) ?? '').sort().pop() || null;
        return {
          id: c.id,
          titulo: c.title,
          descricao: c.description,
          sobre: (c as { long_description?: string | null }).long_description ?? null,
          frase: (c as { tagline?: string | null }).tagline ?? null,
          capa: c.thumbnail_url || c.cover_url,
          fundo: c.cover_url || null,
          categoria: c.category,
          publico: c.audience,
          linhas: c.study_lines ?? [],
          inscricoesAbertas: c.enrollment_open !== false,
          destaque: !!(c as { featured?: boolean }).featured,
          ordemDestaque: (c as { featured_order?: number }).featured_order ?? 0,
          apresentacao: (c as { trailer_url?: string | null }).trailer_url ?? null,
          inicio: c.start_date,
          fim: c.end_date,
          horario: c.schedule,
          facilitador: c.facilitator,
          minutosPorAula: c.estimated_duration_minutes,
          criadoEm: c.created_at,
          modulos: (mods ?? []).filter((m) => m.course_id === c.id).length,
          aulas: daqui.length,
          feitas: feitas.length,
          pct: daqui.length ? Math.round((feitas.length / daqui.length) * 100) : 0,
          proxima: idxProxima >= 0 ? { id: daqui[idxProxima].id, titulo: daqui[idxProxima].title, numero: idxProxima + 1 } : null,
          matricula: matriculas.get(c.id) ?? null,
          ultimaVez: ultima,
        };
      });

      // Próximo encontro ao vivo do ESDE (calendário da Formação)
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const porCodigo = (codigo: string) => cursos.find((c) => c.titulo.replace(/\s+/g, '_').toUpperCase() === codigo.toUpperCase());
      const encontros: EncontroAoVivo[] = (calRes.data ?? [])
        .filter((e) => e.tipo !== 'feriado' && e.tipo !== 'recesso')
        .map((e) => {
          const m = String(e.date_label ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (!m) return null;
          const curso = porCodigo(e.course_code);
          return {
            cursoId: curso?.id ?? null,
            cursoTitulo: curso?.titulo ?? e.course_code.replace('_', ' '),
            data: new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])),
            hora: horaDoHorario(curso?.horario ?? null),
            tema: e.tema, roteiro: e.roteiro, modulo: e.modulo, facilitador: e.facilitador, tipo: e.tipo,
            matriculado: curso?.matricula === 'approved',
          };
        })
        .filter((e): e is EncontroAoVivo => !!e && e.data >= hoje)
        .sort((a, b) => +a.data - +b.data);
      const proximoEncontro = encontros.find((e) => e.matriculado) ?? null;

      return { cursos, proximoEncontro, avisos: avisosRes.data ?? [] };
    },
  });
}

/** "hoje", "amanhã" ou "em 4 dias". */
export function quandoFalta(data: Date) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = Math.round((+data - +hoje) / 86_400_000);
  return dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
}

/** Quanto tempo de aula o curso tem, ex.: "28h30 de aula". */
export function duracaoTotal(c: CursoVitrine) {
  if (!c.minutosPorAula || !c.aulas) return null;
  const total = c.minutosPorAula * c.aulas;
  const h = Math.floor(total / 60); const m = total % 60;
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''} de aula` : `${m} min de aula`;
}

/** Link de vídeo (YouTube ou Google Drive) no formato que abre dentro da página. */
export function videoEmbed(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const drive = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return url;
}

/** Versão leve da imagem do Storage (o Supabase redimensiona e entrega em WebP). */
export function imagem(url: string | null | undefined, largura: number, proporcao = 16 / 9) {
  if (!url) return undefined;
  if (!url.includes('/storage/v1/object/public/')) return url;
  // Largura e altura juntas: só com a largura o serviço mantém a altura original e corta as laterais
  const altura = Math.round(largura / proporcao);
  return `${url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=${largura}&height=${altura}&resize=cover&quality=72`;
}
export const CARTAZ = 4 / 5;
/** srcset para fundos largos. */
export function imagemSrcSet(url: string | null | undefined) {
  if (!url || !url.includes('/storage/v1/object/public/')) return undefined;
  return [900, 1600, 2400].map((w) => `${imagem(url, w)} ${w}w`).join(', ');
}
