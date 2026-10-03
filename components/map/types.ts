import type { FarmerListing, Hotspot } from '@/lib/types';

/** Everything the map needs to draw one pin, with no Leaflet knowledge. */
export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  /** Short label drawn inside the pin, e.g. "₹1.5k" or "12". */
  badge: string;
  title: string;
  subtitle: string;
  tone: 'listing' | 'hotspot';
  onClick?: () => void;
};

export type MapBounds = { south: number; west: number; north: number; east: number };

/** Fit the viewport to the points currently visible, with sensible padding. */
export function boundsOfPoints(points: MapPoint[]): MapBounds | null {
  if (points.length === 0) return null;
  let south = points[0].lat;
  let north = points[0].lat;
  let west = points[0].lng;
  let east = points[0].lng;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return { south, west, north, east };
}

export function toListingPoint(
  listing: FarmerListing,
  labels: { acres: string; asking: string; price: string },
): MapPoint {
  return {
    id: listing.id,
    lat: listing.lat,
    lng: listing.lng,
    badge: `₹${(listing.askingPrice / 1000).toFixed(1)}k`,
    title: `${listing.farmerName} · ${listing.village}`,
    subtitle: `${listing.acres} ${labels.acres} · ${labels.asking} ${labels.price}/t`,
    tone: 'listing',
  };
}

export function toHotspotPoint(hotspot: Hotspot, label: string): MapPoint {
  return {
    id: hotspot.id,
    lat: hotspot.lat,
    lng: hotspot.lng,
    badge: '',
    title: label,
    subtitle: '',
    tone: 'hotspot',
  };
}
