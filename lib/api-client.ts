'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A tiny typed fetch helper for the demo's API routes.
 *
 * It never throws: on any network or parse failure it resolves to `null` so
 * callers can show an error state instead of crashing the page.
 */
export async function apiGet<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function apiPost<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      // Surface the server's own error message when it sent one.
      const detail = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(detail?.error ?? `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
  } catch (error) {
    // A fetch failure throws TypeError; anything else is the server's own
    // message from above and must reach the caller untouched.
    if (error instanceof TypeError) throw new Error('Network unavailable');
    throw error;
  }
}

/** Runs `loader` on mount, tracking loading/error state and allowing a retry. */
export function useAsyncData<T>(loader: () => Promise<T | null>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    setLoading(true);
    setError(false);
    const result = await loaderRef.current();
    if (result === null) {
      setError(true);
    } else {
      setData(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
