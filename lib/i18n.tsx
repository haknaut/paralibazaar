'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICTIONARIES, type TranslationKey } from './translations';
import type { Language } from './types';

const STORAGE_KEY = 'paralibazaar.lang';

type I18nValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Look up a key; extra args fill `%s` placeholders. */
  t: (key: TranslationKey, ...args: (string | number)[]) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === 'en' || stored === 'hi' || stored === 'pa') setLangState(stored);
    } catch {
      // Private mode or blocked storage — English is a fine fallback.
    }
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, ...args: (string | number)[]) => {
      const template = DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? String(key);
      if (args.length === 0) return template;
      let i = 0;
      return template.replace(/%s/g, () => String(args[i++] ?? ''));
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
