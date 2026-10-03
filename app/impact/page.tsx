import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/States';

/**
 * The charts pull in recharts (~110 kB) — the heaviest dependency on the
 * site. Loading the dashboard dynamically keeps it out of the initial bundle
 * so every tab switch stays snappy; the skeleton covers the split second.
 */
const ImpactDashboard = dynamic(
  () => import('@/components/ImpactDashboard').then((m) => m.ImpactDashboard),
  {
    loading: () => (
      <div className="space-y-4" role="status" aria-live="polite">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    ),
  },
);

export default function ImpactPage() {
  return <ImpactDashboard />;
}
