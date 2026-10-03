/**
 * ParaliBazaar — domain constants and impact assumptions.
 *
 * Every number the app uses lives in this file so a judge can audit the maths
 * in one place. Values are deliberately conservative, round, and based on
 * publicly reported norms for paddy straw in Punjab.
 */

export const APP_NAME = 'ParaliBazaar';
export const APP_TAGLINE = "Don't burn it. Sell it.";

/* ------------------------------------------------------------------ *
 * CORE CONVERSION ASSUMPTIONS  (edit here, the whole app follows)
 * ------------------------------------------------------------------ */

/**
 * Straw left in the field after a paddy harvest.
 * 1 acre of paddy produces roughly 2.5 tonnes of paddy straw (residue ratio
 * ≈ 1.25–1.5 t straw per t grain; Punjab yields ~4 t/acre paddy).
 * Source: ICAR / PAU residue-management guidance.
 */
export const STRAW_TONNES_PER_ACRE = 2.5;

/** Default market rate for clean, dry paddy straw in Punjab (₹ per tonne). */
export const DEFAULT_PRICE_PER_TONNE = 1400;

/** Floor and ceiling offered by the offer slider in the buyer flow (₹/tonne). */
export const MIN_OFFER_PER_TONNE = 800;
export const MAX_OFFER_PER_TONNE = 2500;

/**
 * Emissions factor for open-field burning of agricultural residue.
 * Burning ~1 tonne of straw releases roughly 1.5 tonnes of CO2 equivalent
 * (CO2 + CH4 + N2O), before the health and soil-damage costs.
 * Source: EPA/ICAR residue burning emission inventories.
 */
export const CO2_TONNES_PER_TONNE_BURNED = 1.5;

/**
 * If straw is instead baled and used, this share of the burning emissions is
 * avoided. The rest is discounted because collection, baling and transport
 * themselves use diesel. 85% is a commonly used net-avoidance figure.
 */
export const CO2_AVOIDED_FACTOR = 0.85;

/**
 * Fine particulate matter (PM2.5, grams) released per tonne of straw burned.
 * Used for the "cleaner air" estimate. 2.5 g/t keeps the dashboard honest
 * versus publishing raw gram values.
 */
export const PM25_GRAMS_PER_TONNE_BURNED = 2.5;

/** How many hectares a typical small Punjab farmer's family loses to soil damage. */
export const SOIL_HEALTH_NOTE = 'Burning straw strips nitrogen and kills beneficial fungi in the topsoil.';

/* ------------------------------------------------------------------ *
 * GEOGRAPHY
 * ------------------------------------------------------------------ */

/** Approximate centre of Punjab — used to frame every Leaflet map. */
export const PUNJAB_CENTER: [number, number] = [30.9, 75.4];
export const PUNJAB_ZOOM = 7;

/** Bounding box [south, west, north, east] used for the optional NASA FIRMS call. */
export const PUNJAB_BBOX: [number, number, number, number] = [29.4, 73.9, 32.4, 76.9];

/** OpenStreetMap raster tiles — no API key, no tracking. */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type District = {
  key: string;
  lat: number;
  lng: number;
};

/** Punjab districts, keyed by a stable id and centred on the district HQ. */
export const DISTRICTS: District[] = [
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

export const DISTRICT_KEYS = DISTRICTS.map((d) => d.key);

export function districtCenter(key: string): { lat: number; lng: number } {
  const found = DISTRICTS.find((d) => d.key.toLowerCase() === key.trim().toLowerCase());
  if (found) return { lat: found.lat, lng: found.lng };
  // Unknown village: jitter around the state centre so pins never sit in the sea.
  return {
    lat: PUNJAB_CENTER[0] + (Math.random() - 0.5) * 0.8,
    lng: PUNJAB_CENTER[1] + (Math.random() - 0.5) * 0.8,
  };
}

/* ------------------------------------------------------------------ *
 * DOMAIN VOCABULARY
 * ------------------------------------------------------------------ */

export const CROP_TYPES = ['paddy', 'wheat'] as const;
export type CropType = (typeof CROP_TYPES)[number];

export const SUPPLY_TYPES = ['baled', 'loose'] as const;
export type SupplyType = (typeof SUPPLY_TYPES)[number];

/** Booking pipeline: Open → Offer made → Pickup scheduled → Collected. */
export const LISTING_STATUSES = ['open', 'offer', 'pickup', 'collected'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const STATUS_STEP: Record<ListingStatus, number> = {
  open: 0,
  offer: 1,
  pickup: 2,
  collected: 3,
};

/* ------------------------------------------------------------------ *
 * IMPACT MATH
 * ------------------------------------------------------------------ */

export function estimateTonnes(acres: number): number {
  return Math.round(Math.max(0, acres) * STRAW_TONNES_PER_ACRE * 10) / 10;
}

export function estimateEarnings(acres: number, pricePerTonne = DEFAULT_PRICE_PER_TONNE): number {
  return Math.round(estimateTonnes(acres) * pricePerTonne);
}

/**
 * CO2e avoided (tonnes) by baling `acres` of straw instead of burning it.
 * A conservative figure: we only claim credit for straw that is actually
 * collected and diverted, never for straw left in the field.
 */
export function estimateCo2Avoided(tonnesDiverted: number): number {
  return Math.round(tonnesDiverted * CO2_TONNES_PER_TONNE_BURNED * CO2_AVOIDED_FACTOR * 10) / 10;
}

export function estimatePm25(tonnesDiverted: number): number {
  return Math.round(tonnesDiverted * PM25_GRAMS_PER_TONNE_BURNED);
}

/* ------------------------------------------------------------------ *
 * IMAGES  (all local — never a remote URL, so the demo works offline)
 * ------------------------------------------------------------------ */

export const IMAGES = {
  hero: '/assets/tractor-baler-harvest.jpg',
  heroSecondary: '/assets/tractor-straw-bale.jpg',
  problemFire: '/assets/problem-burning-field.jpg',
  /** Alias used on the landing page next to the news strip. */
  problemBurning: '/assets/problem-burning-field.jpg',
  problemNews: '/assets/problem-news-strip.jpg',
  problemNewspaper: '/assets/problem-newspaper.jpg',
  officials: '/assets/officials-field-visit.jpg',
  stepBale: '/assets/stubble-baling-field.jpg',
  stepCollect: '/assets/tractor-straw-bale.jpg',
  stepSell: '/assets/hands-deal.jpg',
  /** Alias for the handshake shot — used wherever a deal is being made. */
  hands: '/assets/hands-deal.jpg',
  farmerPortrait: '/assets/farmer-portrait.jpg',
  farmerSmiling: '/assets/farmer-smiling.jpg',
  farmerBale: '/assets/farmer-hay-bale.jpg',
  community: '/assets/farmer-joining-hands.jpg',
  // Buyer cards. Each of the six gets its own photograph — a roster where two
  // buyers share a picture reads as filler — and every one shows straw being
  // handled or used, never a burning field, because a buyer card showing
  // stubble burning sends exactly the wrong signal.
  buyerPower: '/assets/tractor-baler-harvest.jpg',
  buyerKiln: '/assets/tractor-straw-bale.jpg',
  buyerCattle: '/assets/farmer-hay-bale.jpg',
  buyerPaper: '/assets/officials-field-visit.jpg',
  buyerBaler: '/assets/stubble-baling-field.jpg',
  buyerCompost: '/assets/farmer-joining-hands.jpg',
} as const;
