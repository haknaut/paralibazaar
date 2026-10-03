'use client';

import { useI18n } from '@/lib/i18n';
import { STATUS_STEP, type ListingStatus } from '@/lib/constants';
import type { TranslationKey } from '@/lib/translations';

export const STATUS_LABEL_KEY: Record<ListingStatus, TranslationKey> = {
  open: 'statusOpen',
  offer: 'statusOffer',
  pickup: 'statusPickup',
  collected: 'statusCollected',
};

/**
 * Carbon status tags carry a colour indicator next to ink text rather than
 * coloured text on a tint — the semantic hues stay legible at 12px and the
 * label keeps full contrast. Colour is the only thing that changes.
 */
const STATUS_STYLES: Record<ListingStatus, { box: string; dot: string }> = {
  open: { box: 'border-hairline bg-canvas', dot: 'bg-ink-subtle' },
  offer: { box: 'border-primary/40 bg-canvas', dot: 'bg-primary' },
  pickup: { box: 'border-support-warning bg-canvas', dot: 'bg-support-warning' },
  collected: { box: 'border-support-success/40 bg-canvas', dot: 'bg-support-success' },
};

export function StatusPill({ status, className = '' }: { status: ListingStatus; className?: string }) {
  const { t } = useI18n();
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-caption whitespace-nowrap text-ink ${style.box} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 ${style.dot}`} aria-hidden="true" />
      {t(STATUS_LABEL_KEY[status])}
    </span>
  );
}

/**
 * The four-step pipeline: Open → Offer made → Pickup scheduled → Collected.
 *
 * Segments only, no per-step captions. Four stretched labels repeated what the
 * StatusPill beside it already said, and "Pickup scheduled" wrapped to two lines
 * the moment the card was placed in a two-column laptop grid. The current step
 * is marked by a taller rule so position is still readable at a glance, and the
 * whole sequence is announced to assistive tech.
 */
export function StatusTrack({ status }: { status: ListingStatus }) {
  const { t } = useI18n();
  const current = STATUS_STEP[status];
  const steps: ListingStatus[] = ['open', 'offer', 'pickup', 'collected'];

  return (
    <ol
      className="flex items-center gap-1"
      aria-label={`${t('statusOpen')} → ${t('statusOffer')} → ${t('statusPickup')} → ${t('statusCollected')}`}
    >
      {steps.map((step, index) => {
        const done = index <= current;
        const isCurrent = index === current;
        return (
          <li
            key={step}
            className={`w-full transition-all duration-300 ease-[cubic-bezier(0.2,0,0.38,1)] ${
              isCurrent ? 'h-2' : 'h-1'
            } ${done ? 'bg-primary' : 'bg-surface-2'}`}
          >
            <span className="sr-only">
              {t(STATUS_LABEL_KEY[step])}
              {done ? '' : ' —'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
