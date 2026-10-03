/**
 * Theme handling.
 *
 * Deliberately not a React context. The theme must reach <html> before the
 * first paint, or a dark-mode user gets a white flash and the pitch starts with
 * a glitch. A provider cannot run early enough, so instead:
 *
 *   1. an inline script in <head> sets `data-theme` before paint,
 *   2. every colour is a custom property that re-points itself under
 *      `html[data-theme='dark']`, so flipping one attribute re-themes every
 *      surface, chart and map at once,
 *   3. the toggle renders both glyphs and lets CSS paint the right one.
 *
 * Because of (3) the toggle's markup is byte-identical on the server and the
 * client: no hydration mismatch, no state to keep in sync, no icon flicker.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'paralibazaar.theme';

/**
 * Runs before paint. Stored as a string so `layout.tsx` can inline it verbatim
 * — importing a function would mean shipping its module to the client first,
 * which is exactly the flash we are avoiding.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode or storage disabled — the theme still applies to this page.
  }
  return next;
}
