'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAsyncData } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';
import type { ImpactTotals } from '@/lib/types';
import { Skeleton } from './States';
import { Icon, type IconName } from './Icon';

type ImpactResponse = { totals: ImpactTotals };

/** Eases from 0 to `target` over ~0.9s so the numbers feel live on first paint. */
function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(target * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

function Counter({
  icon,
  label,
  value,
  suffix,
  digits = 0,
  lang,
  delay,
}: {
  icon: IconName;
  label: string;
  value: number;
  suffix: string;
  digits?: number;
  lang: 'en' | 'hi' | 'pa';
  delay: number;
}) {
  const animated = useCountUp(value);
  return (
    <div className="card animate-rise p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <span className="text-primary" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      {/* tabular-nums stops the number from shifting sideways as it counts. */}
      <p className="mt-3 text-display-md text-ink [font-variant-numeric:tabular-nums] [font-weight:600]">
        {formatNumber(animated, lang, digits)}
        {suffix && <span className="ml-0.5 text-body-lg text-ink-muted">{suffix}</span>}
      </p>
      <p className="mt-1 text-caption leading-snug text-ink-muted">{label}</p>
    </div>
  );
}

export function ImpactCounters() {
  const { t, lang } = useI18n();
  const { data, loading, error } = useAsyncData<ImpactResponse>(() =>
    fetch('/api/impact', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="mt-3 h-8 w-28" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <div className="card px-5 py-6 text-sm text-ink-muted">{t('errorGeneric')}</div>;
  }

  const { totals } = data;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Counter
          icon="wheat"
          label={t('counterTonnes')}
          value={totals.tonnesDiverted}
          suffix=" t"
          digits={1}
          lang={lang}
          delay={0}
        />
        <Counter
          icon="earth"
          label={t('counterCo2')}
          value={totals.co2Avoided}
          suffix=" t"
          digits={1}
          lang={lang}
          delay={70}
        />
        <Counter
          icon="rupee"
          label={t('counterEarned')}
          value={totals.rupeesEarned}
          suffix=""
          lang={lang}
          delay={140}
        />
        <Counter
          icon="ledger"
          label={t('counterListings')}
          value={totals.listings}
          suffix=""
          lang={lang}
          delay={210}
        />
      </div>
      <p className="mt-4 text-caption text-ink-muted">
        {t('impactTotalPickups')}: {formatNumber(totals.collected, lang)} · {t('impactTotalFarmers')}:{' '}
        {formatNumber(totals.farmersHelped, lang)} · {t('impactTotalDistricts')}:{' '}
        {formatNumber(totals.districtCount, lang)}
      </p>
      <Link
        href="/impact"
        className="mt-2 inline-flex items-center gap-2 text-body-sm text-primary hover:text-ink"
      >
        {t('impactSeeAll')}
        <Icon name="send" size={16} />
      </Link>
    </div>
  );
}
