import { districtCenter, IMAGES } from '@/lib/constants';
import type { Buyer, FarmerListing, Hotspot } from '@/lib/types';

/**
 * Seed data for the demo. Everything is generated relative to "now" so the
 * dashboard always looks alive: some pickups are days old, some are due today,
 * and the fire watch always shows hotspots from the last 24 hours.
 */

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

function isoDate(offsetDays: number): string {
  // Civil date in IST, not UTC: between 00:00 and 05:30 IST the UTC date is
  // still yesterday, which would seed "ready today" rows a day early.
  return new Date(now + offsetDays * DAY + IST_OFFSET).toISOString().slice(0, 10);
}

function isoTime(offsetHours: number): string {
  return new Date(now + offsetHours * 60 * 60 * 1000).toISOString();
}

/* ------------------------------------------------------------------ *
 * FARMERS — 25 listings across 14 Punjab districts
 * ------------------------------------------------------------------ */

type SeedRow = [
  farmerName: string,
  village: string,
  district: string,
  acres: number,
  crop: 'paddy' | 'wheat',
  supply: 'baled' | 'loose',
  readyOffsetDays: number,
  askingPrice: number,
  status: 'open' | 'offer' | 'pickup' | 'collected',
  buyerId?: string,
  offerPrice?: number,
  createdDaysAgo?: number,
];

const FARMER_ROWS: SeedRow[] = [
  // --- completed pickups (feed the "collected" dashboard numbers) ---
  // Spread across the last 8 weeks so the weekly trend chart has real shape.
  ['Gurmeet Singh', 'Jaspur', 'Ludhiana', 12, 'paddy', 'baled', -3, 1500, 'collected', 'b1', 1520, 5],
  ['Surjit Kaur', 'Rampur', 'Sangrur', 8, 'paddy', 'baled', -5, 1450, 'collected', 'b3', 1480, 7],
  ['Balwinder Singh', 'Khanpur', 'Patiala', 20, 'paddy', 'loose', -8, 1400, 'collected', 'b1', 1465, 10],
  ['Jaspal Singh', 'Bathinda Kalan', 'Bathinda', 15, 'paddy', 'baled', -12, 1550, 'collected', 'b6', 1500, 14],
  ['Harpreet Kaur', 'Dera Baba Nanak', 'Amritsar', 6, 'paddy', 'baled', -16, 1500, 'collected', 'b2', 1525, 18],
  ['Mandeep Singh', 'Adampur', 'Jalandhar', 11, 'paddy', 'baled', -23, 1450, 'collected', 'b3', 1490, 25],
  ['Davinder Singh', 'Zira', 'Ferozepur', 18, 'paddy', 'loose', -30, 1425, 'collected', 'b1', 1470, 32],
  ['Gurdeep Singh', 'Bilhoke', 'Moga', 9, 'paddy', 'baled', -37, 1520, 'collected', 'b6', 1500, 39],
  ['Amarjit Singh', 'Abohar', 'Ferozepur', 14, 'paddy', 'baled', -44, 1440, 'collected', 'b6', 1480, 46],
  ['Kulwant Singh', 'Gidderbaha', 'Muktsar', 7, 'paddy', 'loose', -51, 1430, 'collected', 'b2', 1460, 53],

  // --- pickups scheduled (status: pickup) ---
  ['Ravinder Singh', 'Jagraon', 'Ludhiana', 16, 'paddy', 'baled', 1, 1500, 'pickup', 'b1', 1530, 5],
  ['Navdeep Kaur', 'Lehra', 'Sangrur', 5, 'paddy', 'loose', 0, 1400, 'pickup', 'b3', 1455, 4],
  ['Gurwinder Singh', 'Samrala', 'Ludhiana', 22, 'paddy', 'baled', 2, 1550, 'pickup', 'b6', 1500, 6],

  // --- offers made (status: offer) ---
  ['Tarsem Singh', 'Pohli', 'Sangrur', 10, 'paddy', 'baled', 2, 1500, 'offer', 'b1', 1490, 3],
  ['Satnam Kaur', 'Garhshankar', 'Hoshiarpur', 4, 'paddy', 'loose', 3, 1420, 'offer', 'b3', 1440, 2],
  ['Parminder Singh', 'Kapurthala', 'Kapurthala', 13, 'paddy', 'baled', 1, 1480, 'offer', 'b4', 1460, 4],
  ['Veerjeet Singh', 'Dhanauri', 'Barnala', 8, 'paddy', 'baled', 4, 1520, 'offer', 'b6', 1495, 2],

  // --- open for buyers ---
  ['Malkit Singh', 'Khanna', 'Ludhiana', 17, 'paddy', 'baled', 3, 1500, 'open', undefined, undefined, 1],
  ['Jandeep Kaur', 'Bajakhana', 'Sangrur', 6, 'paddy', 'loose', 2, 1390, 'open', undefined, undefined, 1],
  ['Karamjit Singh', 'Balanwa', 'Patiala', 25, 'paddy', 'baled', 5, 1560, 'open', undefined, undefined, 2],
  ['Randeep Singh', 'Rampura Phul', 'Bathinda', 19, 'paddy', 'loose', 4, 1440, 'open', undefined, undefined, 2],
  ['Gurinder Pal', 'Ajnala', 'Amritsar', 11, 'paddy', 'baled', 3, 1510, 'open', undefined, undefined, 1],
  ['Simranjit Singh', 'Phillaur', 'Jalandhar', 14, 'wheat', 'baled', 21, 1180, 'open', undefined, undefined, 6],
  ['Baljinder Singh', 'Firozpur', 'Ferozepur', 9, 'wheat', 'baled', 18, 1220, 'open', undefined, undefined, 5],
  ['Harshdeep Singh', 'Rupnagar', 'Rupnagar', 12, 'paddy', 'baled', 5, 1500, 'open', undefined, undefined, 2],
];

