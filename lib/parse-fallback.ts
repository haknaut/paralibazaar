import { CROP_TYPES, DISTRICT_KEYS, SUPPLY_TYPES, type CropType, type SupplyType } from './constants';

/**
 * A deterministic Punjabi / Hindi / English text parser.
 *
 * This is the safety net for the voice intake: if `GEMINI_API_KEY` is missing or
 * the LLM call fails, the demo must still work. It is not as good as a model,
 * but it reliably catches the numbers farmers actually speak — "10 acre",
 * "Ludhiana", "5 din", "baled", "wheat".
 *
 * Every pattern is Unicode-aware on purpose. JavaScript's `\b` is defined in
 * terms of `[A-Za-z0-9_]`, so `\b(ਝੋਨਾ)\b` never matches — which silently broke
 * Gurmukhi input. We use explicit letter/number lookarounds instead.
 */

export type ParsedIntake = {
  farmerName?: string;
  village?: string;
  district?: string;
  acres?: number;
  crop?: CropType;
  supply?: SupplyType;
  /** Days from today until the straw is ready. */
  readyInDays?: number;
  phone?: string;
};

/** Start of a token: not preceded by another letter or digit (any script). */
const START = String.raw`(?<![\p{L}\p{N}])`;
/** End of a token: not followed by another letter or digit (any script). */
const END = String.raw`(?![\p{L}\p{N}])`;

