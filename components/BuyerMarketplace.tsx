'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CROP_TYPES, DISTRICT_KEYS, estimateTonnes } from '@/lib/constants';
import { formatNumber, formatRupeesShort } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useAsyncData } from '@/lib/api-client';
import { LeafletMap } from './map/LeafletMap';
import { toListingPoint, type MapPoint } from './map/types';
import { ListingCard } from './ListingCard';
import { EmptyState, ErrorState, Skeleton } from './States';
import { useToast } from './Toast';
import type { Buyer, FarmerListing } from '@/lib/types';
import { Icon } from './Icon';
import { buyerBlurbLabel, buyerNameLabel, districtLabel } from '@/lib/labels';

type Filters = {
  district: string;
  minAcres: number;
  crop: string;
  readyWithinDays: number;
};

const DEFAULT_FILTERS: Filters = { district: '', minAcres: 0, crop: '', readyWithinDays: 0 };

const ACRE_STEPS = [0, 5, 10, 15, 20, 30];
const DATE_STEPS = [0, 3, 7, 14, 30];

type ListingsResponse = { listings: FarmerListing[]; count: number };
type BuyersResponse = { buyers: Buyer[] };

export function BuyerMarketplace() {
  const { t, lang } = useI18n();
  const { show } = useToast();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [listings, setListings] = useState<FarmerListing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load the board on mount and whenever a filter changes.
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const params = new URLSearchParams();
    if (filters.district) params.set('district', filters.district);
    if (filters.minAcres > 0) params.set('minAcres', String(filters.minAcres));
    if (filters.crop) params.set('crop', filters.crop);
    if (filters.readyWithinDays > 0) params.set('readyWithinDays', String(filters.readyWithinDays));

    try {
      const response = await fetch(`/api/listings?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('load failed');
      const data = (await response.json()) as ListingsResponse;
      setListings(data.listings);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const buyers = useAsyncData<BuyersResponse>(() =>
    fetch('/api/impact', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
  );

  const points = useMemo<MapPoint[]>(() => {
    if (!listings) return [];
    return listings.map((listing) =>
      toListingPoint(listing, {
        acres: t('listingAcres'),
        asking: t('listingAsking'),
        price: formatRupeesShort(listing.askingPrice, lang),
      }),
    );
  }, [listings, t, lang]);

  const statusById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const listing of listings ?? []) map[listing.id] = listing.status;
    return map;
  }, [listings]);

  /* --------------------------- actions --------------------------- */

  const act = useCallback(
    async (id: string, body: Record<string, unknown>, successTitle: string, successBody: string) => {
      setBusyId(id);
      try {
        const response = await fetch(`/api/listings/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('action failed');
        const data = (await response.json()) as { listing: FarmerListing };
        setListings((current) =>
          current
            ? current.map((listing) => (listing.id === id ? data.listing : listing))
            : current,
        );
        show({ tone: 'success', title: successTitle, body: successBody });
      } catch {
        show({ tone: 'warn', title: t('somethingWrong'), body: t('errorGeneric') });
      } finally {
        setBusyId(null);
      }
    },
    [show, t],
  );

  const totalAvailable = useMemo(
    () =>
      (listings ?? [])
        .filter((l) => l.status !== 'collected')
        .reduce((sum, l) => sum + estimateTonnes(l.acres), 0),
    [listings],
  );

  // Computed separately: a bare `a || b || c` chain ends on the number 0 when
  // "minimum acres" is 0, and React would happily render that 0 on the page.
  const hasActiveFilters = Boolean(
    filters.district || filters.minAcres || filters.crop || filters.readyWithinDays,
  );

  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display-md text-ink">
            {t('buyerTitle')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t('buyerSub')}</p>
        </div>
        {listings && listings.length > 0 && (
          <div className="text-right">
            <p className="text-headline text-ink [font-weight:600]">
              {formatNumber(totalAvailable, lang, 0)} t
            </p>
            <p className="text-caption font-semibold text-ink-muted">
              {formatNumber(listings.length, lang)} {t('filterResults')}
            </p>
          </div>
        )}
      </header>

      {/* -------------------------- filters -------------------------- */}
      <section className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="f-district">
              {t('filterDistrict')}
            </label>
            <select
              id="f-district"
              className="field"
              value={filters.district}
              onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value }))}
            >
              <option value="">{t('filterAllDistricts')}</option>
              {DISTRICT_KEYS.map((district) => (
                <option key={district} value={district}>
                  {districtLabel(t, district)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="f-acres">
              {t('filterMinAcres')}
            </label>
            <select
              id="f-acres"
              className="field"
              value={filters.minAcres}
              onChange={(e) => setFilters((f) => ({ ...f, minAcres: Number(e.target.value) }))}
            >
              {ACRE_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step === 0 ? t('filterAnyAcres') : `${step}+ ${t('listingAcres')}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="f-crop">
              {t('filterCrop')}
            </label>
            <select
              id="f-crop"
              className="field"
              value={filters.crop}
              onChange={(e) => setFilters((f) => ({ ...f, crop: e.target.value }))}
            >
              <option value="">{t('filterAnyCrop')}</option>
              {CROP_TYPES.map((crop) => (
                <option key={crop} value={crop}>
                  {crop === 'paddy' ? t('cropPaddy') : t('cropWheat')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="f-date">
              {t('filterDate')}
            </label>
            <select
              id="f-date"
              className="field"
              value={filters.readyWithinDays}
              onChange={(e) =>
                setFilters((f) => ({ ...f, readyWithinDays: Number(e.target.value) }))
              }
            >
              {DATE_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step === 0
                    ? t('filterAnyDate')
                    : t('listingReady', `≤ ${formatNumber(step, lang)}d`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="mt-3 inline-flex items-center gap-1.5 text-body-sm text-primary hover:text-ink"
          >
            <Icon name="close" size={14} /> {t('filterReset')}
          </button>
        )}
      </section>

      {/* ------------------------ list / map ------------------------ */}
      {/* A tablist, sized to its content. Stretched across a 1440px laptop it
          read as two enormous buttons competing with the listings themselves. */}
      <div className="inline-flex border border-hairline" role="tablist">
        {(['list', 'map'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => setView(option)}
            className={`flex min-h-12 items-center justify-center gap-2 border-r border-hairline px-6 text-body-sm last:border-r-0 ${
              view === option
                ? 'bg-ink text-inverse-ink'
                : 'bg-canvas text-ink-muted hover:bg-surface-1 hover:text-ink'
            }`}
          >
            <Icon name={option === 'list' ? 'list' : 'map'} size={18} />
            {option === 'list' ? t('listTab') : t('mapTab')}
          </button>
        ))}
      </div>

      {failed && <ErrorState onRetry={() => void load()} />}

      {view === 'map' ? (
        <div className="space-y-3">
          <LeafletMap
            points={points}
            statusById={statusById}
            fitToPoints
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setView('list');
            }}
            className="h-80 w-full sm:h-[28rem]"
          />
          {loading && (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="card space-y-3 p-4">
              <div className="flex gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="ml-auto h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-11 w-full" />
            </li>
          ))}
        </ul>
      ) : listings && listings.length > 0 ? (
        <>
          {/* One 1380px-wide column of cards on a laptop is mostly empty space.
              Two columns from `sm`, three on a wide screen; each child carries
              its own stagger index so the list settles in rather than snapping. */}
          <ul className="animate-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {listings.map((listing, i) => (
              <li
                key={listing.id}
                id={`listing-${listing.id}`}
                className="scroll-mt-28"
                style={{ '--stagger-i': Math.min(i, 11) } as React.CSSProperties}
              >
                <ListingCard
                  listing={listing}
                  busy={busyId === listing.id}
                  onOffer={(price) =>
                    void act(listing.id, { action: 'offer', offerPrice: price }, t('offerThanks'), t('offerThanksBody'))
                  }
                  onBook={(date) =>
                    void act(listing.id, { action: 'schedule', pickupDate: date }, t('bookThanks'), t('bookThanksBody'))
                  }
                  onCollected={() =>
                    void act(listing.id, { action: 'collect' }, t('statusCollected'), t('collectedThanks'))
                  }
                />
              </li>
            ))}
          </ul>

          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="btn btn-tertiary w-full text-sm"
            >
              {t('mapTab')} ←
            </button>
          )}
        </>
      ) : (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="btn btn-primary mt-1"
            >
              {t('filterReset')}
            </button>
          }
        />
      )}

      {/* --------------------------- buyers --------------------------- */}
      <section className="pt-2">
        <h2 className="text-subhead font-normal text-ink">{t('buyersTitle')}</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{t('buyersSub')}</p>

        {buyers.loading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : buyers.data ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {buyers.data.buyers.map((buyer) => (
              <li key={buyer.id} className="card group flex flex-col overflow-hidden">
                <div className="relative h-28 w-full overflow-hidden">
                  <Image
                    src={buyer.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                  />
                  <span className="absolute top-2 left-2 bg-ink px-2.5 py-1 text-caption font-semibold text-inverse-ink">
                    {districtLabel(t, buyer.district)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <h3 className="text-body-sm text-emphasis text-ink">{buyerNameLabel(t, buyer)}</h3>
                  <p className="mt-1.5 text-caption leading-snug text-ink-muted">{buyerBlurbLabel(t, buyer)}</p>
                  <div className="mt-auto flex items-center justify-between pt-2.5">
                    <p className="text-body-sm font-semibold text-ink">
                      {formatRupeesShort(buyer.pricePerTonne, lang)}
                      <span className="text-caption font-semibold text-ink-muted">
                        {t('perTonne')}
                      </span>
                    </p>
                    <a
                      href={`tel:${buyer.phone.replace(/\s/g, '')}`}
                      className="btn btn-tertiary !min-h-9 !px-3 text-caption"
                    >
                      <Icon name="phone" size={14} /> {t('buyerCall')}
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card mt-4 px-4 py-6 text-center text-sm text-ink-muted">
            {t('errorGeneric')}
          </div>
        )}
      </section>
    </div>
  );
}
