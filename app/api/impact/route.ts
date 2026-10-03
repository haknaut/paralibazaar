import { NextResponse } from 'next/server';
import {
  CO2_AVOIDED_FACTOR,
  CO2_TONNES_PER_TONNE_BURNED,
  DEFAULT_PRICE_PER_TONNE,
  PM25_GRAMS_PER_TONNE_BURNED,
  STRAW_TONNES_PER_ACRE,
} from '@/lib/constants';
import { computeByDistrict, computeImpact, computeStatusCounts, computeTrend, listAll, listBuyers } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const listings = listAll();
  return NextResponse.json({
    totals: computeImpact(listings),
    trend: computeTrend(listings),
    byDistrict: computeByDistrict(listings),
    byStatus: computeStatusCounts(listings),
    buyers: listBuyers(),
    assumptions: {
      strawTonnesPerAcre: STRAW_TONNES_PER_ACRE,
      co2TonnesPerTonneBurned: CO2_TONNES_PER_TONNE_BURNED,
      co2AvoidedFactor: CO2_AVOIDED_FACTOR,
      pm25GramsPerTonneBurned: PM25_GRAMS_PER_TONNE_BURNED,
      defaultPricePerTonne: DEFAULT_PRICE_PER_TONNE,
    },
  });
}