const NUMBER_WORDS: Record<string, number> = {
  // Punjabi / Hindi digits
  ek: 1, ik: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5, chhe: 6, chheh: 6, saat: 7,
  aath: 8, ath: 8, nau: 9, das: 10, gyarah: 11, barah: 12, teerah: 13, chaudah: 14,
  pandrah: 15, pannah: 15, saatah: 16, satrah: 16, atharah: 17, unnis: 18, unsatt: 19, bees: 20,
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

/**
 * District names in all three scripts. Speech-to-text transcribes Gurmukhi as
 * Gurmukhi and Devanagari as Devanagari, so both must be listed explicitly.
 */
const DISTRICT_ALIASES: Record<string, string> = {
  // English / romanised
  'ludhiana': 'Ludhiana',
  'ludhian': 'Ludhiana',
  'ludhianaa': 'Ludhiana',
  'sangrur': 'Sangrur',
  'sangroor': 'Sangrur',
  'sanger': 'Sangrur',
  'patiala': 'Patiala',
  'patyala': 'Patiala',
  'pathiala': 'Patiala',
  'bathinda': 'Bathinda',
  'bathende': 'Bathinda',
  'amritsar': 'Amritsar',
  'amritasr': 'Amritsar',
  'jalandhar': 'Jalandhar',
  'jalandher': 'Jalandhar',
  'jullunder': 'Jalandhar',
  'ferozepur': 'Ferozepur',
  'ferozpur': 'Ferozepur',
  'firozpur': 'Ferozepur',
  'moga': 'Moga',
  'muktsar': 'Muktsar',
  'mansa': 'Mansa',
  'fazilka': 'Fazilka',
  'hoshiarpur': 'Hoshiarpur',
  'kapurthala': 'Kapurthala',
  'rupnagar': 'Rupnagar',
  'ropar': 'Rupnagar',
  'barnala': 'Barnala',
  'faridkot': 'Faridkot',
  'tarn taran': 'Tarn Taran',
  'tarntaran': 'Tarn Taran',
  'pathankot': 'Pathankot',

  // Gurmukhi
  "ਲੁਧਿਆਣਾ": 'Ludhiana',
  "ਲੁਧਿਆਣੇ": 'Ludhiana',
  "ਸੰਗਰੂਰ": 'Sangrur',
  "ਸੰਗਰੁਰ": 'Sangrur',
  "ਪਟਿਆਲਾ": 'Patiala',
  "ਪਟੀਆਲਾ": 'Patiala',
  "ਬਠਿੰਦਾ": 'Bathinda',
  "ਬਠਿੰਡਾ": 'Bathinda',
  "ਅੰਮ੍ਰਿਤਸਰ": 'Amritsar',
  "ਜਲੰਧਰ": 'Jalandhar',
  "ਫਿਰੋਜਪੁਰ": 'Ferozepur',
  "ਮੋਗਾ": 'Moga',
  "ਮੁਕਤਸਰ": 'Muktsar',
  "ਮਾਨਸਾ": 'Mansa',
  "ਮੰਸਾ": 'Mansa',
  "ਫਾਜ਼ਿਲਕਾ": 'Fazilka',
  "ਫਾਜ਼ੀਲਕਾ": 'Fazilka',
  "ਹੁਸ਼ਿਆਰਪੁਰ": 'Hoshiarpur',
  "ਕਪੂਰਥਲਾ": 'Kapurthala',
  "ਰੂਪਨਗਰ": 'Rupnagar',
  "ਰੁਪਨਗਰ": 'Rupnagar',
  "ਬਰਨਾਲਾ": 'Barnala',
  "ਫਰੀਦਕੋਟ": 'Faridkot',
  "ਤਰਨ ਤਾਰਨ": 'Tarn Taran',
  "ਪਠਾਨਕੋਟ": 'Pathankot',

  // Devanagari
  "लुधियाना": 'Ludhiana',
  "संगरूर": 'Sangrur',
  "पटियाला": 'Patiala',
  "बठिंडा": 'Bathinda',
  "अमृतसर": 'Amritsar',
  "जालंधर": 'Jalandhar',
  "फिरोजपुर": 'Ferozepur',
  "मोगा": 'Moga',
  "मुक्तसर": 'Muktsar',
  "मानसा": 'Mansa',
  "फाजिलका": 'Fazilka',
  "होशियारपुर": 'Hoshiarpur',
  "कपूरथला": 'Kapurthala',
  "रूपनगर": 'Rupnagar',
  "बरनाला": 'Barnala',
  "फरीदकोट": 'Faridkot',
  "तरन तारण": 'Tarn Taran',
  "पठानकोट": 'Pathankot',
};

/** Sorted longest-first so "tarn taran" is not shadowed by "tarn". */
const DISTRICT_LOOKUP = Object.entries(DISTRICT_ALIASES).sort((a, b) => b[0].length - a[0].length);

const CROP_PADDY = new RegExp(`${START}(?:paddy|rice|jhona|jhonaa|dhan|धान|झोना|ਝੋਨਾ|ਝੋਨੇ)${END}`, 'u');
const CROP_WHEAT = new RegExp(`${START}(?:wheat|gehun|गेहूँ|गेहूं|ਕਣਕ|ਕਨਕ)${END}`, 'u');

const SUPPLY_BALED = new RegExp(`${START}(?:bale|baled|baley|baleyan|gaddi|galle|galey|बेल|गली|ਗੱਲੀ|ਗੱਲੀਆਂ)${END}`, 'u');
const SUPPLY_LOOSE = new RegExp(`${START}(?:loose|khula|khuli|khul|खुला|ਖੁੱਲਾ|ਖੁੱਲੀ)${END}`, 'u');

const ACRE_UNIT = /(?:acres|acre|acer|एकड़|ਏਕੜ)/u;
const DAY_UNIT = /(?:days|day|din|dine|dein|दिन|दिनों|ਦਿਨ|ਦਿਨਾਂ|ਦਿਨਾ)/u;
// Western digits plus Devanagari (०-९) and Gurmukhi (੦-੯) — the mic can
// transcribe either script, and \d alone never matches them.
const NUMBER_TOKEN = /([\d\u0966-\u096F\u0A66-\u0A6F]+(?:\.\d+)?|[a-z]+|[ऀ-ॿ]+|[਀-੿]+)/u;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,.!?;:"'’“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readNumber(token: string | undefined): number | undefined {
  if (!token) return undefined;
  const trimmed = token.trim();
  // Transliterate native-script digits to ASCII before Number() — it returns
  // NaN for "੧੦" / "५" even though the token regex matched them.
  // ०/੦ sit at code % 16 === 6, so subtract the block base to get 0-9.
  const ascii = trimmed.replace(/[\u0966-\u096F\u0A66-\u0A6F]/g, (c) =>
    String((c.charCodeAt(0) % 16) - 6),
  );
  const asNumber = Number(ascii);
  if (Number.isFinite(asNumber)) return asNumber;
  return NUMBER_WORDS[trimmed];
}

