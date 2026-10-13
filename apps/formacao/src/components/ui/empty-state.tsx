import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Visual variant: 'card' wraps in a bordered card, 'plain' renders inline */
  variant?: 'card' | 'plain';
}

/**
 * Reusable, accessible empty state with an illustrated icon, title,
 * optional description and optional CTA. Used across student-facing
 * pages (dashboard, courses, announcements, etc.) to keep tone consistent.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'card',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-10 sm:py-14',
        variant === 'card' && 'bg-card border border-border rounded-2xl shadow-card',
        className,
      )}
    >
      <div
        className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
        aria-hidden="true"
      >
        <span className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
        <Icon className="relative h-9 w-9 text-primary" strokeWidth={1.6} />
      </div>
      <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