export const SEED_LISTINGS: FarmerListing[] = FARMER_ROWS.map((row, i) => {
  const [
    farmerName,
    village,
    district,
    acres,
    crop,
    supply,
    readyOffsetDays,
    askingPrice,
    status,
    buyerId,
    offerPrice,
    createdDaysAgo = 1,
  ] = row;
  // Nudge each pin slightly off the district HQ so a map never shows 25 pins
  // stacked on one pixel, and so "nearby farmers" distances differ per farm.
  // Two decorrelated hashes keep the offsets from lining up in a row.
  const jitter = (n: number) => (((i * 37 + n * 91) % 100) / 100 - 0.5) * 0.36;
  const center = districtCenter(district);
  return {
    id: `seed-${String(i + 1).padStart(2, '0')}`,
    farmerName,
    village,
    district,
    acres,
    crop,
    supply,
    readyDate: isoDate(readyOffsetDays),
    phone: `+91 98${String(20000000 + i * 137911).slice(0, 8)}`,
    lat: center.lat + jitter(1),
    lng: center.lng + jitter(2),
    status,
    askingPrice,
    offerPrice,
    buyerId,
    // A completed load was collected on its ready date; everything else was
    // last touched a few hours after it was posted. This is what fills the
    // weekly buckets on the dashboard.
    updatedAt:
      status === 'collected' ? isoTime(readyOffsetDays * 24 - 3) : isoTime(-(createdDaysAgo * 24 - 6)),
    createdAt: isoTime(-createdDaysAgo * 24),
  } as FarmerListing;
});

/* ------------------------------------------------------------------ *
 * BUYERS — 6 industrial consumers, each mapped to a local asset
 * ------------------------------------------------------------------ */

export const SEED_BUYERS: Buyer[] = [
  {
    id: 'b1',
    name: 'Punjab Green Power Ltd.',
    type: 'biomass-power',
    district: 'Ludhiana',
    lat: 30.871,
    lng: 75.912,
    pricePerTonne: 1520,
    monthlyCapacityTonnes: 9000,
    phone: '+91 161 456 2200',
    image: IMAGES.buyerPower,
    blurb: '45 MW biomass plant co-firing paddy straw with coal. Needs 300 tonnes a day, every day, from October to December.',
  },
  {
    id: 'b2',
    name: 'Sangrur Brick Works',
    type: 'brick-kiln',
    district: 'Sangrur',
    lat: 30.244,
    lng: 75.801,
    pricePerTonne: 1460,
    monthlyCapacityTonnes: 4200,
    phone: '+91 1671 220 118',
    image: IMAGES.buyerKiln,
    blurb: 'Bull-tray kilns firing 4,000 bricks a day. Straw replaces coal clinker — cuts kiln smoke and costs by a third.',
  },
  {
    id: 'b3',
    name: 'Jalandhar Shuddh Gaushala Feed',
    type: 'cattle-feed',
    district: 'Jalandhar',
    lat: 31.297,
    lng: 75.602,
    pricePerTonne: 1440,
    monthlyCapacityTonnes: 1500,
    phone: '+91 182 326 7744',
    image: IMAGES.buyerCattle,
    blurb: 'Bales chopped into cattle feed for 1,200 dairy animals. Washed, pressed and pelleted on site.',
  },
  {
    id: 'b4',
    name: 'Kapurthala Paper Mills',
    type: 'paper-mill',
    district: 'Kapurthala',
    lat: 31.404,
    lng: 75.088,
    pricePerTonne: 1410,
    monthlyCapacityTonnes: 3600,
    phone: '+91 182 244 9900',
    image: IMAGES.buyerPaper,
    blurb: 'Agricultural-residue pulping line. Wants clean, dry, bale-sized straw delivered to the mill gate.',
  },
  {
    id: 'b5',
    name: 'Bathinda Bale & Mulch Services',
    type: 'baler',
    district: 'Bathinda',
    lat: 30.239,
    lng: 74.901,
    pricePerTonne: 1580,
    monthlyCapacityTonnes: 6000,
    phone: '+91 164 221 5512',
    image: IMAGES.buyerBaler,
    blurb: 'Runs round balers and a mulch-grinding unit. Pays the best rate for standing crop — it cuts and bales for you.',
  },
  {
    id: 'b6',
    name: 'Ludhiana Green Compost Unit',
    type: 'compost',
    district: 'Ludhiana',
    lat: 30.782,
    lng: 76.021,
    pricePerTonne: 1350,
    monthlyCapacityTonnes: 2200,
    phone: '+91 161 277 3388',
    image: IMAGES.buyerCompost,
    blurb: 'Windrow composting on 6 acres. Turns straw into organic manure sold back to Punjab farms at ₹8 a kilo.',
  },
];

