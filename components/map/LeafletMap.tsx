'use client';

import dynamic from 'next/dynamic';
import { PUNJAB_ZOOM } from '@/lib/constants';
import type { MapPoint } from './types';

/**
 * Every map on the site goes through this shell.
 *
 * Leaflet needs `window`, so the real canvas is pulled in with
 * `next/dynamic` + `ssr: false`; the page shows a skeleton until it lands.
 * This is the only place that knows about the lazy-load dance.
 */
const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full">
      <div className="shimmer h-full w-full rounded-none" />
    </div>
  ),
});

export function LeafletMap({
  points,
  statusById,
  centre,
  zoom = PUNJAB_ZOOM,
  fitToPoints = false,
  selectedId,
  onSelect,
  className = 'h-72 w-full',
}: {
  points: MapPoint[];
  statusById?: Record<string, string>;
  centre?: [number, number];
  zoom?: number;
  fitToPoints?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-none ${className}`}>
      <MapCanvas
        points={points}
        statusById={statusById}
        centre={centre}
        zoom={zoom}
        fitToPoints={fitToPoints}
        selectedId={selectedId}
        onSelect={onSelect}
        className="h-full w-full"
      />
    </div>
  );
}
