'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PRICE_PER_TONNE } from '@/lib/constants';
import { formatNumber, formatTimeAgo } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { LeafletMap } from './map/LeafletMap';
import type { MapPoint } from './map/types';
import { Skeleton } from './States';
import { useToast } from './Toast';
import type { FarmerListing, Hotspot } from '@/lib/types';
import { Icon } from './Icon';
import { districtLabel } from '@/lib/labels';

type HotspotsResponse = {
  hotspots: Hotspot[];
  source: 'firms' | 'sample';
  live: boolean;
  liveEnabled?: boolean;
  warning?: string;
};

type AlertResponse = {
  sent: number;
  pricePerAcre: number;
  message: string;
  recipients: { name: string; village: string; phone: string; distanceKm: number }[];
};

const NEARBY_RADIUS_KM = 25;

export function FireWatch() {
  const { t, lang } = useI18n();
  const { show } = useToast();

  const [hotspots, setHotspots] = useState<Hotspot[] | null>(null);
  const [meta, setMeta] = useState<{ source: 'firms' | 'sample'; live: boolean; liveEnabled: boolean }>({
    source: 'sample',
    live: false,
    liveEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [nearby, setNearby] = useState<FarmerListing[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [alerting, setAlerting] = useState(false);

  const load = useCallback(async (live: boolean) => {
    setLoading(true);
    try {
      const url = live ? '/api/hotspots?live=1' : '/api/hotspots';
      const response = await fetch(url, { cache: 'no-store' });
      const data = (await response.json()) as HotspotsResponse;
      setHotspots(data.hotspots);
      setMeta({
        source: data.source,
        live: data.live,
        liveEnabled: Boolean(data.liveEnabled),
      });
      if (data.warning) {
        show({ tone: 'warn', title: t('navFireWatch'), body: t('fireError') });
      }
    } catch {
      show({ tone: 'warn', title: t('navFireWatch'), body: t('errorGeneric') });
    } finally {
      setLoading(false);
    }
  }, [show, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  // Whenever a hotspot is picked, find the farmers who would be able to help.
  useEffect(() => {
    if (!selected) {
      setNearby([]);
      return;
    }
    let cancelled = false;
    setNearbyLoading(true);
    fetch(
      `/api/alerts?lat=${selected.lat}&lng=${selected.lng}&radius=${NEARBY_RADIUS_KM}`,
      { cache: 'no-store' },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { listings: FarmerListing[] } | null) => {
        if (!cancelled) setNearby(data?.listings ?? []);
      })
      .catch(() => {
        if (!cancelled) setNearby([]);
      })
      .finally(() => {
        if (!cancelled) setNearbyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const points = useMemo<MapPoint[]>(
    () =>
      (hotspots ?? []).map((hotspot) => ({
        id: hotspot.id,
        lat: hotspot.lat,
        lng: hotspot.lng,
        badge: '',
        title: `${t('fireHotspotTitle')} · ${districtLabel(t, hotspot.district)}`,
        subtitle: `${hotspot.hectares} ha · ${formatTimeAgo(hotspot.detectedAt, lang)}`,
        tone: 'hotspot' as const,
        onClick: () => setSelected(hotspot),
      })),
    [hotspots, t, lang],
  );

  const stats = useMemo(() => {
    const list = hotspots ?? [];
    const hectares = list.reduce((sum, h) => sum + h.hectares, 0);
    const districts = new Set(list.map((h) => h.district)).size;
    const confidence =
      list.length === 0
        ? 0
        : Math.round((list.reduce((sum, h) => sum + h.confidence, 0) / list.length) * 100);
    return { count: list.length, hectares, districts, confidence };
  }, [hotspots]);

  const sendAlert = useCallback(async () => {
    if (!selected) return;
    setAlerting(true);
    // Quoted per acre because that is the unit a farmer thinks in. 2.5 t/acre
    // means the headline number is ~60% of the per-tonne market rate.
    const pricePerAcre = Math.round(DEFAULT_PRICE_PER_TONNE * 0.6);
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selected.lat,
          lng: selected.lng,
          pricePerAcre,
          radiusKm: NEARBY_RADIUS_KM,
        }),
      });
      if (!response.ok) throw new Error('alert failed');
      const data = (await response.json()) as AlertResponse;
      // The SMS preview is built from translated parts rather than the
      // server's English `message`, so the toast reads natively in whichever
      // language the user picked.
      show({
        tone: 'success',
        title: data.sent === 1 ? t('fireAlertSentOne') : t('fireAlertSent', data.sent),
        body: t('fireAlertSms', districtLabel(t, selected.district), pricePerAcre),
      });
    } catch {
      show({ tone: 'warn', title: t('somethingWrong'), body: t('errorGeneric') });
    } finally {
      setAlerting(false);
    }
  }, [selected, show, t]);

  return (
    <div className="space-y-5 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-display-md text-ink">
            <span className="text-support-error" aria-hidden="true">
              <Icon name="fire" size={28} />
            </span>
            {t('fireTitle')}
          </h1>
          <p className="mt-2 max-w-xl text-body text-ink-muted">{t('fireSub')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load(meta.liveEnabled)}
          disabled={loading}
          className="btn btn-tertiary !min-h-11"
        >
          <Icon name="sync" size={16} className={loading ? 'animate-spin' : undefined} />
          {loading ? t('fireRefreshing') : t('fireRefresh')}
        </button>
      </header>

      {/* Shown only when the satellite feed actually answered. Telling a farmer
          which API key is missing is our problem, not theirs — but live data
          arriving is worth saying out loud. */}
      {meta.source === 'firms' && (
        <p className="inline-flex items-center gap-2 border border-hairline bg-surface-1 px-3 py-1.5 text-caption text-ink-muted">
          <Icon name="signal" size={16} className="text-support-success" aria-hidden="true" />
          {t('fireLiveOn')}
        </p>
      )}

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCell
          label={t('fireStatActive')}
          value={loading ? null : formatNumber(stats.count, lang)}
          tone="text-support-error"
        />
        <StatCell
          label={t('fireStatHectares')}
          value={loading ? null : formatNumber(stats.hectares, lang, 0)}
          tone="text-support-error"
        />
        <StatCell
          label={t('fireStatDistricts')}
          value={loading ? null : formatNumber(stats.districts, lang)}
          tone="text-ink"
        />
        <StatCell
          label={t('fireStatConfidence')}
          value={loading ? null : `${stats.confidence}%`}
          tone="text-ink"
        />
      </div>

      {/* map */}
      {loading && !hotspots ? (
        <Skeleton className="h-80 w-full sm:h-[26rem]" />
      ) : (
        <LeafletMap
          points={points}
          selectedId={selected?.id ?? null}
          onSelect={(id) => setSelected((hotspots ?? []).find((h) => h.id === id) ?? null)}
          fitToPoints
          className="h-80 w-full sm:h-[26rem]"
        />
      )}

      <p className="flex items-center gap-2 text-caption font-semibold text-ink-muted">
        <span className="inline-flex items-center gap-1" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-support-error/30" />
          <span className="h-3 w-3 rounded-full bg-support-error" />
          <span className="h-5 w-5 rounded-full bg-support-error" />
        </span>
        {t('fireLegend')}
      </p>

      {/* selected hotspot detail */}
      {selected && (
        <section className="card animate-rise p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label text-support-error">
                {t('fireHotspotTitle')}
              </p>
              <h2 className="text-subhead font-normal text-ink">
                {districtLabel(t, selected.district)} · {selected.lat.toFixed(2)}, {selected.lng.toFixed(2)}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="btn btn-plain !min-h-9 !px-2"
            >
              <Icon name="close" size={18} />
              <span className="sr-only">{t('actionClose')}</span>
            </button>
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-none bg-surface-1 p-2.5">
              <dt className="text-caption text-ink-muted">{t('fireHectares')}</dt>
              <dd className="text-body font-semibold text-support-error">{selected.hectares} ha</dd>
            </div>
            <div className="rounded-none bg-surface-1 p-2.5">
              <dt className="text-caption font-semibold text-ink-muted">{t('fireConfidence')}</dt>
              <dd className="text-body font-semibold text-ink">
                {Math.round(selected.confidence * 100)}%
              </dd>
            </div>
            <div className="rounded-none bg-surface-1 p-2.5">
              <dt className="text-caption font-semibold text-ink-muted">{t('fireDetected')}</dt>
              <dd className="text-caption font-semibold text-ink">
                {formatTimeAgo(selected.detectedAt, lang)}
              </dd>
              <p className="text-caption text-ink-muted">
                {t('fireSatellite')} {selected.satellite}
              </p>
            </div>
          </dl>

          <h3 className="mt-4 text-sm font-bold text-ink">{t('fireNearbyTitle')}</h3>

          {nearbyLoading ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : nearby.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {nearby.slice(0, 4).map((listing) => (
                <li
                  key={listing.id}
                  className="flex items-center justify-between gap-3 rounded-none bg-surface-1 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {listing.farmerName}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {listing.village} · {listing.acres} {t('listingAcres')}
                    </p>
                  </div>
                  <span className="shrink-0 bg-surface-2 px-2.5 py-1 text-caption font-semibold text-ink">
                    {listing.phone}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-none bg-surface-1 px-3 py-2.5 text-xs font-semibold text-ink">
              {t('fireNearbyNone')}
            </p>
          )}

          <button
            type="button"
            onClick={() => void sendAlert()}
            disabled={alerting}
            className="btn btn-primary mt-3 w-full"
          >
            {alerting
              ? t('submitting')
              : t('fireAlertBtn', formatNumber(Math.round(DEFAULT_PRICE_PER_TONNE * 0.6), lang))}
          </button>

          {nearby.length > 0 && (
            <Link
              href="/buyer"
              className="mt-2 block text-center text-xs font-bold text-primary hover:underline"
            >
              {t('fireOpenListings', formatNumber(nearby.length, lang))}
            </Link>
          )}
        </section>
      )}

      {!selected && hotspots && hotspots.length > 0 && (
        <p className="flex items-center gap-3 border border-hairline bg-surface-1 px-4 py-3 text-body-sm text-ink-muted">
          <Icon name="pin" size={18} className="shrink-0 text-primary" aria-hidden="true" />
          {t('firePickHotspot')}
        </p>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone: string;
}) {
  return (
    <div className="card p-3.5">
      {value === null ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <p className={`text-headline [font-variant-numeric:tabular-nums] [font-weight:600] ${tone}`}>{value}</p>
      )}
      <p className="mt-1 text-caption leading-tight text-ink-muted">{label}</p>
    </div>
  );
}
