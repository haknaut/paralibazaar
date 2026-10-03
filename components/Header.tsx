'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { isActive, NAV_ITEMS } from '@/lib/nav';
import { LANGUAGES } from '@/lib/translations';
import { toggleTheme } from '@/lib/theme';
import { Icon } from './Icon';
import { Logo } from './Logo';

/** Keeps the <html lang> attribute honest for screen readers and font shaping. */
function HtmlLangSync() {
  const { lang } = useI18n();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

export function Header() {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();

  return (
    <>
      <HtmlLangSync />

      {/* Carbon top-nav: flat canvas, 1px bottom hairline, 48px tall, no shadow.
          On a laptop the section links live here rather than in a tab bar. */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
        <div className="flex h-12 w-full items-center gap-2 px-6 sm:px-10 lg:px-16">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={t('brandName')}>
            <Logo size={28} />
            {/*
              Single-line lockup, deliberately. A name-over-tagline block is
              ~38px tall inside this 48px bar, so the name lands in the top half
              and its optical centre sits ~10px above the mark's — which is the
              "text floats too high" it used to look like. One line, and the two
              centres coincide exactly. The tagline moved to the footer, where
              it has room to read as a sign-off.

              No responsive hiding needed: measured at 1024px — the tightest
              width that still shows the section nav — the whole bar including
              the widest labels (Punjabi) fits with zero overflow.
            */}
            <span className="text-body-sm text-emphasis whitespace-nowrap text-ink">
              {t('brandName')}
            </span>
          </Link>

          {/* Desktop section nav. Carbon marks the current page with a 2px blue
              rule under the label rather than a filled background.

              `whitespace-nowrap` is load-bearing for Hindi and Punjabi: those
              labels run two words and 2-3x the width of the English ones, and
              letting them wrap put the icon halfway down a two-line stack. */}
          <nav aria-label={t('navHome')} className="ml-3 hidden h-full items-stretch lg:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-2 whitespace-nowrap px-3.5 text-body-sm ${
                    active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-0.5 transition-colors ${
                      active ? 'bg-primary' : 'bg-transparent'
                    }`}
                  />
                  <Icon
                    name={item.icon}
                    size={16}
                    className={`icon-optical ${active ? '' : 'text-ink-subtle'}`}
                  />
                  <span className="label-optical">{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-stretch gap-2">
            {/* Theme toggle. Both glyphs are rendered and CSS paints the one
                matching `html[data-theme]`, so there is nothing theme-dependent
                in the markup and therefore no hydration mismatch. */}
            <button
              type="button"
              onClick={() => toggleTheme()}
              aria-label={t('themeToggle')}
              className="flex items-center justify-center border border-hairline px-2.5 text-ink-muted transition-colors hover:bg-surface-1 hover:text-ink"
            >
              <span className="theme-icon theme-icon-light">
                <Icon name="lightMode" size={18} />
              </span>
              <span className="theme-icon theme-icon-dark">
                <Icon name="darkMode" size={18} />
              </span>
            </button>

            {/* Square segmented control — Carbon commits to 0px corners. */}
            <div className="flex items-stretch border border-hairline">
              {LANGUAGES.map((option) => {
                const active = option.code === lang;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setLang(option.code)}
                    aria-pressed={active}
                    aria-label={`${t('languageLabel')}: ${option.label}`}
                    className={`min-h-8 border-r border-hairline px-2 text-caption transition-colors last:border-r-0 sm:px-3 ${
                      active
                        ? 'bg-ink text-inverse-ink'
                        : 'bg-canvas text-ink-muted hover:bg-surface-1 hover:text-ink'
                    }`}
                  >
                    {option.native}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
