import { NextResponse } from 'next/server';
import { DEFAULT_PRICE_PER_TONNE, estimateTonnes } from '@/lib/constants';
import { distanceKm } from '@/lib/format';
import { listAll } from '@/lib/store';
import type { FarmerListing } from '@/lib/types';

export const dynamic = 'force-dynamic';

const NEARBY_RADIUS_KM = 25;

/**
 * `Number(null)` and `Number('')` are both 0, which is a perfectly finite
 * number — so a missing lat/lng would silently become a point in the Gulf of
 * Guinea. Treat blank and non-numeric input as "not supplied".
 */
function coord(value: unknown, bound = 90): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= bound ? n : undefined;
}

type AlertRow = {
  listing: FarmerListing;
  distanceKm: number;
};

function findNearby(lat: number, lng: number, radiusKm: number): AlertRow[] {
  return listAll()
    .map((listing) => ({ listing, distanceKm: distanceKm({ lat, lng }, listing) }))
    .filter((row) => row.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 10);
}

/** GET /api/alerts?lat=..&lng=..&radius=25 — who is near this fire. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = coord(url.searchParams.get('lat'));
  const lng = coord(url.searchParams.get('lng'), 180);
  if (lat === undefined || lng === undefined) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const radius = Number(url.searchParams.get('radius') ?? NEARBY_RADIUS_KM) || NEARBY_RADIUS_KM;
  const nearby = findNearby(lat, lng, radius);

  return NextResponse.json({
    listings: nearby.map((row) => row.listing),
    distances: Object.fromEntries(nearby.map((row) => [row.listing.id, row.distanceKm])),
    count: nearby.length,
    radiusKm: radius,
  });
}

/** POST /api/alerts — simulate sending an SMS to nearby farmers. */
export async function POST(request: Request) {
  let body: { lat?: number; lng?: number; pricePerAcre?: number; radiusKm?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const lat = coord(body.lat);
  const lng = coord(body.lng, 180);
  if (lat === undefined || lng === undefined) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  // Price is quoted per acre on the alert because that is how farmers think.
  // One acre ≈ 2.5 t, so scale the per-tonne market rate down by 60% — a
  // headline number that stays honest once the buyer takes a delivery margin.
  // Math.max does not sanitise NaN, so guard it or the SMS reads ₹NaN/acre.
  const rawPrice = Number(body.pricePerAcre ?? DEFAULT_PRICE_PER_TONNE * 0.6);
  const pricePerAcre = Math.max(200, Number.isFinite(rawPrice) ? Math.round(rawPrice) : 840);
  const radius = Number(body.radiusKm ?? NEARBY_RADIUS_KM) || NEARBY_RADIUS_KM;
  const nearby = findNearby(lat, lng, radius);

  const recipients = nearby.map((row) => ({
    name: row.listing.farmerName,
    village: row.listing.village,
    phone: row.listing.phone,
    distanceKm: row.distanceKm,
    tonnesIfSold: estimateTonnes(row.listing.acres),
    payoutIfSold: Math.round(estimateTonnes(row.listing.acres) * (pricePerAcre / 2.5)),
  }));

  const message = `ParaliBazaar: A buyer near ${nearby[0]?.listing.village ?? 'you'} will pay ₹${pricePerAcre}/acre for your parali. Free pickup within 2 days. Call to post your load.`;

  return NextResponse.json({
    sent: recipients.length,
    pricePerAcre,
    radiusKm: radius,
    message,
    recipients,
    simulated: true,
  });
}
