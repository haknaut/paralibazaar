'use client';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { OSM_ATTRIBUTION, OSM_TILE_URL, PUNJAB_CENTER, PUNJAB_ZOOM } from '@/lib/constants';
import { boundsOfPoints, type MapPoint } from './types';

/**
 * Price pin. Carbon keeps map markers square with a 1px white keyline and no
 * drop shadow; status is carried by the fill, drawn from the semantic ramp.
 */
function listingIcon(badge: string, status: 'open' | 'pending' | 'collected') {
  const bg = status === 'collected' ? '#8c8c8c' : status === 'pending' ? '#002d9c' : '#0f62fe';
  return L.divIcon({
    className: 'parali-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:${bg};border:1px solid #fff;color:#fff;font:600 10px/1 'Google Sans',Helvetica,Arial,sans-serif;white-space:nowrap;">${badge}</span>`,
  });
}

/** Red square with a pulsing heat halo — unmistakably "fire". */
function hotspotIcon(intensity: number) {
  const size = 18 + intensity * 20;
  const opacity = 0.22 + intensity * 0.33;
  return L.divIcon({
    className: 'parali-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px;">
      <span class="fire-ping" style="position:absolute;inset:0;background:#da1e28;opacity:${opacity.toFixed(2)};"></span>
      <span style="position:absolute;inset:${(size * 0.32).toFixed(1)}px;background:#da1e28;border:1px solid #fff;"></span>
    </span>`,
  });
}

/** Moves the viewport when the user picks something from the list. */
function ViewportController({
  points,
  fitToPoints,
  centre,
  zoom,
}: {
  points: MapPoint[];
  fitToPoints: boolean;
  centre?: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (centre) {
      map.flyTo(centre, zoom, { duration: 0.6 });
      return;
    }
    if (!fitToPoints || points.length === 0) return;
    const bounds = boundsOfPoints(points);
    if (!bounds) return;
    if (points.length === 1) {
      map.flyTo([points[0].lat, points[0].lng], Math.max(zoom, 11), { duration: 0.6 });
      return;
    }
    map.flyToBounds(L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]), {
      padding: [40, 40],
      duration: 0.6,
    });
  }, [map, points, fitToPoints, centre, zoom]);

  return null;
}

/** Statuses drive pin colour, so the map matches the list at a glance. */
function statusTone(status: string): 'open' | 'pending' | 'collected' {
  if (status === 'collected') return 'collected';
  if (status === 'open') return 'open';
  return 'pending';
}

/**
 * The actual Leaflet map. This module is only ever imported in the browser —
 * `LeafletMap.tsx` loads it through `next/dynamic({ ssr: false })`.
 */
export default function MapCanvas({
  points,
  statusById = {},
  centre,
  zoom = PUNJAB_ZOOM,
  fitToPoints = false,
  selectedId,
  onSelect,
  className = 'h-full w-full',
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
  const markers = useMemo(
    () =>
      points.map((point) => {
        const intensity = point.tone === 'hotspot' ? 0.5 : 0;
        const icon =
          point.tone === 'hotspot'
            ? hotspotIcon(intensity)
            : listingIcon(point.badge, statusTone(statusById[point.id] ?? 'open'));
        return { point, icon };
      }),
    [points, statusById],
  );

  return (
    <MapContainer
      center={centre ?? PUNJAB_CENTER}
      zoom={zoom}
      scrollWheelZoom={false}
      zoomControl
      className={className}
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={18} />
      <ViewportController points={points} fitToPoints={fitToPoints} centre={centre} zoom={zoom} />
      {markers.map(({ point, icon }) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={icon}
          zIndexOffset={point.id === selectedId ? 1000 : 0}
          eventHandlers={onSelect ? { click: () => onSelect(point.id) } : undefined}
        >
          {point.subtitle && (
            <Popup>
              <p className="font-bold text-ink">{point.title}</p>
              <p className="mt-0.5 text-ink-muted">{point.subtitle}</p>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
