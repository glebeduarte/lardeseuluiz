import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MiniKPITone = 'primary' | 'teal' | 'accent' | 'success' | 'muted' | 'destructive';

const toneStyles: Record<MiniKPITone, { bg: string; iconBg: string; iconColor: string; valueColor: string; border: string }> = {
  primary: {
    bg: 'bg-gradient-to-br from-blue-lt to-card',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    valueColor: 'text-primary',
    border: 'border-primary/20',
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-lt to-card',
    iconBg: 'bg-teal/15',
    iconColor: 'text-teal',
    valueColor: 'text-teal',
    border: 'border-teal/20',
  },
  accent: {
    bg: 'bg-gradient-to-br from-accent/10 to-card',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    valueColor: 'text-accent',
    border: 'border-accent/25',
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-50 to-card dark:from-emerald-950/20',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
  },
  muted: {
    bg: 'bg-gradient-to-br from-muted/40 to-card',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    valueColor: 'text-foreground',
    border: 'border-border',
  },
  destructive: {
    bg: 'bg-gradient-to-br from-destructive/10 to-card',
    iconBg: 'bg-destructive/15',
    iconColor: 'text-destructive',
    valueColor: 'text-destructive',
    border: 'border-destructive/20',
  },
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
        'group text-left w-full rounded-xl border p-3 sm:p-4 transition-all duration-200',
        t.bg,
        t.border,
        interactive
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          : 'cursor-default',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', t.iconBg)}>
          <Icon className={cn('h-[18px] w-[18px]', t.iconColor)} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[22px] sm:text-[24px] font-display font-bold leading-none tabular-nums', t.valueColor)}>
            {value}
          </p>
          <p className="text-[11px] uppercase tracking-[0.07em] text-muted-foreground font-semibold mt-1 truncate">
            {label}
          </p>
          {hint && <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{hint}</p>}
        </div>
      </div>
    </button>
  );
}
