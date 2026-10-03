'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CROP_TYPES,
  DEFAULT_PRICE_PER_TONNE,
  DISTRICT_KEYS,
  estimateCo2Avoided,
  estimateEarnings,
  estimateTonnes,
  IMAGES,
  SUPPLY_TYPES,
  type CropType,
  type SupplyType,
} from '@/lib/constants';
import { addDaysIso, formatRupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useToast } from './Toast';
import type { FarmerListing } from '@/lib/types';
import { Icon, type IconName } from './Icon';
import { districtLabel, villageLabel } from '@/lib/labels';

type FormState = {
  farmerName: string;
  village: string;
  district: string;
  acres: string;
  crop: CropType;
  supply: SupplyType;
  readyDate: string;
  phone: string;
};

const EMPTY: FormState = {
  farmerName: '',
  village: '',
  district: '',
  acres: '',
  crop: 'paddy',
  supply: 'baled',
  readyDate: addDaysIso(3),
  phone: '',
};

/**
 * Minimal shape of the Web Speech API we use. The types ship in lib.dom for
 * some browsers but not all, so we declare only what we touch.
 */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function FarmerForm() {
  const { t, lang } = useI18n();
  const { show } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [message, setMessage] = useState('');
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseSource, setParseSource] = useState<'llm' | 'fallback' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState<FarmerListing | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messageRef = useRef(message);
  messageRef.current = message;

  // Set up the live estimate preview as the farmer types their acreage.
  const preview = useMemo(() => {
    const acres = Number(form.acres);
    if (!Number.isFinite(acres) || acres <= 0) return null;
    const tonnes = estimateTonnes(acres);
    return {
      acres,
      tonnes,
      earning: estimateEarnings(acres),
      co2: estimateCo2Avoided(tonnes),
      bales: Math.max(1, Math.round(tonnes / 0.35)),
    };
  }, [form.acres]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }, []);

  /* ----------------------------- voice ----------------------------- */

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => stopListening, [stopListening]);

  const startListening = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) {
      setNotice(t('farmerMicUnsupported'));
      return;
    }

    // Pick the closest supported locale: Punjabi first, then Hindi, then English.
    const wanted = lang === 'pa' ? 'pa-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    const supported = typeof window !== 'undefined' ? window.navigator.language : 'en-IN';
    recognition.lang = supported.toLowerCase().startsWith(wanted.slice(0, 2)) ? supported : wanted;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result && result[0]) transcript += result[0].transcript;
      }
      if (transcript) setMessage(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setNotice(t('farmerMicDenied'));
      }
    };
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      setNotice(null);
    } catch {
      setNotice(t('farmerMicUnsupported'));
    }
  }, [lang, t]);

  /* ----------------------------- parsing ----------------------------- */

  const parseMessage = useCallback(async () => {
    const text = messageRef.current.trim();
    if (!text) return;
    setParsing(true);
    setNotice(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('parse failed');
      const data = (await response.json()) as Partial<{
        farmerName: string;
        village: string;
        district: string;
        acres: number;
        crop: CropType;
        supply: SupplyType;
        readyInDays: number;
        phone: string;
        source: 'llm' | 'fallback';
      }>;

      const found: Partial<FormState> = {};
      if (data.farmerName) found.farmerName = data.farmerName;
      if (data.village) found.village = data.village;
      if (data.district && DISTRICT_KEYS.includes(data.district)) found.district = data.district;
      if (typeof data.acres === 'number' && data.acres > 0) found.acres = String(data.acres);
      if (data.crop && CROP_TYPES.includes(data.crop)) found.crop = data.crop;
      if (data.supply && SUPPLY_TYPES.includes(data.supply)) found.supply = data.supply;
      if (typeof data.readyInDays === 'number') found.readyDate = addDaysIso(data.readyInDays);
      if (data.phone) found.phone = data.phone;

      setForm((current) => ({ ...current, ...found }));
      setParseSource(data.source ?? 'fallback');
      setNotice(Object.keys(found).length ? null : t('parsedNothing'));
    } catch {
      // The API itself is down — the form still works, the farmer types it in.
      setNotice(t('errorGeneric'));
    } finally {
      setParsing(false);
    }
  }, [t]);

  /* ----------------------------- submit ----------------------------- */

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!form.farmerName.trim()) next.farmerName = t('formErrorRequired');
    if (!form.village.trim()) next.village = t('formErrorRequired');
    if (!form.district) next.district = t('formErrorRequired');

    const acres = Number(form.acres);
    if (!Number.isFinite(acres) || acres < 0.5 || acres > 500) next.acres = t('formErrorAcres');

    const digits = form.phone.replace(/\D/g, '');
    if (!/^(?:91)?[6-9]\d{9}$/.test(digits)) next.phone = t('formErrorPhone');

    const ready = new Date(`${form.readyDate}T00:00:00`).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastBookableDay = new Date(`${addDaysIso(90)}T00:00:00`).getTime();
    if (!form.readyDate || Number.isNaN(ready) || ready < today.getTime() || ready > lastBookableDay) {
      next.readyDate = t('formErrorDate');
    }

    setErrors(next);
    if (Object.keys(next).length) {
      // Move focus to the first problem so the farmer is not hunting for it.
      const firstKey = Object.keys(next)[0];
      document.getElementById(firstKey)?.focus();
      return false;
    }
    return true;
  }, [form, t]);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!validate()) return;

      setSubmitting(true);
      try {
        const response = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmerName: form.farmerName.trim(),
            village: form.village.trim(),
            district: form.district,
            acres: Number(form.acres),
            crop: form.crop,
            supply: form.supply,
            readyDate: form.readyDate,
            phone: form.phone,
            askingPrice: DEFAULT_PRICE_PER_TONNE,
          }),
        });
        if (!response.ok) throw new Error('submit failed');
        const data = (await response.json()) as { listing: FarmerListing };
        setPosted(data.listing);
        show({ tone: 'success', title: t('successKicker'), body: t('successBody') });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        show({ tone: 'warn', title: t('somethingWrong'), body: t('errorGeneric') });
      } finally {
        setSubmitting(false);
      }
    },
    [form, show, t, validate],
  );

  /* ----------------------------- success ----------------------------- */

  if (posted) {
    const tonnes = estimateTonnes(posted.acres);
    return (
      <SuccessCard
        listing={posted}
        tonnes={tonnes}
        earning={estimateEarnings(posted.acres)}
        co2={estimateCo2Avoided(tonnes)}
        onAnother={() => {
          setPosted(null);
          setForm(EMPTY);
          setMessage('');
          setParseSource(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <header>
        <h1 className="text-display-md text-ink">
          {t('farmerTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('farmerSub')}</p>
      </header>

      {/* ------------------- voice intake ------------------- */}
      <section className="card overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-hairline p-4">
          <Image
            src={IMAGES.farmerPortrait}
            alt=""
            width={96}
            height={96}
            className="h-14 w-14 object-cover"
          />
          <div>
            <p className="section-label text-primary">
              {t('farmerVoiceKicker')}
            </p>
            <h2 className="text-lg font-bold text-ink">{t('farmerVoiceTitle')}</h2>
          </div>
        </div>

        <div className="p-4">
          <p className="text-sm text-ink-muted">{t('farmerVoiceSub')}</p>

          <div className="mt-4 flex items-start gap-3">
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              aria-pressed={listening}
              className={`flex h-16 w-16 shrink-0 items-center justify-center border transition-colors ${
                listening
                  ? 'animate-pulse-soft bg-support-error text-on-primary'
                  : 'bg-primary text-on-primary hover:bg-primary-hover'
              }`}
              title={listening ? t('farmerMicStop') : t('farmerMicStart')}
            >
              <span aria-hidden="true" className="text-current">
                <Icon name={listening ? 'stop' : 'mic'} size={24} />
              </span>
              <span className="sr-only">
                {listening ? t('farmerMicStop') : t('farmerMicStart')}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t('farmerInputPlaceholder')}
                rows={2}
                className="field resize-none"
              />
              <button
                type="button"
                onClick={parseMessage}
                disabled={parsing || !message.trim()}
                className="btn btn-primary mt-2 w-full"
              >
                {parsing ? t('farmerSending') : (
                  <>
                    <Icon name="send" size={16} /> {t('farmerSend')}
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-ink-muted">
            <span className="font-semibold">{t('voiceExample')}</span>{' '}
            <span className="italic">{t('voiceExampleText')}</span>
          </p>

          {listening && (
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-support-error">
              <span className="h-2 w-2 animate-pulse-soft bg-support-error" />
              {t('farmerMicListening')}
            </p>
          )}

          {notice && (
            <p className="mt-2 rounded-none bg-surface-1 px-3 py-2 text-xs font-semibold text-ink">
              {notice}
              {parseSource && (
                <span className="ml-1 opacity-70">
                  ({t('parsedBy')} {parseSource === 'llm' ? t('parsedLlm') : t('parsedFallback')})
                </span>
              )}
            </p>
          )}
        </div>
      </section>

      {/* ----------------------- the form ----------------------- */}
      <form onSubmit={submit} noValidate className="card p-4 sm:p-5">
        <p className="section-label text-primary">
          {t('formKicker')}
        </p>
        <h2 className="mt-1 mb-4 text-lg font-bold text-ink">{t('formTitle')}</h2>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="farmerName">
              {t('labelName')}
            </label>
            <input
              id="farmerName"
              className="field"
              value={form.farmerName}
              onChange={(e) => set('farmerName', e.target.value)}
              placeholder={t('placeholderName')}
              autoComplete="name"
            />
            {errors.farmerName && <FieldError message={errors.farmerName} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="village">
                {t('labelVillage')}
              </label>
              <input
                id="village"
                className="field"
                value={form.village}
                onChange={(e) => set('village', e.target.value)}
                placeholder={t('placeholderVillage')}
              />
              {errors.village && <FieldError message={errors.village} />}
            </div>

            <div>
              <label className="label" htmlFor="district">
                {t('labelDistrict')}
              </label>
              <select
                id="district"
                className="field"
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
              >
                <option value="">{t('selectDistrict')}</option>
                {DISTRICT_KEYS.map((district) => (
                  <option key={district} value={district}>
                    {districtLabel(t, district)}
                  </option>
                ))}
              </select>
              {errors.district && <FieldError message={errors.district} />}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="acres">
                {t('labelAcres')}
              </label>
              <input
                id="acres"
                className="field"
                type="number"
                inputMode="decimal"
                min={0.5}
                max={500}
                step={0.5}
                value={form.acres}
                onChange={(e) => set('acres', e.target.value)}
                placeholder={t('placeholderAcres')}
              />
              {errors.acres && <FieldError message={errors.acres} />}
            </div>

            <div>
              <label className="label" htmlFor="readyDate">
                {t('labelReadyDate')}
              </label>
              <input
                id="readyDate"
                className="field"
                type="date"
                value={form.readyDate}
                min={addDaysIso(0)}
                max={addDaysIso(90)}
                onChange={(e) => set('readyDate', e.target.value)}
              />
              {errors.readyDate && <FieldError message={errors.readyDate} />}
            </div>
          </div>

          <fieldset>
            <legend className="label">{t('labelCrop')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {CROP_TYPES.map((crop) => (
                <ChoiceCard
                  key={crop}
                  value={crop}
                  current={form.crop}
                  onSelect={() => set('crop', crop)}
                  label={t(crop === 'paddy' ? 'cropPaddy' : 'cropWheat')}
                  icon={crop === 'paddy' ? 'wheat' : 'leaf'}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">{t('labelSupply')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {SUPPLY_TYPES.map((supply) => (
                <ChoiceCard
                  key={supply}
                  value={supply}
                  current={form.supply}
                  onSelect={() => set('supply', supply)}
                  label={t(supply === 'baled' ? 'supplyBaled' : 'supplyLoose')}
                  icon={supply === 'baled' ? 'bale' : 'wheat'}
                />
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor="phone">
              {t('labelPhone')}
            </label>
            <input
              id="phone"
              className="field"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder={t('placeholderPhone')}
            />
            {errors.phone && <FieldError message={errors.phone} />}
          </div>
        </div>

        {/* live estimate, updated as they type */}
        {preview && (
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-none bg-surface-1 p-3 ring-1 ring-hairline">
            <EstimateCell
              label={t('successEstimatedEarning')}
              value={formatRupees(preview.earning, lang)}
              tone="text-ink"
            />
            <EstimateCell
              label={t('successTonnes')}
              value={`${preview.tonnes} t`}
              tone="text-ink"
            />
            <EstimateCell
              label={t('successEstimatedCo2')}
              value={`${preview.co2} t`}
              tone="text-ink"
            />
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary mt-6 w-full">
          {submitting ? (
            t('submitting')
          ) : (
            <>
              <Icon name="wheat" size={18} /> {t('submit')}
            </>
          )}
        </button>
        <p className="mt-3 text-center text-caption text-ink-muted">{t('farmerSub')}</p>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-support-error">
      <Icon name="warning" size={14} /> {message}
    </p>
  );
}

function EstimateCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className={`text-body-sm font-semibold sm:text-base ${tone}`}>{value}</p>
      <p className="mt-0.5 text-caption leading-tight font-semibold text-ink-muted">{label}</p>
    </div>
  );
}

function ChoiceCard({
  value,
  current,
  onSelect,
  label,
  icon,
}: {
  value: string;
  current: string;
  onSelect: () => void;
  label: string;
  icon: IconName;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex min-h-14 items-center gap-2.5 border-2 px-3 text-left text-body-sm text-ink ${
        active
          ? 'border-primary bg-surface-1'
          : 'border-hairline bg-canvas text-ink-muted hover:border-ink hover:text-ink'
      }`}
    >
      <Icon name={icon} size={22} className={active ? 'text-primary' : 'text-ink-subtle'} />
      {label}
    </button>
  );
}

function SuccessCard({
  listing,
  tonnes,
  earning,
  co2,
  onAnother,
}: {
  listing: FarmerListing;
  tonnes: number;
  earning: number;
  co2: number;
  onAnother: () => void;
}) {
  const { t, lang } = useI18n();
  const bales = Math.max(1, Math.round(tonnes / 0.35));
  // Sent to a real WhatsApp thread, so it goes out in the farmer's language.
  const shareText = encodeURIComponent(
    t(
      'shareListingText',
      listing.acres,
      villageLabel(t, listing.village),
      districtLabel(t, listing.district),
      listing.readyDate,
      tonnes,
    ),
  );

  return (
    <div className="space-y-5 pb-6">
      <div className="card animate-rise overflow-hidden p-0">
        <div className="bg-ink px-5 py-6 text-center text-inverse-ink">
          <span className="inline-flex text-support-success" aria-hidden="true">
            <Icon name="checkCircle" size={40} />
          </span>
          <p className="mt-2 text-caption text-inverse-ink-muted">
            {t('successKicker')}
          </p>
          <h1 className="mt-1 text-headline">{t('successTitle')}</h1>
          <p className="mx-auto mt-2 max-w-md text-body-sm text-inverse-ink-muted">{t('successBody')}</p>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            <Image
              src={IMAGES.farmerSmiling}
              alt=""
              width={112}
              height={112}
              className="h-16 w-16 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{listing.farmerName}</p>
              <p className="truncate text-sm text-ink-muted">
                {villageLabel(t, listing.village)} · {districtLabel(t, listing.district)} · {listing.acres} {t('listingAcres')}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2">
            <div className="rounded-none bg-surface-1 p-3 text-center ring-1 ring-hairline">
              <dt className="text-caption leading-tight font-semibold text-ink-muted">
                {t('successEstimatedEarning')}
              </dt>
              <dd className="mt-1 text-subhead font-normal text-ink">{formatRupees(earning, lang)}</dd>
            </div>
            <div className="rounded-none bg-surface-1 p-3 text-center ring-1 ring-hairline">
              <dt className="text-caption leading-tight font-semibold text-ink-muted">
                {t('successTonnes')}
              </dt>
              <dd className="mt-1 text-subhead font-normal text-ink">{tonnes} t</dd>
              <p className="text-caption text-ink-muted">{t('successBales', bales)}</p>
            </div>
            <div className="rounded-none bg-surface-1 p-3 text-center ring-1 ring-hairline">
              <dt className="text-caption leading-tight font-semibold text-ink-muted">
                {t('successEstimatedCo2')}
              </dt>
              <dd className="mt-1 text-subhead font-normal text-ink">{co2} t</dd>
            </div>
          </dl>

          <p className="text-center text-caption text-ink-muted">{t('priceNote')}</p>

          <div className="rounded-none bg-surface-1 p-4">
            <p className="text-sm font-bold text-ink">{t('successShareTitle')}</p>
            <p className="mt-1 text-xs text-ink-muted">{t('successShareBody')}</p>
            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-tertiary mt-3 w-full"
            >
              <Icon name="chat" size={16} /> WhatsApp
            </a>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/buyer" className="btn btn-primary flex-1">
              {t('successViewOnMap')}
            </Link>
            <button type="button" onClick={onAnother} className="btn btn-tertiary flex-1">
              {t('successPostAnother')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
