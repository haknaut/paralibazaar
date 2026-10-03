import { Skeleton } from '@/components/States';

/** Shown while the next route's chunk loads, so a tab tap never looks dead. */
export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
