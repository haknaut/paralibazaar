/**
 * One-shot generator for the data-layer translation keys.
 *
 * Data that lives in seed.ts (district names, buyer names, buyer blurbs) is
 * stored in English because it doubles as API payload and as the canonical
 * record. The UI still has to speak the user's language, so these keys mirror
 * those records and the components look them up by id/type.
 *
 * Run: node scripts/gen-data-translations.cjs
 * It is idempotent — it replaces a previously generated block if one exists.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'lib', 'translations.ts');
const BEGIN = '  /* --- BEGIN generated: data-layer labels --- */';
const END = '  /* --- END generated: data-layer labels --- */';

/** @type {{key:string, en:string, hi:string, pa:string}[]} */
const ROWS = [];

const districts = [
  ['Ludhiana', 'Ludhiana', 'लुधियाना', 'ਲੁਧਿਆਣਾ'],
  ['Sangrur', 'Sangrur', 'संगरूर', 'ਸੰਗਰੂਰ'],
  ['Patiala', 'Patiala', 'पटियाला', 'ਪਟਿਆਲਾ'],
  ['Bathinda', 'Bathinda', 'बठिंडा', 'ਬਠਿੰਡਾ'],
  ['Amritsar', 'Amritsar', 'अमृतसर', 'ਅੰਮ੍ਰਿਤਸਰ'],
  ['Jalandhar', 'Jalandhar', 'जलंधर', 'ਜਲੰਧਰ'],
  ['Ferozepur', 'Ferozepur', 'फिरोजपुर', 'ਫਿਰੋਜਪੁਰ'],
  ['Moga', 'Moga', 'मोगा', 'ਮੋਗਾ'],
  ['Muktsar', 'Muktsar', 'मुक्तसर', 'ਮੁਕਤਸਰ'],
  ['Mansa', 'Mansa', 'मानसा', 'ਮਾਨਸਾ'],
  ['Fazilka', 'Fazilka', 'फाजिलका', 'ਫਾਜ਼ਿਲਕਾ'],
  ['Hoshiarpur', 'Hoshiarpur', 'होशियारपुर', 'ਹੁਸ਼ਿਆਰਪੁਰ'],
  ['Kapurthala', 'Kapurthala', 'कपूरथला', 'ਕਪੂਰਥਲਾ'],
  ['Rupnagar', 'Rupnagar', 'रूपनगर', 'ਰੂਪਨਗਰ'],
  ['Faridkot', 'Faridkot', 'फरीदकोट', 'ਫਰੀਦਕੋਟ'],
  ['Barnala', 'Barnala', 'बरनाला', 'ਬਰਨਾਲਾ'],
  ['TarnTaran', 'Tarn Taran', 'तरन तारन', 'ਤਰਨ ਤਾਰਨ'],
  ['Pathankot', 'Pathankot', 'पठानकोट', 'ਪਠਾਨਕੋਟ'],
];

for (const [key, en, hi, pa] of districts) {
  ROWS.push({ key: `district${key}`, en, hi, pa });
}

// Village names. Proper nouns, but a farmer reading Punjabi should still see
// Gurmukhi — they read village names in their own script every day.
const villages = [
  ['Jaspur', 'जसपुर', 'ਜਸਪੁਰ'],
  ['Rampur', 'रामपुर', 'ਰਾਮਪੁਰ'],
  ['Khanpur', 'खानपुर', 'ਖਾਨਪੁਰ'],
  ['BathindaKalan', 'Bathinda Kalan', 'बथिंडा कलां', 'ਬਠਿੰਡਾ ਕਲਾਂ'],
  ['DeraBabaNanak', 'Dera Baba Nanak', 'डेरा बाबा नानक', 'ਡੇਰਾ ਬਾਬਾ ਨਾਨਕ'],
  ['Adampur', 'आदमपुर', 'ਆਦਮਪੁਰ'],
  ['Zira', 'ज़ीरा', 'ਜ਼ੀਰਾ'],
  ['Bilhoke', 'बिल्होके', 'ਬਿਲ੍ਹੋਕੇ'],
  ['Abohar', 'अबोहर', 'ਅਬੋਹਰ'],
  ['Gidderbaha', 'गिद्दरबाहा', 'ਗਿੱਦਰਬਾਹਾ'],
  ['Jagraon', 'जगराओं', 'ਜਗਰਾਓਂ'],
  ['Lehra', 'लेहरा', 'ਲੇਹਰਾ'],
  ['Samrala', 'समराला', 'ਸਮਰਾਲਾ'],
  ['Pohli', 'पोहली', 'ਪੋਹਲੀ'],
  ['Garhshankar', 'गढ़शंकर', 'ਗੜ੍ਹਸ਼ੰਕਰ'],
  ['KapurthalaVillage', 'Kapurthala', 'कपूरथला', 'ਕਪੂਰਥਲਾ'],
  ['Dhanauri', 'धनौरी', 'ਧਨਾਊਰੀ'],
  ['Khanna', 'खन्ना', 'ਖੰਨਾ'],
  ['Bajakhana', 'बजखाना', 'ਬਜਖਾਨਾ'],
  ['Balanwa', 'बालांवा', 'ਬਾਲਾਂਵਾ'],
  ['RampuraPhul', 'Rampura Phul', 'रामपुरा फुल', 'ਰਾਮਪੁਰਾ ਫੁਲ'],
  ['Ajnala', 'अजनाला', 'ਅਜਣਾਲਾ'],
  ['Phillaur', 'फिल्लौर', 'ਫਿੱਲੌਰ'],
  ['FirozpurVillage', 'Firozpur', 'फिरोजपुर', 'ਫਿਰੋਜਪੁਰ'],
  ['RupnagarVillage', 'Rupnagar', 'रूपनगर', 'ਰੂਪਨਗਰ'],
];

