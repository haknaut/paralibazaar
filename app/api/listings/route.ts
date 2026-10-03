import { NextResponse } from 'next/server';
import { CROP_TYPES, DISTRICT_KEYS, SUPPLY_TYPES, type CropType, type SupplyType } from '@/lib/constants';
import { addListing, listAll } from '@/lib/store';
import type { FarmerListing } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PHONE_RE = /^(?:91)?[6-9]\d{9}$/;

function cleanPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** True only for a calendar-real yyyy-mm-dd (rejects 2026-99-99, 2026-01-32). */
function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const district = url.searchParams.get('district');
  const minAcres = Number(url.searchParams.get('minAcres') ?? '0');
  const crop = url.searchParams.get('crop');
  const readyWithinDays = Number(url.searchParams.get('readyWithinDays') ?? '0');
  const status = url.searchParams.get('status');
  const q = url.searchParams.get('q')?.trim().toLowerCase();

  const now = Date.now();
  const cutoff = readyWithinDays > 0 ? now + readyWithinDays * 24 * 60 * 60 * 1000 : Infinity;

  const results = listAll().filter((listing) => {
    if (district && listing.district !== district) return false;
    if (Number.isFinite(minAcres) && minAcres > 0 && listing.acres < minAcres) return false;
    if (crop && listing.crop !== crop) return false;
    if (status && listing.status !== status) return false;
    if (cutoff !== Infinity) {
      // Punjab civil date, pinned to IST: without the offset a UTC server
      // reads end-of-day 5.5h into the next day and the cutoff drifts.
      const ready = new Date(`${listing.readyDate}T23:59:59+05:30`).getTime();
      if (ready > cutoff) return false;
    }
    if (q) {
      const haystack = `${listing.farmerName} ${listing.village} ${listing.district}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return NextResponse.json({ listings: results, count: results.length });
}

export async function POST(request: Request) {
  let body: Partial<FarmerListing>;
  try {
    body = (await request.json()) as Partial<FarmerListing>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const errors: string[] = [];
  const name = String(body.farmerName ?? '').trim();
  const village = String(body.village ?? '').trim();
  const district = String(body.district ?? '').trim();
  const phone = cleanPhone(String(body.phone ?? ''));
  const acres = Number(body.acres);
  const readyDate = String(body.readyDate ?? '');
  const asking = Number(body.askingPrice);

  if (!name || !village || !district) errors.push('missing name, village or district');
  if (!DISTRICT_KEYS.includes(district)) errors.push('unknown district');
  if (!Number.isFinite(acres) || acres <= 0 || acres > 500) errors.push('acres out of range');
  if (!CROP_TYPES.includes(body.crop as CropType)) errors.push('unknown crop');
  if (!SUPPLY_TYPES.includes(body.supply as SupplyType)) errors.push('unknown supply type');
  // The shape check alone accepts 2026-99-99; confirm it is a real date.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(readyDate) || !isRealDate(readyDate)) {
    errors.push('bad ready date');
  }
  if (!PHONE_RE.test(phone)) errors.push('bad phone number');
  if (body.askingPrice !== undefined && (!Number.isFinite(asking) || asking <= 0)) {
    errors.push('bad asking price');
  }

  if (errors.length) {
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  const listing = addListing({
    farmerName: name,
    village,
    district,
    acres: Math.round(acres * 10) / 10,
    crop: body.crop as CropType,
    supply: body.supply as SupplyType,
    readyDate,
    phone,
    askingPrice: body.askingPrice === undefined ? 1400 : asking,
  });

  return NextResponse.json({ listing }, { status: 201 });
}
