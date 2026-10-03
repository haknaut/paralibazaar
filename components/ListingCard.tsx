'use client';

import Image from 'next/image';
import { useI18n } from '@/lib/i18n';
import {
  estimateTonnes,
  IMAGES,
  MIN_OFFER_PER_TONNE,
  MAX_OFFER_PER_TONNE,
} from '@/lib/constants';
import { formatRupees, formatRupeesShort, formatShortDate, todayIso } from '@/lib/format';
import { StatusPill, StatusTrack } from './StatusPill';
import type { FarmerListing } from '@/lib/types';
import { useState } from 'react';
import { districtLabel, villageLabel } from '@/lib/labels';

export function ListingCard({
  listing,
  onOffer,
  onBook,
  onCollected,
  busy,
}: {
  listing: FarmerListing;
  onOffer: (price: number) => void;
  onBook: (date: string) => void;
  onCollected: () => void;
  busy?: boolean;
}) {
  const { t, lang } = useI18n();
  const [showOffer, setShowOffer] = useState(false);
  const [showBook, setShowBook] = useState(false);

  const tonnes = estimateTonnes(listing.acres);
  const readyToday = listing.readyDate <= todayIso();
  const closed = listing.status === 'collected';

  // Three farmer photographs, picked by a stable hash of the listing id. A
  // single repeated thumbnail across all 25 cards reads as placeholder art;
  // three in rotation reads as a roster. The hash keeps it deterministic, so a
  // card never changes face between renders.
  const PORTRAITS = [IMAGES.farmerSmiling, IMAGES.farmerPortrait, IMAGES.community] as const;
  let hash = 0;
  for (let i = 0; i < listing.id.length; i++) hash = (hash * 31 + listing.id.charCodeAt(i)) | 0;
  const portrait = PORTRAITS[Math.abs(hash) % PORTRAITS.length];

  return (
    <article className="card card-interactive group h-full overflow-hidden">
      {/* thin photo strip gives the list a sense of place without heavy images */}
      <div className="flex items-stretch gap-0">
        <div className="relative hidden w-24 shrink-0 overflow-hidden sm:block">
          <Image src={portrait} alt="" fill sizes="96px" className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-body-sm text-emphasis text-ink">{listing.farmerName}</h3>
              <p className="truncate text-caption text-ink-muted">
                {villageLabel(t, listing.village)} · {districtLabel(t, listing.district)}
              </p>
            </div>
            <StatusPill status={listing.status} />
          </div>

          <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-body-sm">
            <div className="flex items-baseline gap-1">
              <dt className="sr-only">{t('labelAcres')}</dt>
              <dd className="text-body font-semibold text-ink">{listing.acres}</dd>
              <dd className="text-xs text-ink-muted">{t('listingAcres')}</dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="sr-only">{t('impactChartLabelTonnes')}</dt>
              <dd className="text-xs font-semibold text-ink-muted">
                {t('listingTonnes', tonnes)}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{t('labelSupply')}</dt>
              <dd className="bg-surface-1 px-2 py-0.5 text-caption text-ink-muted">
                {listing.supply === 'baled' ? t('listingBaled') : t('listingLoose')} ·{' '}
                {listing.crop === 'paddy' ? t('cropPaddy') : t('cropWheat')}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{t('labelReadyDate')}</dt>
              <dd className="text-caption text-emphasis text-ink-muted">
                {readyToday
                  ? t('listingReadyToday')
                  : t('listingReady', formatShortDate(listing.readyDate, lang))}
              </dd>
            </div>
          </dl>

          <div className="mt-3">
            <StatusTrack status={listing.status} />
          </div>

          {/* Pinned to the card bottom so the price and buttons line up across
              a row even when the Punjabi copy above wraps to different
              lengths. `pt-4` keeps the minimum gap when the card is short. */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <div>
              <p className="text-caption font-semibold text-ink-muted">{t('listingAsking')}</p>
              <p className="text-subhead font-normal text-ink">
                {formatRupeesShort(listing.askingPrice, lang)}
                <span className="text-caption font-semibold text-ink-muted"> {t('perTonne')}</span>
              </p>
              {listing.offerPrice && (
                <p className="text-caption font-bold text-primary">
                  {t('listingOffer')}: {formatRupeesShort(listing.offerPrice, lang)} →{' '}
                  {formatRupees(Math.round(listing.offerPrice * tonnes), lang)}
                </p>
              )}
            </div>

            {!closed && (
              <div className="flex gap-2">
                {listing.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => setShowOffer((v) => !v)}
                    className="btn btn-tertiary !min-h-11 !px-4 text-sm"
                  >
                    {t('offerTitle')}
                  </button>
                )}
                {listing.status !== 'open' && (
                  <button
                    type="button"
                    onClick={() => setShowBook((v) => !v)}
                    className="btn btn-tertiary !min-h-11 !px-4 text-sm"
                  >
                    {t('bookTitle')}
                  </button>
                )}
                {listing.status === 'pickup' && (
                  <button
                    type="button"
                    onClick={onCollected}
                    disabled={busy}
                    className="btn btn-primary !min-h-11 !px-4 text-sm"
                  >
                    {t('markCollected')}
                  </button>
                )}
              </div>
            )}
          </div>

          {showOffer && listing.status === 'open' && (
            <OfferPanel
              listing={listing}
              onSubmit={(price) => {
                onOffer(price);
                setShowOffer(false);
              }}
              onCancel={() => setShowOffer(false)}
            />
          )}

          {showBook && listing.status !== 'open' && (
            <BookPanel
              defaultDate={listing.readyDate}
              onSubmit={(date) => {
                onBook(date);
                setShowBook(false);
              }}
              onCancel={() => setShowBook(false)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */

function Panel({
  title,
  children,
  onCancel,
  cancelLabel,
}: {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  cancelLabel: string;
}) {
  return (
    <div className="animate-rise mt-4 rounded-none bg-surface-1 p-3 ring-1 ring-hairline">
      <p className="mb-2 text-sm font-bold text-ink">{title}</p>
      {children}
      <button type="button" onClick={onCancel} className="mt-2 text-xs font-semibold text-ink-muted">
        {cancelLabel}
      </button>
    </div>
  );
}

function OfferPanel({
  listing,
  onSubmit,
  onCancel,
}: {
  listing: FarmerListing;
  onSubmit: (price: number) => void;
  onCancel: () => void;
}) {
  const { t, lang } = useI18n();
  const tonnes = estimateTonnes(listing.acres);
  const [price, setPrice] = useState(listing.askingPrice);
  const total = Math.round(price * tonnes);

  return (
    <Panel title={t('offerTitle')} onCancel={onCancel} cancelLabel={t('cancelled')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink-muted">{t('offerPerTonne')}</span>
        <span className="text-subhead font-normal text-ink">
          {formatRupeesShort(price, lang)}
        </span>
      </div>

      <input
        type="range"
        min={MIN_OFFER_PER_TONNE}
        max={MAX_OFFER_PER_TONNE}
        step={10}
        value={price}
        onChange={(event) => setPrice(Number(event.target.value))}
        className="mt-2 h-11 w-full accent-primary"
        aria-label={t('offerPerTonne')}
      />
      <div className="flex justify-between text-caption font-semibold text-ink-muted">
        <span>{formatRupeesShort(MIN_OFFER_PER_TONNE, lang)}</span>
        <span>{formatRupeesShort(MAX_OFFER_PER_TONNE, lang)}</span>
      </div>

      <p className="mt-3 text-sm text-ink-muted">
        {t('offerTotal')}:{' '}
        <span className="font-semibold text-ink">{formatRupees(total, lang)}</span>{' '}
        <span className="text-xs text-ink-muted">
          ({tonnes} t {t('impactChartLabelTonnes')})
        </span>
      </p>

      <button type="button" onClick={() => onSubmit(price)} className="btn btn-primary mt-3 w-full">
        {t('offerSubmit')}
      </button>
    </Panel>
  );
}

function BookPanel({
  defaultDate,
  onSubmit,
  onCancel,
}: {
  defaultDate: string;
  onSubmit: (date: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState(defaultDate > todayIso() ? defaultDate : todayIso());

  return (
    <Panel title={t('bookTitle')} onCancel={onCancel} cancelLabel={t('cancelled')}>
      <label className="label" htmlFor={`pickup-${defaultDate}`}>
        {t('bookDate')}
      </label>
      <input
        id={`pickup-${defaultDate}`}
        type="date"
        className="field"
        value={date}
        min={todayIso()}
        onChange={(event) => setDate(event.target.value)}
      />
      <button type="button" onClick={() => onSubmit(date)} className="btn btn-primary mt-3 w-full">
        {t('bookConfirm')}
      </button>
    </Panel>
  );
}
