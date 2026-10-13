import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BatchImportProps {
  courseId: string;
  onImportComplete: () => void;
}

interface ParsedRow {
  moduleName: string;
  lessonName: string;
  lessonDescription?: string;
  videoUrl?: string;
}

interface ImportPreview {
  modules: {
    name: string;
    lessons: { name: string; description?: string; videoUrl?: string }[];
  }[];
}

export function BatchImport({ courseId, onImportComplete }: BatchImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const downloadTemplate = () => {
    const templateData = [
      ['Módulo', 'Aula', 'Descrição da Aula', 'URL do Vídeo (Google Drive)'],
      ['Módulo 1 - Introdução', 'Aula 1 - Boas-vindas', 'Descrição opcional da aula', 'https://drive.google.com/...'],
      ['Módulo 1 - Introdução', 'Aula 2 - Visão Geral', 'Outra descrição', ''],
      ['Módulo 2 - Fundamentos', 'Aula 1 - Conceitos Básicos', '', ''],
      ['Módulo 2 - Fundamentos', 'Aula 2 - Primeiros Passos', '', ''],
      ['Módulo 3 - Prática', 'Aula 1 - Exercício 1', '', ''],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Conteúdo');

    XLSX.writeFile(wb, 'template-importacao-curso.xlsx');
    toast({ title: 'Template baixado!' });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

        // Skip header row
        const rows = jsonData.slice(1).filter((row) => row[0] && row[1]);

        const parsedRows: ParsedRow[] = rows.map((row) => ({
          moduleName: String(row[0] || '').trim(),
          lessonName: String(row[1] || '').trim(),
          lessonDescription: row[2] ? String(row[2]).trim() : undefined,
          videoUrl: row[3] ? String(row[3]).trim() : undefined,
        }));

        // Group by module
        const modulesMap = new Map<string, { name: string; description?: string; videoUrl?: string }[]>();
        parsedRows.forEach((row) => {
          if (!modulesMap.has(row.moduleName)) {
            modulesMap.set(row.moduleName, []);
          }
          modulesMap.get(row.moduleName)!.push({
            name: row.lessonName,
            description: row.lessonDescription,
            videoUrl: row.videoUrl,
          });
        });

        const previewData: ImportPreview = {
          modules: Array.from(modulesMap.entries()).map(([name, lessons]) => ({
            name,
            lessons,
          })),
        };

        setPreview(previewData);
        setDialogOpen(true);
        setImportResult(null);
      } catch (error) {
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Verifique se o arquivo está no formato correto',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const executeImport = async () => {
    if (!preview) return;

    setImporting(true);

    try {
      // Get existing modules to determine order_index
      const { data: existingModules } = await supabase
        .from('modules')
        .select('order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: false })
        .limit(1);

      let moduleOrderIndex = existingModules?.[0]?.order_index ?? -1;

      for (const module of preview.modules) {
        moduleOrderIndex++;

        // Create module
        const { data: newModule, error: moduleError } = await supabase
          .from('modules')
          .insert({
            course_id: courseId,
            title: module.name,
            order_index: moduleOrderIndex,
          })
          .select()
          .single();

        if (moduleError) {
          throw new Error(`Erro ao criar módulo "${module.name}": ${moduleError.message}`);
        }

        // Create lessons for this module
        const lessonsToInsert = module.lessons.map((lesson, index) => ({
          module_id: newModule.id,
          title: lesson.name,
          description: lesson.description || null,
          video_url: lesson.videoUrl || null,
          order_index: index,
        }));

        const { error: lessonsError } = await supabase.from('lessons').insert(lessonsToInsert);

        if (lessonsError) {
          throw new Error(`Erro ao criar aulas do módulo "${module.name}": ${lessonsError.message}`);
        }
      }

      const totalModules = preview.modules.length;
      const totalLessons = preview.modules.reduce((sum, m) => sum + m.lessons.length, 0);

      setImportResult({
        success: true,
        message: `Importação concluída! ${totalModules} módulo(s) e ${totalLessons} aula(s) criados.`,
      });

      onImportComplete();
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setImporting(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setPreview(null);
    setImportResult(null);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Baixar Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Importar Planilha
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {importResult ? 'Resultado da Importação' : 'Pré-visualização da Importação'}
            </DialogTitle>
            <DialogDescription>
              {importResult
                ? 'Veja o resultado da importação abaixo'
                : 'Revise o conteúdo antes de confirmar a importação'}
            </DialogDescription>
          </DialogHeader>

          {importResult ? (
            <div
              className={`flex items-center gap-3 p-4 rounded-lg ${
                importResult.success ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {importResult.success ? (
                <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-6 w-6 flex-shrink-0" />
              )}
              <p>{importResult.message}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-4">
                {preview?.modules.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="border border-border rounded-lg p-4">
                    <h4 className="font-semibold text-primary mb-2">
                      Módulo {moduleIndex + 1}: {module.name}
                    </h4>
                    <ul className="space-y-1 ml-4">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <li key={lessonIndex} className="text-sm text-muted-foreground">
                          {lessonIndex + 1}. {lesson.name}
                          {lesson.description && (
                            <span className="text-xs ml-2 opacity-70">({lesson.description})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            {importResult ? (
              <Button onClick={closeDialog}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={executeImport} disabled={importing}>
                  {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirmar Importação
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
