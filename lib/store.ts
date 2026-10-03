import {
  CO2_TONNES_PER_TONNE_BURNED,
  CO2_AVOIDED_FACTOR,
  districtCenter,
  estimateCo2Avoided,
  estimatePm25,
  estimateTonnes,
  type ListingStatus,
} from './constants';
import { SEED_BUYERS, SEED_HOTSPOTS, SEED_LISTINGS } from '@/data/seed';
import type { Buyer, FarmerListing, Hotspot, ImpactTotals, TrendPoint } from './types';

/**
 * A deliberately simple in-memory store.
 *
 * There is no database: the arrays below are seeded once per server process and
 * kept in `globalThis` so they survive Next.js hot reloads during the demo.
 * Restarting `npm run dev` resets everything back to the seed.
 */

type Store = {
  listings: FarmerListing[];
  buyers: Buyer[];
  hotspots: Hotspot[];
  counter: number;
};

const GLOBAL_KEY = Symbol.for('paralibazaar.store');

function buildSeedListings(): FarmerListing[] {
  // Seed rows already carry a jittered pin; only fall back to the district
  // centroid if one is missing so a map never stacks every pin on one pixel.
  return SEED_LISTINGS.map((listing) => {
    if (Number.isFinite(listing.lat) && Number.isFinite(listing.lng) && listing.lat !== 0) {
      // Copy: status updates mutate store rows in place, and without this the
      // exported seed constant would be permanently altered, so a reset would
      // rebuild from already-modified data instead of the original pipeline.
      return { ...listing };
    }
    const center = districtCenter(listing.district);
    return { ...listing, lat: center.lat, lng: center.lng };
  });
}

function createStore(): Store {
  return {
    listings: buildSeedListings(),
    buyers: [...SEED_BUYERS],
    hotspots: [...SEED_HOTSPOTS],
    counter: SEED_LISTINGS.length,
  };
}

function getStore(): Store {
  const g = globalThis as unknown as Record<symbol, Store | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = createStore();
  return g[GLOBAL_KEY]!;
}

export function listAll(): FarmerListing[] {
  return getStore().listings;
}

export function listBuyers(): Buyer[] {
  return getStore().buyers;
}

export function listHotspots(): Hotspot[] {
  return getStore().hotspots;
}

export function findListing(id: string): FarmerListing | undefined {
  return getStore().listings.find((l) => l.id === id);
}

export function nextId(): string {
  const store = getStore();
  store.counter += 1;
  return `l-${Date.now().toString(36)}-${store.counter}`;
}

export function addListing(
  input: Omit<FarmerListing, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'lat' | 'lng'> &
    Partial<Pick<FarmerListing, 'lat' | 'lng'>>,
): FarmerListing {
  const store = getStore();
  const center = districtCenter(input.district);
  // Random offset so a new pin is visibly its own parcel on the map.
  const lat = input.lat ?? center.lat + (Math.random() - 0.5) * 0.24;
  const lng = input.lng ?? center.lng + (Math.random() - 0.5) * 0.24;
  const nowIso = new Date().toISOString();
  const listing: FarmerListing = {
    ...input,
    id: nextId(),
    lat,
    lng,
    status: 'open',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  store.listings.unshift(listing);
  return listing;
}

export function updateListingStatus(
  id: string,
  patch: Partial<Pick<FarmerListing, 'status' | 'offerPrice' | 'buyerId'>>,
): FarmerListing | undefined {
  const listing = findListing(id);
  if (!listing) return undefined;
  if (patch.status) listing.status = patch.status;
  if (patch.offerPrice !== undefined) listing.offerPrice = patch.offerPrice;
  if (patch.buyerId !== undefined) listing.buyerId = patch.buyerId;
  listing.updatedAt = new Date().toISOString();
  return listing;
}

export function resetStore(): void {
  (globalThis as unknown as Record<symbol, Store | undefined>)[GLOBAL_KEY] = createStore();
}

/* ------------------------------------------------------------------ *
 * IMPACT AGGREGATION
 * ------------------------------------------------------------------ */

const COLLECTED: ListingStatus = 'collected';

export function computeImpact(listings = listAll(), buyers = listBuyers()): ImpactTotals {
  let tonnesDiverted = 0;
  let rupeesEarned = 0;
  let collected = 0;
  let activeListings = 0;

  for (const listing of listings) {
    const tonnes = estimateTonnes(listing.acres);
    if (listing.status === COLLECTED) {
      // Only straw that was actually picked up counts as diverted.
      tonnesDiverted += tonnes;
      rupeesEarned += Math.round(tonnes * (listing.offerPrice ?? listing.askingPrice));
      collected += 1;
    } else {
      activeListings += 1;
    }
  }

  const farmersHelped = new Set(
    listings.filter((l) => l.status === COLLECTED).map((l) => `${l.farmerName}|${l.village}`),
  ).size;

  return {
    tonnesDiverted: Math.round(tonnesDiverted * 10) / 10,
    co2Avoided: estimateCo2Avoided(tonnesDiverted),
    pm25Grams: estimatePm25(tonnesDiverted),
    rupeesEarned,
    listings: listings.length,
    activeListings,
    collected,
    farmersHelped,
    buyersOnboarded: buyers.length,
    districtCount: new Set(listings.map((l) => l.district)).size,
  };
}

/** Weekly buckets for the dashboard trend chart, oldest week first. */
export function computeTrend(listings = listAll(), weeks = 8): TrendPoint[] {
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const points: TrendPoint[] = [];

  for (let w = weeks - 1; w >= 0; w -= 1) {
    const start = now - (w + 1) * WEEK;
    const end = now - w * WEEK;
    let tonnes = 0;
    let pickups = 0;
    for (const listing of listings) {
      if (listing.status !== COLLECTED) continue;
      const t = new Date(listing.updatedAt).getTime();
      if (t >= start && t < end) {
        tonnes += estimateTonnes(listing.acres);
        pickups += 1;
      }
    }
    points.push({
      week: w === 0 ? 'Now' : `-${w}w`,
      tonnes: Math.round(tonnes * 10) / 10,
      co2: Math.round(tonnes * CO2_TONNES_PER_TONNE_BURNED * CO2_AVOIDED_FACTOR * 10) / 10,
      pickups,
    });
  }
  return points;
}

/** How many listings sit at each stage of the booking pipeline. */
export function computeStatusCounts(listings = listAll()): Record<ListingStatus, number> {
  const counts: Record<ListingStatus, number> = { open: 0, offer: 0, pickup: 0, collected: 0 };
  for (const listing of listings) counts[listing.status] += 1;
  return counts;
}

/** Tonnes and rupees split by district, for the dashboard's bar chart. */
export function computeByDistrict(listings = listAll()) {
  const rows = new Map<string, { tonnes: number; pickups: number }>();
  for (const listing of listings) {
    if (listing.status !== COLLECTED) continue;
    const row = rows.get(listing.district) ?? { tonnes: 0, pickups: 0 };
    row.tonnes += estimateTonnes(listing.acres);
    row.pickups += 1;
    rows.set(listing.district, row);
  }
  return [...rows.entries()]
    .map(([district, row]) => ({
      district,
      tonnes: Math.round(row.tonnes * 10) / 10,
      pickups: row.pickups,
    }))
    .sort((a, b) => b.tonnes - a.tonnes);
}
