/**
 * One-shot fetcher for the self-hosted webfonts.
 *
 * `next/font/google` cannot be used for these two families: its bundled font
 * list predates both, so it rejects them at build time. Loading them from the
 * Google CDN at runtime would work but leaves a live demo exposed to a network
 * stall and a visible font swap. So we download the woff2 files once and serve
 * them from `public/fonts` — after this has run, the app has no font dependency
 * on the network at all.
 *
 * Two size decisions:
 *   - Google Sans keeps only the `latin` and `latin-ext` subsets. The API
 *     returns ~100 subset blocks per family and the app renders no Cyrillic.
 *   - Material Symbols is requested through the `icon_names=` endpoint so the
 *     response contains only the glyphs the app can actually draw. The
 *     unfiltered font is 5.2 MB; the subset is a few kilobytes.
 *
 * Run: node scripts/fetch-fonts.mjs
 */
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'fonts');

// A modern Chrome UA is what makes the API serve woff2 instead of ttf.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Reads the icon map so the subset can never drift from what Icon.tsx renders. */
async function glyphNames() {
  const src = await readFile(join(ROOT, 'lib', 'icons.ts'), 'utf8');
  const body = src.slice(src.indexOf('ICON_GLYPHS = {'), src.indexOf('} as const'));
  return [...new Set([...body.matchAll(/:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]))];
}

/** Splits the CSS into `{ subset, css }` chunks using Google's subset comments. */
function chunks(css) {
  const out = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  let m;
  while ((m = re.exec(css))) out.push({ subset: m[1], css: m[2] });
  return out;
}

function parse(css) {
  const url = /src:\s*url\(([^)]+)\)/.exec(css)?.[1];
  const weight = /font-weight:\s*([^;]+);/.exec(css)?.[1].trim();
  const style = /font-style:\s*([^;]+);/.exec(css)?.[1].trim() ?? 'normal';
  const range = /unicode-range:\s*([^;]+);/.exec(css)?.[1].trim();
  return url ? { url, weight, style, range } : null;
}

async function download(url, file) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${file}: download failed ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(join(OUT, file), bytes);
  return bytes.length;
}

async function googleSans() {
  // Regular + italic at 400/500/600/700. Italic is not decoration here: the
  // hero headline leans on it to separate the imperative from the promise.
  const family = 'Google+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600';
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`, {
    headers: { 'User-Agent': UA },
  })).text();

  const keep = new Set(['latin', 'latin-ext']);
  const found = chunks(css).filter((c) => keep.has(c.subset));
  if (!found.length) throw new Error('google-sans: no latin subsets');

  let total = 0;
  for (const { subset, css: block } of found) {
    const meta = parse(block);
    if (!meta) continue;
    const file = `google-sans-${meta.weight.replace(/\s+/g, '-')}${meta.style}-${subset}.woff2`;
    total += await download(meta.url, file);
  }
  return { files: found.length, bytes: total };
}

async function materialSymbols() {
  const names = await glyphNames();
  const url =
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded' +
    `:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=${names.join(',')}&display=block`;

  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const blocks = chunks(css).length
    ? chunks(css).map((c) => c.css)
    : [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);

  const meta = blocks.map(parse).find(Boolean);
  if (!meta) throw new Error('material-symbols: no @font-face in response');

  const bytes = await download(meta.url, 'material-symbols-rounded.woff2');
  return { files: 1, bytes, glyphs: names.length };
}

await mkdir(OUT, { recursive: true });

// Clear anything from an earlier run so a renamed file cannot linger.
for (const stale of ['material-symbols-rounded-fallback.woff2']) {
  await unlink(join(OUT, stale)).catch(() => {});
}

const a = await googleSans();
console.log(`google-sans          ${a.files} files  ${(a.bytes / 1024).toFixed(0)} KB`);

const b = await materialSymbols();
console.log(
  `material-symbols     ${b.files} file   ${(b.bytes / 1024).toFixed(0)} KB  (${b.glyphs} glyphs)`,
);
console.log(`\ntotal               ${((a.bytes + b.bytes) / 1024).toFixed(0)} KB -> public/fonts`);
