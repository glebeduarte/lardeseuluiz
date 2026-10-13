import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MiniKPITone = 'primary' | 'teal' | 'accent' | 'success' | 'muted' | 'destructive';

// Cartão de indicador no padrão único: fundo branco, quadrado do ícone em tom suave e número em destaque.
const toneStyles: Record<MiniKPITone, { bg: string; iconBg: string; iconColor: string; valueColor: string; border: string }> = {
  primary: { bg: 'bg-card', iconBg: 'bg-primary/10', iconColor: 'text-primary', valueColor: 'text-foreground', border: 'border-border' },
  teal: { bg: 'bg-card', iconBg: 'bg-sky-100', iconColor: 'text-sky-800', valueColor: 'text-foreground', border: 'border-border' },
  accent: { bg: 'bg-card', iconBg: 'bg-accent/20', iconColor: 'text-accent-foreground', valueColor: 'text-foreground', border: 'border-border' },
  success: { bg: 'bg-card', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-800', valueColor: 'text-foreground', border: 'border-border' },
  muted: { bg: 'bg-card', iconBg: 'bg-muted', iconColor: 'text-muted-foreground', valueColor: 'text-foreground', border: 'border-border' },
  destructive: { bg: 'bg-card', iconBg: 'bg-destructive/10', iconColor: 'text-destructive', valueColor: 'text-destructive', border: 'border-border' },
};

interface MiniKPIProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: MiniKPITone;
  hint?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact KPI card for admin pages (lists/headers).
 * Lighter visual weight than the dashboard hero KPI but still color-coded.
 */
export function MiniKPI({ icon: Icon, label, value, tone = 'primary', hint, onClick, className }: MiniKPIProps) {
  const t = toneStyles[tone];
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        'group text-left w-full rounded-lg border p-4 transition-all duration-200',
        t.bg,
        t.border,
        interactive
          ? 'cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          : 'cursor-default',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn('h-11 w-11 rounded-lg flex items-center justify-center flex-shrink-0', t.iconBg)}>
          <Icon className={cn('h-[18px] w-[18px]', t.iconColor)} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-2xl font-bold leading-none tabular-nums', t.valueColor)}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {label}
          </p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</p>}
        </div>
      </div>
    </button>
  );
}