/* ------------------------------------------------------------------ *
 * HOTSPOTS — 40 realistic fire points across Punjab
 * ------------------------------------------------------------------ */

type HotspotRow = [district: string, lat: number, lng: number, hectares: number, hoursAgo: number];

const HOTSPOT_ROWS: HotspotRow[] = [
  ['Sangrur', 30.191, 75.702, 14.2, 2],
  ['Sangrur', 30.288, 75.961, 8.6, 5],
  ['Sangrur', 30.117, 75.848, 21.4, 9],
  ['Ludhiana', 30.941, 75.702, 11.9, 3],
  ['Ludhiana', 30.812, 76.041, 6.3, 7],
  ['Ludhiana', 30.702, 75.412, 17.8, 11],
  ['Patiala', 30.421, 76.288, 24.1, 4],
  ['Patiala', 30.245, 76.512, 9.7, 6],
  ['Patiala', 30.372, 76.081, 13.5, 14],
  ['Bathinda', 30.181, 74.882, 31.2, 2],
  ['Bathinda', 30.301, 75.021, 18.6, 5],
  ['Bathinda', 30.082, 74.712, 12.3, 8],
  ['Amritsar', 31.702, 74.782, 7.4, 4],
  ['Amritsar', 31.551, 74.951, 10.2, 9],
  ['Amritsar', 31.812, 74.642, 5.8, 16],
  ['Jalandhar', 31.372, 75.642, 9.1, 3],
  ['Jalandhar', 31.241, 75.412, 14.7, 12],
  ['Ferozepur', 30.981, 74.251, 28.4, 2],
  ['Ferozepur', 30.812, 74.431, 16.9, 6],
  ['Ferozepur', 30.641, 74.121, 22.3, 10],
  ['Moga', 30.712, 75.331, 19.8, 5],
  ['Moga', 30.541, 75.472, 11.2, 13],
  ['Muktsar', 30.531, 74.421, 26.1, 3],
  ['Muktsar', 30.392, 74.612, 13.7, 9],
  ['Mansa', 30.041, 75.381, 15.4, 6],
  ['Mansa', 29.921, 75.512, 20.8, 15],
  ['Fazilka', 30.421, 74.061, 23.5, 4],
  ['Hoshiarpur', 31.582, 75.871, 8.6, 7],
  ['Hoshiarpur', 31.462, 75.982, 6.2, 18],
  ['Kapurthala', 31.431, 75.081, 10.4, 5],
  ['Kapurthala', 31.321, 75.211, 7.9, 22],
  ['Rupnagar', 31.391, 76.312, 12.8, 8],
  ['Faridkot', 30.492, 74.601, 17.3, 4],
  ['Barnala', 30.402, 75.671, 9.6, 7],
  ['Tarn Taran', 31.672, 74.591, 16.3, 3],
  ['Tarn Taran', 31.521, 74.702, 11.5, 19],
  ['Pathankot', 32.301, 75.612, 6.9, 12],
  ['Sangrur', 30.401, 75.722, 14.7, 24],
  ['Ferozepur', 31.081, 74.352, 25.2, 27],
  ['Ludhiana', 30.582, 75.921, 18.1, 30],
];

export const SEED_HOTSPOTS: Hotspot[] = HOTSPOT_ROWS.map(([district, lat, lng, hectares, hoursAgo], i) => ({
  id: `hs-${String(i + 1).padStart(2, '0')}`,
  lat,
  lng,
  district,
  confidence: 0.72 + ((i * 13) % 26) / 100,
  hectares,
  detectedAt: isoTime(-hoursAgo),
  satellite: i % 3 === 0 ? 'VIIRS' : 'MODIS',
}));