// Rows are [key, en, hi, pa]. Where the key is already a valid English
// spelling the `en` slot may be omitted, so normalise here.
for (const row of villages) {
  const [key, ...rest] = row;
  const [en, hi, pa] = rest.length === 3 ? rest : [key, ...rest];
  ROWS.push({ key: `village${key}`, en, hi, pa });
}

const buyers = [
  [
    'BiomassPower',
    'Punjab Green Power Ltd.',
    'पंजाब ग्रीन पावर लिमिटेड',
    'ਪੰਜਾਬ ਗ੍ਰੀਨ ਪਾਵਰ ਲਿਮਿਟਿਡ',
    '45 MW biomass plant co-firing paddy straw with coal. Needs 300 tonnes a day, every day, from October to December.',
    '45 MW बायोमास संयंत्र जो कोयले के साथ धान का पराली जलाता है। अक्टूबर से दिसंबर तक रोज़ 300 टन चाहिए।',
    '45 MW ਬਾਇਓਮਾਸ ਪਲਾਂਟ ਜੋ ਕੋਲੇ ਨਾਲ ਝੋਨੇ ਦੀ ਪਰਾਲੀ ਜਲਾਉਂਦਾ ਹੈ। ਅਕਤੂਬਰ ਤੋਂ ਦਸੰਬਰ ਤੱਕ ਹਰ ਰੋਜ਼ 300 ਟਨ ਚਾਹੀਦਾ ਹੈ।',
  ],
  [
    'BrickKiln',
    'Sangrur Brick Works',
    'संगरूर ब्रिक वर्क्स',
    'ਸੰਗਰੂਰ ਬ੍ਰਿਕ ਵਰਕਸ',
    'Bull-tray kilns firing 4,000 bricks a day. Straw replaces coal clinker — cuts kiln smoke and costs by a third.',
    'रोज़ 4,000 ईंटें बनाने वाली भट्ठियाँ। पराली कोयले की जगह लेती है — धुआँ और खर्च दोनों एक तिहाई कम।',
    'ਰੋਜ਼ 4,000 ਇੱਟਾਂ ਪਾਉਣ ਵਾਲੀਆਂ ਭੱਠੀਆਂ। ਪਰਾਲੀ ਕੋਲੇ ਦੀ ਥਾਂ ਲੈਂਦੀ ਹੈ — ਧੁੰਆਂ ਅਤੇ ਖਰਚ ਦੋਵੇਂ ਇੱਕ ਤਿਹਾਈ ਘੱਟ।',
  ],
  [
    'CattleFeed',
    'Jalandhar Shuddh Gaushala Feed',
    'जलंधर शुद्ध गौशाला फ़ीड',
    'ਜਲੰਧਰ ਸ਼ੁੱਧ ਗੌਸ਼ਾਲਾ ਫ਼ੀਡ',
    'Bales chopped into cattle feed for 1,200 dairy animals. Washed, pressed and pelleted on site.',
    '1,200 दुधारू पशुओं के लिए गेहूँसारी। यहीं धुलाई, दबाव और दानेदार बनती है।',
    '1,200 ਦੁੱਧ-ਦਾਣ ਪਸ਼ੂਆਂ ਲਈ ਚਾਰਾ। ਇੱਥੇ ਹੀ ਧੋਇਆ, pressed ਅਤੇ ਦਾਣ ਬਣਾਇਆ ਜਾਂਦਾ ਹੈ।',
  ],
  [
    'PaperMill',
    'Kapurthala Paper Mills',
    'कपूरथला पेपर मिल्स',
    'ਕਪੂਰਥਲਾ ਪੇਪਰ ਮਿੱਲਸ',
    'Agricultural-residue pulping line. Wants clean, dry, bale-sized straw delivered to the mill gate.',
    'खेल अवशेष से पल्प बनाने की लाइन। साफ़, सूखी, गोलाई में बेल जैसी पराली चाहिए, मिल के गेट तक।',
    'ਖੇਤੀ ਰਹਿੰਦ-ਕੁਚੇ ਤੋਂ ਪਲਪ ਬਣਾਉਣ ਦੀ ਲਾਈਨ। ਸਾਫ਼, ਸੁੱਕੀ, ਗੋਲ ਗੱਲੀ ਵਾਲੀ ਪਰਾਲੀ ਚਾਹੀਦੀ ਹੈ, ਮਿੱਲ ਦੇ ਗੇਟ ਤੱਕ।',
  ],
  [
    'Baler',
    'Bathinda Bale & Mulch Services',
    'बठिंडा बेल एवं मल्च सेवाएँ',
    'ਬਠਿੰਡਾ ਬੇਲ ਤੇ ਮਲਚ ਸੇਵਾਵਾਂ',
    'Runs round balers and a mulch-grinding unit. Pays the best rate for standing crop — it cuts and bales for you.',
    'राउंड बेलर और मल्च यूनिट। खेत में खड़ी फसल पर सबसे ऊँचा भाव — कटाई और बेलिंग खुद करते हैं।',
    'ਰਾਊਂਡ ਬੇਲਰ ਅਤੇ ਮਲਚ ਯੂਨਿਟ। ਖੇਤ ਵਿੱਚ ਖੜ੍ਹੀ ਫ਼ਸਲ ’ਤੇ ਸਭ ਤੋਂ ਵੱਧ ਭਾਵ — ਕਟਾਈ ਅਤੇ ਗੱਲੀ ਆਪ ਹੀ ਕਰਦੇ ਹਨ।',
  ],
  [
    'Compost',
    'Ludhiana Green Compost Unit',
    'लुधियाना ग्रीन कंपोस्ट यूनिट',
    'ਲੁਧਿਆਣਾ ਗ੍ਰੀਨ ਕੰਪੋਸਟ ਯੂਨਿਟ',
    'Windrow composting on 6 acres. Turns straw into organic manure sold back to Punjab farms at ₹8 a kilo.',
    '6 एकड़ पर विंडरो कंपोस्ट। पराली से जैविक खाद बनती है, जो 8 रुपये किलो पर पंजाब के खेतों में जाती है।',
    '6 ਏਕੜ ’ਤੇ ਵਿੰਡਰੋ ਕੰਪੋਸਟ। ਪਰਾਲੀ ਤੋਂ ਜੈਵਿਕ ਖਾਦ ਬਣਦੀ ਹੈ, ਜੋ ₹8 ਪ੍ਰਤੀ ਕਿਲੋ ਦੀ ਭਾਵ ' + "'" + 'ਤੇ ਪੰਜਾਬ ਦੇ ਖੇਤਾਂ ਵਿੱਚ ਜਾਂਦੀ ਹੈ।',
  ],
];

