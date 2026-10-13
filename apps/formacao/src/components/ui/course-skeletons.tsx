import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for a horizontal course list row (mobile-first).
 * Matches the visual rhythm of the course list items used in the
 * dashboard and explore pages.
 */
export function CourseListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-2.5 shadow-card">
      <Skeleton className="h-[68px] w-[68px] rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-1 w-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a 4:5 portrait course card used in grids.
 */
export function CourseCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-border/50">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-full mt-1" />
      </div>
    </div>
  );
}

/**
 * Responsive skeleton group: list on mobile, grid on sm+.
 * Drop-in replacement for inline loading divs.
 */
export function CoursesLoadingSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      <div className="flex flex-col gap-2.5 sm:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <CourseListItemSkeleton key={i} />
        ))}
      </div>
      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
        {Array.from({ length: count + 1 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

/**
 * Skeleton for an announcement card row.
 */
export function AnnouncementSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
