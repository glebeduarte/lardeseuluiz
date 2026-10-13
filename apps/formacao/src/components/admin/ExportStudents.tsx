import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Student {
  id: string;
  full_name: string;
  phone: string | null;
  user_type?: 'frequentador' | 'trabalhador';
  courses: {
    courseId: string;
    courseTitle: string;
  }[];
}

interface Course {
  id: string;
  title: string;
}

interface ExportStudentsProps {
  students: Student[];
  courses: Course[];
  defaultCourseFilter?: string;
}

type ExportFormat = 'pdf' | 'csv' | 'txt';
type ExportType = 'all' | 'by_course';
type UserTypeFilter = 'all' | 'frequentador' | 'trabalhador';

export function ExportStudents({ students, courses, defaultCourseFilter = 'all' }: ExportStudentsProps) {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportType, setExportType] = useState<ExportType>(defaultCourseFilter !== 'all' ? 'by_course' : 'all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(defaultCourseFilter !== 'all' ? defaultCourseFilter : '');
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (defaultCourseFilter !== 'all') {
      setExportType('by_course');
      setSelectedCourseId(defaultCourseFilter);
    } else {
      setExportType('all');
      setSelectedCourseId('');
    }
  }, [defaultCourseFilter]);

  const getFirstName = (fullName: string): string => fullName.split(' ')[0];

  const formatPhone = (phone: string | null): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55')) return digits;
    if (digits.startsWith('0')) return '55' + digits.substring(1);
    return '55' + digits;
  };

  const getStudentsToExport = (): Student[] => {
    let result = exportType === 'all'
      ? students
      : students.filter((s) => s.courses.some((c) => c.courseId === selectedCourseId));

    if (userTypeFilter !== 'all') {
      result = result.filter((s) => s.user_type === userTypeFilter);
    }

    return result;
  };

  const getStudentsWithPhone = (): Student[] => getStudentsToExport().filter((s) => s.phone);

  const getCourseName = (): string => {
    if (exportType === 'all') return 'Todos';
    const course = courses.find((c) => c.id === selectedCourseId);
    return course?.title || '';
  };

  const getTypeLabel = (): string => {
    if (userTypeFilter === 'frequentador') return '_Frequentadores';
    if (userTypeFilter === 'trabalhador') return '_Trabalhadores';
    return '';
  };

  const generatePDF = (studentsToExport: Student[]) => {
    const doc = new jsPDF();
    const title = exportType === 'all' ? 'Lista de Alunos' : `Alunos - ${getCourseName()}`;
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 30);
    doc.text(`Total de alunos: ${studentsToExport.length}`, 14, 36);
    if (userTypeFilter !== 'all') {
      doc.text(`Filtro: ${userTypeFilter === 'trabalhador' ? 'Trabalhadores' : 'Frequentadores'}`, 14, 42);
    }

    const tableData = studentsToExport.map((student) => [getFirstName(student.full_name), formatPhone(student.phone)]);
    autoTable(doc, {
      startY: userTypeFilter !== 'all' ? 48 : 42,
      head: [['Nome', 'Telefone']],
      body: tableData,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const fileName = `alunos${getTypeLabel()}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
  };

  const generateCSV = (studentsToExport: Student[]) => {
    const headers = ['Nome', 'Telefone'];
    const rows = studentsToExport.map((student) => [getFirstName(student.full_name), formatPhone(student.phone)]);
    const csvContent = [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';'))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alunos${getTypeLabel()}_${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateTXT = (studentsToExport: Student[]) => {
    const lines = studentsToExport.map((student) => `${getFirstName(student.full_name)}\t${formatPhone(student.phone)}`);
    const txtContent = lines.join('\n');
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alunos${getTypeLabel()}_${format(new Date(), 'yyyyMMdd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (exportType === 'by_course' && !selectedCourseId) return;
    setExporting(true);
    const studentsToExport = getStudentsToExport();
    try {
      switch (exportFormat) {
        case 'pdf': generatePDF(studentsToExport); break;
        case 'csv': generateCSV(studentsToExport); break;
        case 'txt': generateTXT(studentsToExport); break;
      }
      setOpen(false);
    } finally {
      setExporting(false);
    }
  };

  const canExport = exportType === 'all' || (exportType === 'by_course' && selectedCourseId);
  const totalStudents = getStudentsToExport().length;
  const studentsWithPhone = getStudentsWithPhone().length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Lista de Alunos</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Export Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Exportação</Label>
            <RadioGroup
              value={exportType}
              onValueChange={(value) => {
                setExportType(value as ExportType);
                if (value === 'all') setSelectedCourseId('');
              }}
              className="grid grid-cols-1 gap-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="font-medium">Lista completa</div>
                  <div className="text-sm text-muted-foreground">Todos os alunos com telefone cadastrado</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="by_course" id="by_course" />
                <Label htmlFor="by_course" className="flex-1 cursor-pointer">
                  <div className="font-medium">Por curso</div>
                  <div className="text-sm text-muted-foreground">Alunos matriculados em um curso específico</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Course Selection */}
          {exportType === 'by_course' && (
            <div className="space-y-2">
              <Label>Selecione o curso</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger><SelectValue placeholder="Escolha um curso" /></SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (<SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* User Type Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filtrar por tipo</Label>
            <Select value={userTypeFilter} onValueChange={(v) => setUserTypeFilter(v as UserTypeFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="frequentador">🔵 Frequentadores</SelectItem>
                <SelectItem value="trabalhador">🟢 Trabalhadores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant={exportFormat === 'pdf' ? 'default' : 'outline'} onClick={() => setExportFormat('pdf')} className="flex flex-col gap-1 h-auto py-3">
                <File className="h-5 w-5" /><span className="text-xs">PDF</span>
              </Button>
              <Button type="button" variant={exportFormat === 'csv' ? 'default' : 'outline'} onClick={() => setExportFormat('csv')} className="flex flex-col gap-1 h-auto py-3">
                <FileSpreadsheet className="h-5 w-5" /><span className="text-xs">CSV</span>
              </Button>
              <Button type="button" variant={exportFormat === 'txt' ? 'default' : 'outline'} onClick={() => setExportFormat('txt')} className="flex flex-col gap-1 h-auto py-3">
                <FileText className="h-5 w-5" /><span className="text-xs">TXT</span>
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Formato de saída: Primeiro Nome + Telefone (55XXXXXXXXXXX)</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalStudents} aluno{totalStudents !== 1 ? 's' : ''} 
              {studentsWithPhone > 0 && ` (${studentsWithPhone} com telefone)`}
            </p>
          </div>

          {/* Export Button */}
          <Button onClick={handleExport} disabled={!canExport || exporting || totalStudents === 0} className="w-full gradient-primary">
            {exporting ? 'Exportando...' : 'Exportar Lista'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
