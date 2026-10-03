# ParaliBazaar — Don't burn it. Sell it.

A marketplace that connects Punjab farmers who have leftover paddy stubble (*parali*) with
buyers who want it, so the straw gets collected instead of burned.

Built for **UN SDG 13 — Climate Action**.

---

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

That's it. There is no database, no login, no API key, and no `.env` file required. The app
seeds itself with 25 farmer listings, 6 buyers and 40 fire hotspots the first time it boots.
Restarting `npm run dev` resets everything back to the seed.

> If port 3000 is busy, Next will pick the next free one and print it in the terminal
> (`Local: http://localhost:3001`, etc.).

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| **`npm run stop`** | **Stop this project's Node processes and free the memory** |
| `npm run stop:dry` | Show what `stop` would kill, without killing it |
| `npm run stop:all` | Stop *every* Node process (asks first) |
| `npm run check:i18n` | Verify all three dictionaries have the same keys |
| `npm run assets` | Rebuild `public/assets/*.jpg` from the PNG sources |

### Freeing memory

`next dev` keeps a Node process resident after you stop looking at it — server, file watcher and
a background compiler, commonly 1–2 GB. That is usually what makes a laptop start swapping and
feel like it is crashing. When you are done demoing:

```bash
npm run stop
```

It finds the Node processes whose command line references *this* project and ends them, leaving
any other Node work you have running alone, then trims the working sets so the RAM actually comes
back. Run `npm run stop:dry` first if you want to see the list.

---

## Environment variables (all optional)

The demo is fully functional with **none** of these set. Add them to `.env.local` only if you
want the live/upgraded behaviour.

