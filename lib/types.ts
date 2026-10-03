import type { CropType, ListingStatus, SupplyType } from './constants';

/** A parcel of paddy/wheat stubble a farmer wants to sell. */
export type FarmerListing = {
  id: string;
  farmerName: string;
  village: string;
  district: string;
  acres: number;
  crop: CropType;
  supply: SupplyType;
  /** ISO date string, yyyy-mm-dd. */
  readyDate: string;
  phone: string;
  lat: number;
  lng: number;
  status: ListingStatus;
  /** ₹ per tonne the farmer is asking for. */
  askingPrice: number;
  /** ₹ per tonne a buyer offered; undefined until an offer is made. */
  offerPrice?: number;
  /** Buyer id once someone books the pickup. */
  buyerId?: string;
  /** ISO timestamp of the last status change — drives the dashboard timeline. */
  updatedAt: string;
  /** ISO timestamp the listing was created. */
  createdAt: string;
};

/** An organisation that buys stubble in bulk. */
export type Buyer = {
  id: string;
  name: string;
  type: 'biomass-power' | 'brick-kiln' | 'cattle-feed' | 'paper-mill' | 'baler' | 'compost';
  district: string;
  lat: number;
  lng: number;
  /** Typical ₹/tonne this buyer pays. */
  pricePerTonne: number;
  /** Tonnage this buyer can absorb per month. */
  monthlyCapacityTonnes: number;
  phone: string;
  image: string;
  blurb: string;
};

/** A detected stubble fire. */
export type Hotspot = {
  id: string;
  lat: number;
  lng: number;
  district: string;
  /** Confidence 0–1, mirrors the FIRRS "confidence" field. */
  confidence: number;
  /** Hectares estimated to have burned. */
  hectares: number;
  /** ISO timestamp of detection. */
  detectedAt: string;
  satellite: string;
};

export type ImpactTotals = {
  tonnesDiverted: number;
  co2Avoided: number;
  pm25Grams: number;
  rupeesEarned: number;
  listings: number;
  activeListings: number;
  collected: number;
  farmersHelped: number;
  buyersOnboarded: number;
  districtCount: number;
};

/** One bucket of the dashboard's weekly trend chart. */
export type TrendPoint = {
  /** Short label, e.g. "W1". */
  week: string;
  tonnes: number;
  co2: number;
  pickups: number;
};

export type Language = 'en' | 'hi' | 'pa';
