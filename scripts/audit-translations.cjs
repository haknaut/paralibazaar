// Dev-only audit: finds translation keys that are missing or still identical to English.
//   node scripts/audit-translations.cjs          pass/fail summary (exit 1 on problems)
//   node scripts/audit-translations.cjs --dump   also print every key for manual scanning
const fs = require('fs');
const path = require('path');

const DUMP = process.argv.includes('--dump');

const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'translations.ts'), 'utf8');

/** Extracts the balanced `{ ... }` object literal that follows `const NAME`. */
function block(name) {
  const i = src.indexOf('const ' + name);
  if (i < 0) return null;
  const start = src.indexOf('{', i);
  if (start < 0) return null;
  let depth = 0;
  for (let j = start; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return null;
}

/** Pulls `key: 'value'` pairs out of a dictionary body. */
function pairs(body) {
  const out = {};
  if (!body) return out;
  const re = /([A-Za-z0-9_]+)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  let m;
  while ((m = re.exec(body))) {
    out[m[1]] = m[2].slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
  }
  return out;
}

const en = pairs(block('en'));
const hi = pairs(block('hi'));
const pa = pairs(block('pa'));
const ek = Object.keys(en);

const hasDevanagari = (s) => /[\u0900-\u097F]/.test(s);
const hasGurmukhi = (s) => /[\u0A00-\u0A7F]/.test(s);
// ASCII letters = probably untranslated English left in a native-script dictionary.
const asciiWord = (s) => /[A-Za-z]{3,}/.test(s);

const report = (label, keys) => {
  if (!keys.length) return;
  console.log('\n--- ' + label + ' (' + keys.length + ') ---');
  for (const k of keys) console.log('  ' + k.padEnd(26) + JSON.stringify(en[k]));
};

console.log('en keys: ' + ek.length + ' | hi: ' + Object.keys(hi).length + ' | pa: ' + Object.keys(pa).length);

report('MISSING in hi', ek.filter((k) => !(k in hi)));
report('MISSING in pa', ek.filter((k) => !(k in pa)));
report('hi === en (untranslated)', ek.filter((k) => k in hi && hi[k] === en[k]));
report('pa === en (untranslated)', ek.filter((k) => k in pa && pa[k] === en[k]));
// A native-script dictionary with zero native script in a value is a missed translation.
report('hi has no Devanagari', ek.filter((k) => k in hi && !hasDevanagari(hi[k]) && asciiWord(hi[k])));
report('pa has no Gurmukhi', ek.filter((k) => k in pa && !hasGurmukhi(pa[k]) && asciiWord(pa[k])));

const problems =
  ek.filter((k) => !(k in hi)).length +
  ek.filter((k) => !(k in pa)).length +
  ek.filter((k) => k in hi && hi[k] === en[k] && /^[\x20-\x7e]+$/.test(en[k])).length +
  ek.filter((k) => k in pa && pa[k] === en[k] && /^[\x20-\x7e]+$/.test(en[k])).length;

if (DUMP) {
  console.log('\n--- full hi/pa dump (manual scan) ---');
  for (const k of ek)
    console.log(
      k.padEnd(26) +
        'EN=' + JSON.stringify(en[k]) +
        '\n' + ' '.repeat(26) + 'HI=' + JSON.stringify(hi[k]) +
        '\n' + ' '.repeat(26) + 'PA=' + JSON.stringify(pa[k]),
    );
}

console.log(
  problems === 0
    ? `\nOK — ${ek.length} keys, all three dictionaries aligned and translated.`
    : `\n${problems} problem(s) found — see the sections above.`,
);
process.exit(problems === 0 ? 0 : 1);