| Variable | Default | If set |
| --- | --- | --- |
| `GEMINI_API_KEY` | *(unset)* | The farmer voice/text intake is parsed by Gemini instead of the built-in regex parser. Get a free key at [aistudio.google.com](https://aistudio.google.com/apikey). |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Which Gemini model to call. |
| `FIRMS_MAP_KEY` | *(unset)* | Fire Watch pulls **live** NASA FIRMS satellite fire detections instead of sample data. Free key: [firms.modaps.eosdis.nasa.gov/api/area](https://firms.modaps.eosdis.nasa.gov/api/area/) (takes a few minutes to activate). |

Example `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
FIRMS_MAP_KEY=your_key_here
```

**Nothing breaks if a key is missing, is wrong, or the network is down.** Every LLM and
satellite call is wrapped in a fallback:

- No `GEMINI_API_KEY` (or a failed call) → the offline parser in `lib/parse-fallback.ts` runs
  instead. It understands romanised Punjabi, Gurmukhi and Devanagari, and it is what powers the
  demo when you have no key.
- No `FIRMS_MAP_KEY` (or a failed call) → 40 realistic sample hotspots across all 18 Punjab
  districts, regenerated relative to "now" so the map always looks current.

The UI says which mode you are in ("Sample data" / "Live FIRMS"), so you never have to guess.

---

## What's in the app

| Page | What it does |
| --- | --- |
| `/` | Landing: hero ("Don't burn it. Sell it."), the stubble-burning problem, 3-step how-it-works, live impact counters, and the two big role buttons. |
| `/farmer` | Post your parali. Voice (Web Speech API mic) or text intake → `/api/parse` auto-fills the form. On submit you get a success card with estimated earnings and CO₂ avoided. |
| `/buyer` | Browse parali. List ⇄ map toggle, filters (district, min acres, crop, date), 6 seeded buyer profiles, and "Make offer" / "Book pickup" which walk a listing through Open → Offer made → Pickup scheduled → Collected. |
| `/fire-watch` | Leaflet map of Punjab fire hotspots. Click one to see nearby farmers with listings and fire off a simulated SMS alert ("a buyer will pay ₹840/acre"). |
| `/impact` | Totals (tonnes diverted, CO₂e avoided, PM2.5, ₹ earned), weekly trend + by-district charts, status funnel, and the assumptions panel. |

Mobile-first: header with language toggle on top, bottom tab bar on phones, and large touch
targets sized for a bright outdoor screen.

### Languages

English / हिन्दी / ਪੰਜਾਬੀ, toggled in the header. The chosen language is saved to `localStorage` and
also sets `<html lang>`. The intake parser reads all three scripts.

Everything the interface renders is translated — **including the data**, which was the part that
used to leak English. Districts, village names, buyer names, buyer blurbs, the filter options, the
statuses and the WhatsApp share text all resolve through the dictionary, so a Punjabi speaker sees
`ਜਸਪੁਰ · ਲੁਧਿਆਣਾ` and not `Jaspur · Ludhiana`.

How that works:

- **UI chrome** — every string lives in [`lib/translations.ts`](lib/translations.ts). `TranslationKey`
  is derived from the English dictionary and `hi`/`pa` are typed against it, so TypeScript fails the
  build if a key is added to `en` and not to the other two.
- **Data** — districts, villages and buyers live in English in [`data/seed.ts`](data/seed.ts)
  because they double as API payload and stored records; they must not be rewritten per language.
  [`lib/labels.ts`](lib/labels.ts) maps a value onto its translation key at render time, with a
  fallback to the raw value so a new district degrades to English instead of crashing.
- **Keeping it honest** — `npm run check:i18n` reports any key that is missing from a dictionary or
  still identical to English. `npm run gen:i18n` regenerates the data-layer block in all three
  dictionaries at once (it is idempotent, so re-running is safe).

Farmer personal names are the deliberate exception — a seller's name is a proper noun they typed
themselves, so it is shown as given rather than transliterated.

---

## 2-minute demo script

Open the app in a phone-sized window (or DevTools device mode) before you start.

**0:00 — Landing (15s).**
"Don't burn it. Sell it." Scroll to the problem photos and the 3 steps. Point at the impact
counters: *tonnes diverted, CO₂e avoided, money paid to farmers*. Press **I'm a Farmer**.

**0:15 — Farmer, the money shot (45s).**
Tap the 🎤 mic (or type — the mic needs Chrome and permission, so have the text box as a
backup) and say:

> "Mere 10 acre jhona hai, Ludhiana, 5 din ch ready"

The form auto-fills: 10 acres, paddy, Ludhiana, ready in 5 days. *Then switch the header to
**ਪੰਜਾਬੀ** and paste the Gurmukhi version — the parser handles it too:*

> `ਮੇਰੇ 15 ਏਕੜ ਕਣਕ ਦੀ ਪਰਾਲੀ ਹੈ, ਮੁਕਤਸਰ, ਅੱਜ ਤੱਯਾਰ ਹੈ, ਗੱਲੀ ਬਣੀ`

Fill name/phone, hit Post, and land on the success card: **₹35,000**, **31.9 t CO₂e avoided**
(25 t of straw × 1.5 t CO₂e/t × the 0.85 "collection isn't free" factor). That's the emotional
beat — a farmer seeing money where there used to be smoke.

**1:00 — Buyer marketplace (30s).**
Bottom nav → **Buyer**. Filter to Ludhiana, toggle to **Map** (Leaflet + OpenStreetMap, price
pins). Scroll the buyer roster — biomass power, brick kiln, cattle feed, paper mill, baler,
compost. Back on a card: **Make offer** at ₹1,500/tonne → the status pill moves to *Offer made*
→ **Book pickup** → *Pickup scheduled*. State changes are real; refresh and it sticks.

**1:30 — Fire watch (20s).**
Bottom nav → **Fire watch**. 40 hotspots, red markers, live stats. Click a marker →
**Nearby farmers with listings** with phone numbers. Hit **Send alert: a buyer will pay ₹840/acre**
→ simulated SMS toast lands. This is the bridge between the fire and the marketplace.

**1:50 — Impact (10s).**
Bottom nav → **Impact**. Land on the totals, then scroll to **How we calculate this** and show
the assumptions. Judges will ask about the numbers — the answer is on screen, not in your head.

**Backup answers if you're asked:**
- *"Where does 2.5 t/acre come from?"* → `lib/constants.ts`, with the reasoning in comments.
- *"What if there's no API key?"* → regex fallback, still trilingual. Say it out loud; it's a feature.
- *"How would this scale?"* → swap `lib/store.ts` for a real database; the API routes are already
  the seam.

---

## Project structure

```
app/
  layout.tsx            fonts, Toast + i18n providers
  page.tsx              landing
  farmer/ buyer/ fire-watch/ impact/    the four main pages
  api/
    parse/route.ts      Gemini extraction + regex fallback
    listings/route.ts   GET (filters) / POST (create, validated)
    listings/[id]/      GET / POST  (offer | schedule | collect)
    hotspots/route.ts   NASA FIRMS CSV, falls back to sample data
    alerts/route.ts     GET nearby farmers / POST simulated SMS
    impact/route.ts     totals, trend, by-district, by-status
components/             UI (map/ holds the Leaflet wrappers)
data/seed.ts            25 listings, 6 buyers, 40 hotspots
lib/
  constants.ts          every assumption + district list + image map
  store.ts              in-memory store (globalThis, survives hot reload)
  translations.ts       en / hi / pa string tables
  parse-fallback.ts     Unicode-safe trilingual parser
public/assets/          13 local photos
```

### Assumptions (all in [`lib/constants.ts`](lib/constants.ts), with comments)

| Constant | Value | Note |
| --- | --- | --- |
| `STRAW_TONNES_PER_ACRE` | 2.5 t | 1 acre of paddy leaves ~2.5 t of straw |
| `DEFAULT_PRICE_PER_TONNE` | ₹1,400 | Punjab loose-parali market rate |
| `MIN_OFFER_PER_TONNE` / `MAX_OFFER_PER_TONNE` | ₹800 / ₹2,500 | Guard rails on buyer offers |
| `CO2_TONNES_PER_TONNE_BURNED` | 1.5 t | Burning 1 t of straw ≈ 1.5 t CO₂e |
| `CO2_AVOIDED_FACTOR` | 0.85 | Discount 15% — baling and trucking burn diesel too |
| `PM25_GRAMS_PER_TONNE_BURNED` | 2.5 g | Deliberately conservative for the cleaner-air estimate |

### Data

No database. The store is a plain array in `globalThis` under a `Symbol`, seeded from
`data/seed.ts` on first request and **reset on every server restart**. That is deliberate for a
hackathon demo: always the same numbers, always a working app, nothing to install. Swap
`lib/store.ts` for a real database and the rest of the app is unchanged.

Seed pins are jittered around each district's centre, so a map never stacks 25 markers on one
pixel and "nearby farmers" distances are meaningful.

### Images

All photos are local, in `public/assets/`. No remote image URLs anywhere. Buyer cards deliberately
use photos of straw being *handled or used* — never a burning field — and each of the six gets a
different picture, so the roster does not read as filler.

The PNG originals are kept alongside the JPEGs the app actually loads. Rebuild the JPEGs after
changing a source image:

```bash
npm run assets        # needs Python with Pillow
```

That script downsamples to a 1600px long edge and writes progressive JPEG at quality 82. It
never touches the PNGs. The last run took the asset folder from 40.2 MB of PNG to 2.3 MB of
JPEG — a 94% reduction, and the difference between a demo that loads on a phone and one that
does not.

### Type & icons

- **Google Sans** renders English, Hindi and Punjabi (measured — it wins the
  stack for Gurmukhi text, so the two Noto faces behind it are fallback only).
  Every TTF is subset to the scripts the app uses (Latin + Indic +
  punctuation), which took `public/fonts` from ~17 MB to under 1 MB with
  pixel-identical rendering.
- The Google Sans and Material Symbols files are **self-hosted** from `public/fonts`, so a live
  demo has no font request to the network and cannot font-swap mid-pitch.
- `next/font/google` cannot load these two families — its bundled font list predates both — which
  is why they are declared with plain `@font-face` in `app/globals.css`.
- Icons are **Material Symbols Rounded**, one weight, mapped to app concepts in
  [`lib/icons.ts`](lib/icons.ts). That map is the single source of truth for both the renderer and
  any future subsetting, so the shipped font can only ever contain glyphs the app can draw.
- The scrollbar is hidden (`scrollbar-width: none`) but `scroll-behavior: smooth` is kept, so
  animated scrolling still works.

---

## Notes & known limits

- **No auth and no payments.** By design — the demo is a marketplace, not a payments product.
- **The mic needs Chrome + microphone permission and an internet connection** (the Web Speech
  API is browser-provided). The text box does the same job and always works; the README demo
  script uses both.
- **Estimates, not measurements.** Every environmental number on the impact page comes from the
  assumptions table above. Good for showing direction, not for a compliance report.
- The store lives in server memory, so running two dev servers gives you two independent
  universes. That's the point of the demo; don't use it in production. It also means an edit to
  `data/seed.ts` or to `lib/constants.ts` images will not show up until you restart the dev
  server — `npm run stop && npm run dev`.
- **Farmer names stay in Latin script** in Hindi and Punjabi. A seller's name is a proper noun
  they typed themselves, not UI copy, so it is shown as given rather than transliterated.
  Everything the interface controls — districts, villages, buyer names and blurbs, filters,
  statuses, share text — is translated in all three languages.