for (const [key, en, hi, pa, enB, hiB, paB] of buyers) {
  ROWS.push({ key: `buyer${key}`, en, hi, pa });
  ROWS.push({ key: `buyerBlurb${key}`, en: enB, hi: hiB, pa: paB });
}

/** Escapes for a single-quoted TS string literal. */
const q = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

const block = (lang) =>
  '\n' +
  BEGIN +
  '\n' +
  ROWS.map((r) => `  ${r.key}: ${q(r[lang])},`).join('\n') +
  '\n' +
  END +
  '\n';

let src = fs.readFileSync(OUT, 'utf8');

/**
 * Removes every previously generated block, so re-running is safe and also
 * cleans up a block that landed in the wrong dictionary.
 */
function stripAll(s) {
  let out = s;
  for (;;) {
    const b = out.indexOf(BEGIN);
    if (b < 0) return out;
    const e = out.indexOf(END, b);
    if (e < 0) return out;
    // Also swallow the newline that followed the block.
    let cut = e + END.length;
    if (out[cut] === '\n') cut++;
    out = out.slice(0, b) + out.slice(cut);
  }
}

src = stripAll(src);

/**
 * Finds the index just before the `}` that closes the object literal opened
 * after `from`. Brace matching, because `en` closes with `} as const;` and a
 * naive `indexOf('\n};')` lands in the next dictionary.
 */
function closeOf(s, from) {
  const open = s.indexOf('{', from);
  if (open < 0) throw new Error('no opening brace');
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('unbalanced braces');
}

const markers = [
  ['const en = {', 'en'],
  ['const hi: Dict = {', 'hi'],
  ['const pa: Dict = {', 'pa'],
];

// Insert back-to-front so earlier offsets stay valid.
const inserts = markers.map(([marker, lang]) => {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error('marker not found: ' + marker);
  return { at: closeOf(src, at), text: block(lang) };
});

for (const { at, text } of inserts.sort((a, b) => b.at - a.at)) {
  src = src.slice(0, at) + '\n' + text.replace(/^\n/, '').replace(/\n$/, '') + src.slice(at);
}

fs.writeFileSync(OUT, src);
console.log(`inserted ${ROWS.length} keys x 3 languages into lib/translations.ts`);
