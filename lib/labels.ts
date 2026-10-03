import type { TranslationKey } from './translations';

/**
 * Localised labels for values that arrive as data rather than as UI chrome.
 *
 * Districts, buyer names and buyer blurbs live in `data/seed.ts` in English:
 * they are API payload, stored records and the canonical identity of a buyer,
 * so they must not be rewritten per language. The UI, however, has to speak the
 * farmer's language. These helpers map a data value onto its translation key so
 * the component layer never has to branch on `lang`.
 *
 * Every lookup falls back to the raw value if the key is missing, so a new
 * district added to `DISTRICTS` degrades to English rather than crashing.
 */

/** "Tarn Taran" -> "TarnTaran" */
const pascal = (value: string) =>
  value
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

/** "Ludhiana" -> districtLudhiana */
export function districtKey(district: string): TranslationKey | null {
  const key = `district${pascal(district)}` as TranslationKey;
  return key;
}

/**
 * "Bathinda Kalan" -> villageBathindaKalan.
 * A few village names collide with a district spelling (Kapurthala, Firozpur,
 * Rupnagar), so those carry a `Village` suffix in the dictionary to keep the
 * two lookups from sharing a key.
 */
const VILLAGE_KEY_OVERRIDE: Record<string, string> = {
  Kapurthala: 'villageKapurthalaVillage',
  Firozpur: 'villageFirozpurVillage',
  Rupnagar: 'villageRupnagarVillage',
};

export function villageKey(village: string): TranslationKey | null {
  const override = VILLAGE_KEY_OVERRIDE[village];
  if (override) return override as TranslationKey;
  return `village${pascal(village)}` as TranslationKey;
}

const BUYER_KEY: Record<string, string> = {
  'biomass-power': 'BiomassPower',
  'brick-kiln': 'BrickKiln',
  'cattle-feed': 'CattleFeed',
  'paper-mill': 'PaperMill',
  baler: 'Baler',
  compost: 'Compost',
};

/** "brick-kiln" -> buyerBrickKiln */
export function buyerNameKey(type: string): TranslationKey | null {
  const suffix = BUYER_KEY[type];
  return suffix ? (`buyer${suffix}` as TranslationKey) : null;
}

/** "brick-kiln" -> buyerBlurbBrickKiln */
export function buyerBlurbKey(type: string): TranslationKey | null {
  const suffix = BUYER_KEY[type];
  return suffix ? (`buyerBlurb${suffix}` as TranslationKey) : null;
}

/** Resolves a translation key against the dictionary, with a safe fallback. */
function pick(t: (key: TranslationKey) => string, key: TranslationKey | null, fallback: string) {
  return key ? t(key) || fallback : fallback;
}

export function districtLabel(
  t: (key: TranslationKey) => string,
  district: string,
): string {
  return pick(t, districtKey(district), district);
}

export function villageLabel(t: (key: TranslationKey) => string, village: string): string {
  return pick(t, villageKey(village), village);
}

export function buyerNameLabel(t: (key: TranslationKey) => string, buyer: {
  type: string;
  name: string;
}): string {
  return pick(t, buyerNameKey(buyer.type), buyer.name);
}

export function buyerBlurbLabel(t: (key: TranslationKey) => string, buyer: {
  type: string;
  blurb: string;
}): string {
  return pick(t, buyerBlurbKey(buyer.type), buyer.blurb);
}
