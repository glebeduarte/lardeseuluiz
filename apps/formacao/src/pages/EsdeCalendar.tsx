import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/logo-lar-seu-luiz.png';
import { supabase } from '@/integrations/supabase/client';

interface Aula {
  data: string;
  roteiro: string;
  tema: string;
  modulo: string;
  facilitador: string;
  tipo: 'aula' | 'feriado' | 'recesso' | 'encerramento' | 'extra';
}

const moduloColors: Record<string, string> = {
  'Módulo I': 'bg-primary/10 text-primary border-primary/20',
  'Módulo II': 'bg-accent/10 text-accent border-accent/20',
  'Módulo III': 'bg-success/10 text-success border-success/20',
  'Módulo IV': 'bg-warning/10 text-warning border-warning/20',
  'Módulo V': 'bg-destructive/10 text-destructive border-destructive/20',
  'Módulo VI': 'bg-primary/10 text-primary border-primary/20',
  'Módulo VII': 'bg-accent/10 text-accent border-accent/20',
  'Módulo VIII': 'bg-success/10 text-success border-success/20',
};

const moduloBorderLeft: Record<string, string> = {
  'Módulo I': 'border-l-4 border-l-primary',
  'Módulo II': 'border-l-4 border-l-accent',
  'Módulo III': 'border-l-4 border-l-success',
  'Módulo IV': 'border-l-4 border-l-warning',
  'Módulo V': 'border-l-4 border-l-destructive',
  'Módulo VI': 'border-l-4 border-l-primary',
  'Módulo VII': 'border-l-4 border-l-accent',
  'Módulo VIII': 'border-l-4 border-l-success',
};

type CourseMeta = {
  code: string;
  title: string;
  subtitle: string;
  pdfTitle: string;
  pdfFile: string;
  heading: string;
};

const COURSES: Record<string, CourseMeta> = {
  ESDE_I: {
    code: 'ESDE_I',
    title: 'Calendário ESDE I — 2026',
    subtitle: 'Estudo Sistematizado da Doutrina Espírita',
    pdfTitle: 'Calendario ESDE I - 2026',
    pdfFile: 'Calendario-ESDE-I-2026.pdf',
    heading: 'ESDE I — Roteiro de Aulas',
  },
  ESDE_II: {
    code: 'ESDE_II',
    title: 'Calendário ESDE II — 2026',
    subtitle: 'Estudo Sistematizado da Doutrina Espírita',
    pdfTitle: 'Calendario ESDE II - 2026',
    pdfFile: 'Calendario-ESDE-II-2026.pdf',
    heading: 'ESDE II — Roteiro de Aulas',
  },
};

