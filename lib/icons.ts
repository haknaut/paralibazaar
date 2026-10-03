/**
 * Icon name -> Material Symbols Rounded glyph.
 *
 * Single source of truth. `components/Icon.tsx` renders from this, and
 * `scripts/fetch-fonts.mjs` reads the values to request a subset font from the
 * Google Fonts `icon_names=` endpoint. Keeping one map means the shipped font
 * always contains exactly the glyphs the app can render — the full Material
 * Symbols font is 5.2 MB, the subset is a few kilobytes.
 *
 * Names follow Material Symbols' own vocabulary where one exists.
 */
export const ICON_GLYPHS = {
  wheat: 'agriculture',
  leaf: 'eco',
  bale: 'inventory_2',
  grain: 'grain',

  fire: 'local_fire_department',
  earth: 'public',
  wind: 'air',
  cloud: 'cloud',

  rupee: 'currency_rupee',
  chart: 'bar_chart',
  list: 'format_list_bulleted',
  ledger: 'receipt_long',

  map: 'map',
  pin: 'location_on',
  target: 'my_location',

  phone: 'call',
  mic: 'mic',
  stop: 'stop_circle',
  send: 'send',
  check: 'check',
  checkCircle: 'check_circle',
  close: 'close',
  chat: 'chat',
  clock: 'schedule',
  user: 'person',
  warning: 'warning',
  info: 'info',

  sync: 'sync',
  signal: 'sensors',
  beaker: 'science',
  scale: 'storefront',
  filter: 'filter_list',
  menu: 'menu',

  // Paired with the theme attribute in globals.css: both are always in the DOM
  // and CSS paints whichever matches the active theme.
  lightMode: 'light_mode',
  darkMode: 'dark_mode',
} as const satisfies Record<string, string>;

export type IconName = keyof typeof ICON_GLYPHS;

/** Every glyph the app can ask for, de-duplicated. */
export const ALL_GLYPHS: string[] = [...new Set(Object.values(ICON_GLYPHS))];
