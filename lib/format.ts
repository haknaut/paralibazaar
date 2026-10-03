import { DICTIONARIES } from './translations';
import type { Language } from './types';

/**
 * Numbers, money, dates and relative time.
 *
 * Why this file computes everything itself instead of leaning on `Intl`: the
 * Chromium ICU build we ship against carries no Punjabi data, and it fails
 * *silently* rather than throwing. Measured on this machine, `pa-IN` gives:
 *
 *   Intl.NumberFormat      -> "₹ 123,400"   (Western grouping, lost lakh/crore)
 *   Intl.DateTimeFormat    -> "M09 14"      (raw CLDR pattern, not a date)
 *   Intl.RelativeTimeFormat-> "-10 h"       (untranslated fallback)
 *
 * Those strings are user visible on the cards and the map, so the formatters
 * below are deterministic and take their wording from the shared dictionaries.
 * English and Hindi happen to work via `Intl`, but one code path for all three
 * languages is the only way this stays correct.
 */

/** 1234567 -> "12,34,567" — Indian lakh/crore grouping. */
function groupIndian(value: number): string {
  const digits = String(Math.round(Math.abs(value)));
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  // Regroup everything before the final three digits into pairs.
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/** ₹1,23,400 — Indian digit grouping, whatever the language. */
export function formatRupees(value: number, _lang: Language = 'en'): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}₹${groupIndian(value)}`;
}

/** ₹1,434 — for "per tonne" prices, where the paisa is noise. */
export function formatRupeesShort(value: number, _lang: Language = 'en'): string {
  return formatRupees(value, _lang);
}

export function formatNumber(value: number, _lang: Language = 'en', digits = 0): string {
  const sign = value < 0 ? '-' : '';
  if (digits <= 0) return `${sign}${groupIndian(value)}`;
  const fixed = Math.abs(value).toFixed(digits);
  const [whole, fraction] = fixed.split('.');
  return `${sign}${groupIndian(Number(whole))}.${fraction}`;
}

function shortMonths(lang: Language): string[] {
  const table = DICTIONARIES[lang]?.monthShort ?? DICTIONARIES.en.monthShort;
  return table.split(',');
}

/** "3 Nov" / "3 ਨਵੰ" — short, fits on a phone card. */
export function formatShortDate(iso: string, lang: Language = 'en'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const month = shortMonths(lang)[date.getMonth()] ?? '';
  return `${date.getDate()} ${month}`.trim();
}

export function formatTimeAgo(iso: string, lang: Language = 'en'): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return dict.timeJustNow;
  if (minutes < 60) return dict.timeAgoMinutes.replace('%s', String(minutes));
  const hours = Math.round(minutes / 60);
  if (hours < 24) return dict.timeAgoHours.replace('%s', String(hours));
  return dict.timeAgoDays.replace('%s', String(Math.round(hours / 24)));
}

/** Today's date as yyyy-mm-dd in local time (never UTC-shifted). */
export function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function addDaysIso(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Great-circle distance in km — used to find farmers near a fire. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