/** First regex that captures a plausible number, or undefined. */
function firstNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = readNumber(match[1]);
    if (value !== undefined) return value;
  }
  return undefined;
}

/** Pull whatever fields we can out of one free-form sentence. */
export function parseIntake(text: string): ParsedIntake {
  const t = normalize(text);
  const result: ParsedIntake = {};
  if (!t) return result;

  // --- acres: "10 acre", "10 acres jhona", "ten acre", "10 ਏਕੜ" ---
  const acres = firstNumber(t, [
    new RegExp(`${START}${NUMBER_TOKEN.source}\\s*${ACRE_UNIT.source}`, 'u'),
    new RegExp(`${ACRE_UNIT.source}\\s*${START}(${NUMBER_TOKEN.source})`, 'u'),
  ]);
  if (acres !== undefined && acres > 0 && acres < 500) result.acres = acres;

  // --- district: longest alias wins so "Tarn Taran" beats a partial match ---
  for (const [alias, canonical] of DISTRICT_LOOKUP) {
    if (t.includes(alias)) {
      result.district = canonical;
      break;
    }
  }
  if (!result.district) {
    const hit = DISTRICT_KEYS.find((d) => t.includes(d.toLowerCase()));
    if (hit) result.district = hit;
  }

  // --- crop type ---
  if (CROP_PADDY.test(t)) result.crop = 'paddy';
  else if (CROP_WHEAT.test(t)) result.crop = 'wheat';

  // --- baled vs loose ---
  if (SUPPLY_BALED.test(t)) result.supply = 'baled';
  else if (SUPPLY_LOOSE.test(t)) result.supply = 'loose';

  // --- readiness: "5 din", "aaj", "kal", "agle hafte" ---
  const days = firstNumber(t, [
    new RegExp(`${START}${NUMBER_TOKEN.source}\\s*${DAY_UNIT.source}`, 'u'),
    new RegExp(`${DAY_UNIT.source}\\s*${START}(${NUMBER_TOKEN.source})`, 'u'),
  ]);
  if (days !== undefined && days >= 0 && days < 120) {
    result.readyInDays = Math.round(days);
  } else if (new RegExp(`${START}(?:aaj|aj|today|abhi|आज|ਅੱਜ)${END}`, 'u').test(t)) {
    result.readyInDays = 0;
  } else if (new RegExp(`${START}(?:kal|tomorrow|कल|ਕੱਲ੍ਹ|ਕੱਲੇ)${END}`, 'u').test(t)) {
    result.readyInDays = 1;
  } else if (
    new RegExp(`${START}(?:parson|parso|next week|hafte|hafto|week|हफ्ते|ਹਫ਼ਤੇ|ਹਫਤੇ)${END}`, 'u').test(t)
  ) {
    result.readyInDays = 7;
  }

  // --- phone number ---
  const phone = text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/);
  if (phone) result.phone = phone[0].replace(/\s+/g, ' ').trim();

  return result;
}

/** Hard guarantees for any parser output: never an unknown district or crop. */
export function sanitizeIntake(input: Partial<ParsedIntake>): ParsedIntake {
  const out: ParsedIntake = {};
  if (input.farmerName) out.farmerName = String(input.farmerName).slice(0, 60);
  if (input.village) out.village = String(input.village).slice(0, 60);

  if (input.district) {
    const wanted = String(input.district).trim().toLowerCase();
    const hit =
      DISTRICT_KEYS.find((d) => d.toLowerCase() === wanted) ??
      DISTRICT_ALIASES[wanted] ??
      Object.values(DISTRICT_ALIASES).find((d) => d.toLowerCase() === wanted);
    if (hit) out.district = hit;
  }

  const acres = Number(input.acres);
  if (Number.isFinite(acres) && acres > 0 && acres <= 500) out.acres = Math.round(acres * 10) / 10;

  if (input.crop && CROP_TYPES.includes(input.crop)) out.crop = input.crop as CropType;
  if (input.supply && SUPPLY_TYPES.includes(input.supply)) out.supply = input.supply as SupplyType;

  const days = Number(input.readyInDays);
  if (Number.isFinite(days) && days >= 0 && days <= 365) out.readyInDays = Math.round(days);

  if (input.phone) out.phone = String(input.phone).slice(0, 20);
  return out;
}