export default function EsdeCalendar() {
  const navigate = useNavigate();
  const { code } = useParams<{ code?: string }>();
  const courseCode = code && COURSES[code.toUpperCase()] ? code.toUpperCase() : 'ESDE_I';
  const meta = COURSES[courseCode];
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('esde_calendar_entries')
        .select('*')
        .eq('course_code', courseCode)
        .order('sort_order', { ascending: true });

      if (data) {
        setAulas(
          data.map((d: any) => ({
            data: d.date_label,
            roteiro: d.roteiro,
            tema: d.tema,
            modulo: d.modulo,
            facilitador: d.facilitador,
            tipo: d.tipo as Aula['tipo'],
          }))
        );
      }
      setLoading(false);
    })();
  }, [courseCode]);

  const handleGeneratePDF = () => {
    const doc = new jsPDF();

    const moduloPdfColors: Record<string, { bg: [number, number, number]; text: [number, number, number]; border: [number, number, number] }> = {
      'Módulo I':   { bg: [220, 238, 250], text: [33, 118, 174], border: [33, 118, 174] },
      'Módulo II':  { bg: [252, 240, 218], text: [200, 150, 50], border: [232, 184, 75] },
      'Módulo III': { bg: [218, 245, 234], text: [40, 140, 100], border: [40, 160, 110] },
      'Módulo IV':  { bg: [255, 243, 218], text: [180, 130, 40], border: [210, 160, 50] },
      'Módulo V':   { bg: [250, 225, 222], text: [180, 60, 50],  border: [190, 65, 55] },
      'Módulo VI':  { bg: [220, 238, 250], text: [33, 118, 174], border: [33, 118, 174] },
      'Módulo VII': { bg: [252, 240, 218], text: [200, 150, 50], border: [232, 184, 75] },
      'Módulo VIII':{ bg: [218, 245, 234], text: [40, 140, 100], border: [40, 160, 110] },
    };

    doc.setFontSize(18);
    doc.setTextColor(33, 118, 174);
    doc.text(meta.pdfTitle, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text('Lar de Seu Luiz - Secretaria de Formacao', 105, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Quintas-feiras | 19h30 as 21h00 | Online', 105, 35, { align: 'center' });

    const tableData = aulas.map((aula) => {
      const isSpecial = aula.tipo === 'feriado' || aula.tipo === 'recesso';
      const isExtra = aula.tipo === 'extra';
      return [
        aula.data,
        isSpecial ? '-' : (isExtra ? 'Extra' : aula.roteiro),
        isSpecial
          ? (aula.tipo === 'feriado' ? `Feriado - ${aula.roteiro}` : 'Recesso')
          : (isExtra ? (aula.tema || 'Encontro Extra') : aula.tema),
        aula.modulo || '-',
        aula.facilitador || '-',
      ];
    });

    autoTable(doc, {
      startY: 42,
      head: [['Data', 'No', 'Tema', 'Modulo', 'Facilitador(a)']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
      headStyles: { fillColor: [33, 118, 174], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 88 },
        3: { cellWidth: 28 },
        4: { cellWidth: 32 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const aula = aulas[data.row.index];
        if (!aula) return;
        const isSpecial = aula.tipo === 'feriado' || aula.tipo === 'recesso';
        const isExtra = aula.tipo === 'extra';
        if (isSpecial) {
          data.cell.styles.fillColor = [235, 235, 235];
          data.cell.styles.textColor = [140, 140, 140];
          data.cell.styles.fontStyle = 'italic';
          return;
        }
        if (isExtra) {
          data.cell.styles.fillColor = [245, 235, 255];
          data.cell.styles.textColor = [110, 80, 160];
          data.cell.styles.fontStyle = 'bold';
          return;
        }
        const colors = aula.modulo ? moduloPdfColors[aula.modulo] : null;
        if (colors) {
          data.cell.styles.fillColor = colors.bg;
          if (data.column.index === 3) {
            data.cell.styles.textColor = colors.text;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    doc.save(meta.pdfFile);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/10 border-b border-border">
        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 sm:mb-4">
              <div className="inline-flex p-2 rounded-xl bg-card border border-border shadow-lg">
                <img src={logo} alt="Logo Lar de Seu Luiz" className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mb-1 sm:mb-2">
              {meta.title}
            </h1>
            <p className="text-base sm:text-lg text-primary font-medium mb-1">
              {meta.subtitle}
            </p>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
              Lar de Seu Luiz - Secretaria de Formação
            </p>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 border border-border text-xs sm:text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">Quintas-feiras</span>
              </div>
              <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 border border-border text-xs sm:text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">19h30 às 21h00</span>
              </div>
              <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 border border-border text-xs sm:text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">Online</span>
              </div>
            </div>

            <Button onClick={handleGeneratePDF} size="lg" className="mb-2 gap-2" disabled={loading || aulas.length === 0}>
              <FileDown className="h-5 w-5" />
              Baixar PDF do Calendário
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {meta.heading}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Mobile: card layout */}
            <div className="flex flex-col gap-2 md:hidden">
              {aulas.map((aula, index) => {
                const isSpecial = aula.tipo === 'feriado' || aula.tipo === 'recesso';
                const isExtra = aula.tipo === 'extra';
                const isEven = index % 2 === 0;
                return (
                  <div
                    key={index}
                    className={`rounded-lg border border-border p-3 ${
                      isSpecial ? 'bg-muted'
                      : isExtra ? 'bg-purple-50 dark:bg-purple-950/20 border-l-4 border-l-purple-500'
                      : isEven ? 'bg-card' : 'bg-muted/60'
                    } ${!isExtra && aula.modulo ? moduloBorderLeft[aula.modulo] || '' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{aula.data}</span>
                      {aula.modulo && !isExtra && (
                        <Badge variant="outline" className={`text-[10px] ${moduloColors[aula.modulo] || ''}`}>
                          {aula.modulo}
                        </Badge>
                      )}
                      {isExtra && (
                        <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300">
                          Extra
                        </Badge>
                      )}
                    </div>
                    {isSpecial ? (
                      <p className="text-sm text-muted-foreground italic">
                        {aula.tipo === 'feriado' ? `Feriado — ${aula.roteiro}` : 'Recesso'}
                      </p>
                    ) : isExtra ? (
                      <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                        {aula.tema || 'Encontro Extra'}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground leading-snug">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mr-1.5 align-middle">
                            {aula.roteiro}
                          </span>
                          {aula.tema || (aula.tipo === 'encerramento' ? 'Encerramento' : '')}
                        </p>
                        {aula.facilitador && (
                          <p className="text-xs text-muted-foreground mt-1">{aula.facilitador}</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: table layout */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[100px]">Data</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-[60px]">Nº</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tema</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[130px]">Módulo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[150px]">Facilitador(a)</th>
                  </tr>
                </thead>
                <tbody>
                  {aulas.map((aula, index) => {
                    const isSpecial = aula.tipo === 'feriado' || aula.tipo === 'recesso';
                    const isExtra = aula.tipo === 'extra';
                    const isEven = index % 2 === 0;
                    return (
                      <tr
                        key={index}
                        className={`border-b border-border last:border-0 ${
                          isSpecial ? 'bg-muted'
                          : isExtra ? 'bg-purple-50 dark:bg-purple-950/20 border-l-4 border-l-purple-500'
                          : isEven ? 'bg-card' : 'bg-muted/60'
                        } ${!isExtra && aula.modulo ? moduloBorderLeft[aula.modulo] || '' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium">{aula.data}</td>
                        <td className="px-4 py-3 text-center">
                          {isExtra ? (
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300">
                              Extra
                            </Badge>
                          ) : aula.tipo === 'aula' || aula.tipo === 'encerramento' ? (
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                              {aula.roteiro}
                            </span>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{aula.roteiro}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isSpecial ? (
                            <span className="text-muted-foreground italic">
                              {aula.tipo === 'feriado' ? 'Feriado' : 'Recesso'}
                            </span>
                          ) : isExtra ? (
                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                              {aula.tema || 'Encontro Extra'}
                            </span>
                          ) : aula.tipo === 'encerramento' ? (
                            <span className="font-medium text-primary">{aula.tema}</span>
                          ) : (
                            aula.tema
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {aula.modulo && !isExtra && (
                            <Badge variant="outline" className={moduloColors[aula.modulo] || ''}>
                              {aula.modulo}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{aula.facilitador}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
            Voltar para o início
          </Button>
        </div>
      </div>

      <footer className="py-6 px-4 border-t border-border bg-card/80">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          <p>© 2025 Lar de Seu Luiz - Secretaria de Formação. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
