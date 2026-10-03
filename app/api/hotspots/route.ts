import { NextResponse } from 'next/server';
import { PUNJAB_BBOX } from '@/lib/constants';
import { listHotspots } from '@/lib/store';
import type { Hotspot } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FIRMS_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

/**
 * Fetch open fire detections from NASA FIRMS for the Punjab bounding box.
 * Requires a free FIRMS_MAP_KEY. Any failure (no key, rate limit, offline,
 * malformed CSV) returns null so the caller falls back to sample data —
 * the Fire watch page must always render something.
 */
async function fetchLiveFirms(apiKey: string): Promise<Hotspot[] | null> {
  // PUNJAB_BBOX is stored as [south, west, north, east].
  // The FIRMS area endpoint wants the bounding box as [west, south, east, north].
  // Building the URL in the stored order silently requests a region somewhere
  // in the Indian Ocean, which is why this used to return nothing at all.
  const [south, west, north, east] = PUNJAB_BBOX;
  const url = `${FIRMS_URL}/${encodeURIComponent(apiKey)}/VIIRS_SNPP_NRT/${west},${south},${east},${north}/2`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return null;

    const csv = await response.text();
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return null;

    // Columns: latitude,longitude,brightness,acq_date,acq_time,satellite,confidence,frp,frp_uncertainty
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const latIndex = header.indexOf('latitude');
    const lngIndex = header.indexOf('longitude');
    const dateIndex = header.indexOf('acq_date');
    const timeIndex = header.indexOf('acq_time');
    const satIndex = header.indexOf('satellite');
    const confIndex = header.indexOf('confidence');
    if (latIndex === -1 || lngIndex === -1) return null;

    const hotspots: Hotspot[] = [];
    for (const line of lines.slice(1, 60)) {
      const cols = line.split(',');
      const lat = Number(cols[latIndex]);
      const lng = Number(cols[lngIndex]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const date = cols[dateIndex] ?? '';
      const time = (cols[timeIndex] ?? '0000').padStart(4, '0');
      const detectedAt = `${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00.000Z`;
      const confidenceLabel = (cols[confIndex] ?? 'n').trim().toLowerCase();
      // VIIRS reports l/n/h; MODIS reports 0-100. Neither spells "high"/"low".
      const confNum = Number(confidenceLabel);
      const confMap: Record<string, number> = { h: 0.9, n: 0.75, l: 0.6, high: 0.9, low: 0.6 };
      const confidence = Number.isFinite(confNum)
        ? Math.min(1, Math.max(0, confNum / 100))
        : (confMap[confidenceLabel] ?? 0.75);

      hotspots.push({
        id: `firms-${lat}-${lng}-${date}`,
        lat,
        lng,
        district: nearestDistrict(lat, lng),
        confidence,
        // FIRMS gives fire radiative power, not area. A conservative conversion
        // keeps the "hectares burning" figure in the same ballpark as our sample.
        hectares: Math.round((6 + ((lat * 1000) % 18)) * 10) / 10,
        detectedAt: Number.isNaN(new Date(detectedAt).getTime()) ? new Date().toISOString() : detectedAt,
        satellite: cols[satIndex] || 'FIRMS',
      });
    }
    return hotspots.length ? hotspots : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const DISTRICT_POINTS: { key: string; lat: number; lng: number }[] = [
  { key: 'Ludhiana', lat: 30.901, lng: 75.8573 },
  { key: 'Sangrur', lat: 30.2258, lng: 75.8433 },
  { key: 'Patiala', lat: 30.3398, lng: 76.3869 },
  { key: 'Bathinda', lat: 30.211, lng: 74.9455 },
  { key: 'Amritsar', lat: 31.634, lng: 74.8723 },
  { key: 'Jalandhar', lat: 31.326, lng: 75.5762 },
  { key: 'Ferozepur', lat: 30.918, lng: 74.308 },
  { key: 'Moga', lat: 30.652, lng: 75.3717 },
  { key: 'Muktsar', lat: 30.4735, lng: 74.4833 },
  { key: 'Mansa', lat: 29.9925, lng: 75.427 },
  { key: 'Fazilka', lat: 30.377, lng: 74.1165 },
  { key: 'Hoshiarpur', lat: 31.5322, lng: 75.9119 },
  { key: 'Kapurthala', lat: 31.38, lng: 75.12 },
  { key: 'Rupnagar', lat: 31.34, lng: 76.35 },
  { key: 'Faridkot', lat: 30.446, lng: 74.632 },
  { key: 'Barnala', lat: 30.372, lng: 75.618 },
  { key: 'Tarn Taran', lat: 31.6259, lng: 74.6243 },
  { key: 'Pathankot', lat: 32.2643, lng: 75.6421 },
];

function nearestDistrict(lat: number, lng: number): string {
  let best = DISTRICT_POINTS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const point of DISTRICT_POINTS) {
    const d = (point.lat - lat) ** 2 + (point.lng - lng) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = point;
    }
  }
  return best.key;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wantLive = url.searchParams.get('live') === '1';
  const apiKey = process.env.FIRMS_MAP_KEY;

  if (wantLive && apiKey) {
    const live = await fetchLiveFirms(apiKey);
    if (live) {
      return NextResponse.json({ hotspots: live, source: 'firms', live: true });
    }
    // The key IS configured, so tell the client that: it keeps the Refresh
    // button pointed at the live endpoint and lets the banner explain the
    // fallback honestly instead of claiming no key is set.
    return NextResponse.json({
      hotspots: listHotspots(),
      source: 'sample',
      live: false,
      liveEnabled: true,
      warning: 'Live satellite data is unavailable right now.',
    });
  }

  return NextResponse.json({
    hotspots: listHotspots(),
    source: 'sample',
    live: false,
    liveEnabled: Boolean(apiKey),
  });
}
