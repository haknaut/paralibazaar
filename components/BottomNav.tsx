'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { isActive, NAV_ITEMS } from '@/lib/nav';
import { Icon } from './Icon';

/**
 * Mobile tab bar. A phone pattern — thumb reach, five targets, no chrome.
 * Hidden from `lg` up, where the header takes over with a horizontal top-nav;
 * a tab bar stretched across 1440px reads as a phone layout that failed to
 * notice the screen it was on.
 */
export function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('navHome')}
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-canvas lg:hidden"
    >
      <ul className="mx-auto flex w-full max-w-lg items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-1 text-caption ${
                  active ? 'text-primary' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {/* Carbon marks the current tab with a rule, not a filled pill. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-0.5 transition-colors ${
                    active ? 'bg-primary' : 'bg-transparent'
                  }`}
                />
                <Icon name={item.icon} size={20} className="icon-optical" />
                {/* leading-tight keeps the two-row stack compact, and nowrap
                    stops Hindi/Punjabi labels (2-3x the width of the English
                    ones) from wrapping and pushing the icon off-centre. The
                    label is allowed to ellipsis rather than break the row. */}
                <span className="label-optical max-w-full truncate leading-tight whitespace-nowrap">
                  {t(item.key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
