import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StudyLineIconsProps {
  studyLines: string[] | null;
  size?: 'sm' | 'md';
}

export function StudyLineIcons({ studyLines, size = 'sm' }: StudyLineIconsProps) {
  if (!studyLines || studyLines.length === 0) return null;

  const textSize = size === 'sm' ? 'text-sm' : 'text-base';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {studyLines.includes('espirita') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={textSize}>🙏</span>
            </TooltipTrigger>
            <TooltipContent>Espírita</TooltipContent>
          </Tooltip>
        )}
        {studyLines.includes('umbanda') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={textSize}>🕯️</span>
            </TooltipTrigger>
            <TooltipContent>Umbanda</TooltipContent>
          </Tooltip>
        )}
        {studyLines.includes('espiritualista') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Sparkles className={`${iconSize} text-violet-500`} />
            </TooltipTrigger>
            <TooltipContent>Espiritualista</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export function getStudyLineLabel(line: string): string {
  switch (line) {
    case 'espirita': return 'Espírita';
    case 'umbanda': return 'Umbanda';
    case 'espiritualista': return 'Espiritualista';
    default: return line;
  }
}

export function getCategoryLabel(category: string | null): string {
  switch (category) {
    case 'formacoes': return 'Formação Contínua';
    case 'cursos_extras': return 'Curso Extra';
    case 'materiais': return 'Material';
    default: return '';
  }
}

export function getCategoryIcon(category: string | null): string {
  switch (category) {
    case 'formacoes': return '📚';
    case 'cursos_extras': return '🎓';
    case 'materiais': return '📖';
    default: return '📚';
  }
}
