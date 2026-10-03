import { NextResponse } from 'next/server';
import {
  MAX_OFFER_PER_TONNE,
  MIN_OFFER_PER_TONNE,
  STATUS_STEP,
  type ListingStatus,
} from '@/lib/constants';
import { findListing, listBuyers, updateListingStatus } from '@/lib/store';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** The booking pipeline. Each action moves the listing one step forward. */
const ACTION_TARGET: Record<string, ListingStatus> = {
  offer: 'offer',
  schedule: 'pickup',
  collect: 'collected',
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const listing = findListing(id);
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  return NextResponse.json({ listing });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const listing = findListing(id);
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  let body: { action?: string; offerPrice?: number; pickupDate?: string; buyerId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action ?? '';
  const nextStatus = ACTION_TARGET[action];
  if (!nextStatus) {
    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  }

  // One step forward only: replaying "offer" on a collected listing would
  // move it backwards and silently erase it from the impact totals.
  if (STATUS_STEP[nextStatus] !== STATUS_STEP[listing.status] + 1) {
    return NextResponse.json(
      { error: `Cannot move listing from ${listing.status} to ${nextStatus}` },
      { status: 400 },
    );
  }

  if (action === 'offer') {
    const price = Number(body.offerPrice);
    if (!Number.isFinite(price) || price < MIN_OFFER_PER_TONNE || price > MAX_OFFER_PER_TONNE) {
      return NextResponse.json(
        { error: `Offer must be between ₹${MIN_OFFER_PER_TONNE} and ₹${MAX_OFFER_PER_TONNE} per tonne` },
        { status: 400 },
      );
    }
  }

  // Pick the first onboarded buyer if the client did not name one.
  const buyerId = body.buyerId ?? listing.buyerId ?? listBuyers()[0]?.id;

  const updated = updateListingStatus(id, {
    status: nextStatus,
    offerPrice: action === 'offer' ? Math.round(Number(body.offerPrice)) : listing.offerPrice,
    buyerId,
  });

  return NextResponse.json({ listing: updated });
}
