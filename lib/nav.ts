import type { TranslationKey } from './translations';
import type { IconName } from '@/components/Icon';

/**
 * One navigation definition, used by both the desktop top-nav and the mobile
 * tab bar. Keeping a single list means the two chrome treatments can never
 * drift apart — a bug that is invisible until someone adds a sixth page.
 */
export type NavItem = {
  href: string;
  key: TranslationKey;
  icon: IconName;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/', key: 'navHome', icon: 'user' },
  { href: '/farmer', key: 'navFarmer', icon: 'wheat' },
  { href: '/buyer', key: 'navBuyer', icon: 'scale' },
  { href: '/fire-watch', key: 'navFireWatch', icon: 'fire' },
  { href: '/impact', key: 'navImpact', icon: 'chart' },
];

/** True when `pathname` belongs to `href`, respecting the nested `/farmer/*` routes. */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}
