'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CO2_AVOIDED_FACTOR,
  CO2_TONNES_PER_TONNE_BURNED,
  DEFAULT_PRICE_PER_TONNE,
  IMAGES,
  PM25_GRAMS_PER_TONNE_BURNED,
  STRAW_TONNES_PER_ACRE,
  type ListingStatus,
} from '@/lib/constants';
import { Icon } from './Icon';
import { formatNumber, formatRupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useAsyncData } from '@/lib/api-client';
import { EmptyState, ErrorState, Skeleton } from './States';
import type { ImpactTotals, TrendPoint } from '@/lib/types';
import { districtLabel } from '@/lib/labels';

type DistrictRow = { district: string; tonnes: number; pickups: number };

type ImpactResponse = {
  totals: ImpactTotals;
  trend: TrendPoint[];
  byDistrict: DistrictRow[];
  byStatus: Record<ListingStatus, number>;
};

const STATUS_FLOW: ListingStatus[] = ['open', 'offer', 'pickup', 'collected'];
const STATUS_FILL: Record<ListingStatus, string> = {
  open: 'var(--color-ink-subtle)',
  offer: 'var(--color-primary)',
  pickup: 'var(--color-primary-active)',
  collected: 'var(--color-support-success)',
};

export function ImpactDashboard() {
  const { t, lang } = useI18n();
  const { data, loading, error, reload } = useAsyncData<ImpactResponse>(() =>
    fetch('/api/impact', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
  );

  const chartDistricts = useMemo(
    () => (data?.byDistrict ?? []).map((row) => ({ ...row, district: districtLabel(t, row.district) })),
    [data, t],
  );

  const flowData = useMemo(() => {
    if (!data) return [];
    return STATUS_FLOW.map((status) => ({ status, count: data.byStatus[status] ?? 0 }));
  }, [data]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <ErrorState onRetry={() => void reload()} />;

  const { totals, trend, byDistrict } = data;

  const headline = [
    { label: t('impactTotalTonnes'), value: `${formatNumber(totals.tonnesDiverted, lang, 1)} t`, icon: 'wheat' as const },
    { label: t('impactTotalCo2'), value: `${formatNumber(totals.co2Avoided, lang, 1)} t`, icon: 'earth' as const },
    { label: t('impactTotalPm25'), value: `${formatNumber(totals.pm25Grams, lang, 1)} g`, icon: 'wind' as const },
    { label: t('impactTotalRupees'), value: formatRupees(totals.rupeesEarned, lang), icon: 'rupee' as const },
  ];

  const secondary = [
    { label: t('impactTotalListings'), value: formatNumber(totals.listings, lang) },
    { label: t('impactTotalPickups'), value: formatNumber(totals.collected, lang) },
    { label: t('impactTotalFarmers'), value: formatNumber(totals.farmersHelped, lang) },
    { label: t('impactTotalBuyers'), value: formatNumber(totals.buyersOnboarded, lang) },
    { label: t('impactTotalDistricts'), value: formatNumber(totals.districtCount, lang) },
  ];

  const perAcreEarning = Math.round(STRAW_TONNES_PER_ACRE * DEFAULT_PRICE_PER_TONNE);
  const perAcreCo2 = Math.round(
    STRAW_TONNES_PER_ACRE * CO2_TONNES_PER_TONNE_BURNED * CO2_AVOIDED_FACTOR * 10,
  ) / 10;

  const assumptions = [
    {
      label: t('assumptionStraw'),
      value: `${STRAW_TONNES_PER_ACRE} t`,
      note: t('assumptionStrawNote'),
    },
    {
      label: t('assumptionBurn'),
      value: `${CO2_TONNES_PER_TONNE_BURNED} t`,
      note: t('assumptionBurnNote'),
    },
    {
      label: t('assumptionAvoid'),
      value: `${Math.round(CO2_AVOIDED_FACTOR * 100)}%`,
      note: t('assumptionAvoidNote'),
    },
    {
      label: t('assumptionPm'),
      value: `${PM25_GRAMS_PER_TONNE_BURNED} g`,
      note: t('assumptionPmNote'),
    },
    {
      label: t('assumptionPrice'),
      value: `₹${DEFAULT_PRICE_PER_TONNE}`,
      note: t('assumptionPriceNote'),
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <header>
        <h1 className="text-display-md text-ink">
          {t('impactPageTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('impactPageSub')}</p>
      </header>

      {/* ------------------------- headline ------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {headline.map((item, index) => (
          <div
            key={item.label}
            className="card animate-rise p-4"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span className="text-primary" aria-hidden="true">
              <Icon name={item.icon} size={22} />
            </span>
            <p className="mt-3 text-headline text-ink [font-variant-numeric:tabular-nums] [font-weight:600]">
              {item.value}
            </p>
            <p className="mt-1 text-caption leading-tight text-ink-muted">{item.label}</p>
          </div>
        ))}
      </div>

      {/* ------------------------- secondary ------------------------- */}
      <div className="card flex flex-wrap items-center justify-center gap-x-6 gap-y-2 p-4">
        {secondary.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-subhead text-ink [font-variant-numeric:tabular-nums]">{item.value}</p>
            <p className="mt-0.5 text-caption text-ink-muted">{item.label}</p>
          </div>
        ))}
      </div>

      {/* -------------------------- charts -------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('impactChartWeekly')} height={240}>
          {trend.some((point) => point.tonnes > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 0,
                    border: '1px solid var(--color-hairline)',
                    background: 'var(--color-canvas)',
                    color: 'var(--color-ink)',
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value} t`, t('impactChartLabelTonnes')]}
                />
                <Line
                  type="monotone"
                  dataKey="tonnes"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: 'var(--color-primary)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label={t('emptyTitle')} />
          )}
        </ChartCard>

        <ChartCard title={t('impactChartDistrict')} height={240}>
          {chartDistricts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDistricts} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
                <XAxis
                  dataKey="district"
                  tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={48}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(15,98,254,0.06)' }}
                  contentStyle={{
                    borderRadius: 0,
                    border: '1px solid var(--color-hairline)',
                    background: 'var(--color-canvas)',
                    color: 'var(--color-ink)',
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value} t`, t('impactChartLabelTonnes')]}
                />
                <Bar dataKey="tonnes" radius={[0, 0, 0, 0]} maxBarSize={36}>
                  {chartDistricts.map((row) => (
                    <Cell key={row.district} fill="var(--color-primary)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label={t('emptyTitle')} />
          )}
        </ChartCard>
      </div>

      {/* ------------------------- status flow ------------------------- */}
      <section className="card p-4">
        <h2 className="text-body-sm text-emphasis text-ink">{t('impactChartStatus')}</h2>
        <ul className="mt-4 space-y-3">
          {flowData.map((row, index) => {
            const max = Math.max(...flowData.map((r) => r.count), 1);
            const width = Math.max(2, (row.count / max) * 100);
            return (
              <li key={row.status}>
                <div className="mb-1.5 flex items-center justify-between text-caption">
                  <span className="text-ink-muted">
                    {t(
                      row.status === 'open'
                        ? 'statusOpen'
                        : row.status === 'offer'
                          ? 'statusOffer'
                          : row.status === 'pickup'
                            ? 'statusPickup'
                            : 'statusCollected',
                    )}
                  </span>
                  <span className="text-emphasis text-ink [font-variant-numeric:tabular-nums]">
                    {formatNumber(row.count, lang)}
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-1">
                  <div
                    className="animate-grow-x h-full"
                    style={{
                      width: `${width}%`,
                      background: STATUS_FILL[row.status],
                      animationDelay: `${index * 80}ms`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* --------------------- one acre is worth it --------------------- */}
      <section className="card overflow-hidden p-0">
        <div className="grid sm:grid-cols-[1fr_1.2fr]">
          <div className="relative min-h-40">
            <Image
              src={IMAGES.farmerBale}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
          <div className="p-5">
            <h2 className="text-subhead text-ink">{t('impactPerAcreTitle')}</h2>
            <p className="mt-1.5 text-body-sm text-ink-muted">{t('impactPerAcreBody')}</p>
            <div className="mt-5 flex gap-6">
              <div>
                <p className="text-headline text-ink [font-variant-numeric:tabular-nums] [font-weight:600]">
                  {formatRupees(perAcreEarning, lang)}
                </p>
                <p className="mt-1 text-caption text-ink-muted">{t('perAcre')}</p>
              </div>
              <div>
                <p className="text-headline text-ink [font-variant-numeric:tabular-nums] [font-weight:600]">
                  {perAcreCo2} t
                </p>
                <p className="mt-1 text-caption text-ink-muted">CO₂e {t('perAcre')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------- assumptions ------------------------- */}
      <section className="card p-4 sm:p-5">
        <h2 className="text-subhead text-ink">{t('impactAssumptionsTitle')}</h2>
        <p className="mt-0.5 text-body-sm text-ink-muted">{t('impactAssumptionsSub')}</p>

        <ul className="mt-4 space-y-2">
          {assumptions.map((item) => (
            <li key={item.label} className="card-raised p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-emphasis text-ink">{item.label}</p>
                <p className="shrink-0 font-mono text-body-sm text-primary">{item.value}</p>
              </div>
              <p className="mt-1.5 text-caption italic leading-snug text-ink-muted">{item.note}</p>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-caption italic leading-snug text-ink-muted">{t('impactFootnote')}</p>
      </section>

      {totals.listings === 0 && (
        <EmptyState title={t('emptyTitle')} body={t('emptyBody')} icon="chart" />
      )}
    </div>
  );
}

/** Small wrapper so every chart shares the same padding and empty state. */
function ChartCard({
  title,
  height,
  children,
}: {
  title: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-bold text-ink">{title}</h2>
      <div style={{ height }}>{children}</div>
    </section>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-none bg-surface-1 text-xs font-semibold text-ink-muted">
      {label}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
