'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { IMAGES } from '@/lib/constants';
import { ImpactCounters } from './ImpactCounters';
import { Icon } from './Icon';

const STEPS = [
  {
    image: IMAGES.stepBale,
    titleKey: 'howStep1Title',
    bodyKey: 'howStep1Body',
    number: '1',
  },
  {
    image: IMAGES.stepCollect,
    titleKey: 'howStep2Title',
    bodyKey: 'howStep2Body',
    number: '2',
  },
  {
    image: IMAGES.stepSell,
    titleKey: 'howStep3Title',
    bodyKey: 'howStep3Body',
    number: '3',
  },
] as const;

const PROBLEM_STATS = [
  { valueKey: 'problemStat1Value', labelKey: 'problemStat1' },
  // '450+' is digits and a symbol — identical in every script, so it stays a
  // literal rather than a dictionary key the audit would flag as untranslated.
  { value: '450+', labelKey: 'problemStat2' },
  { valueKey: 'problemStat3Value', labelKey: 'problemStat3' },
] as const;

export function LandingContent() {
  const { t } = useI18n();

  return (
    <div className="pb-8">
      {/* ------------------------- hero -------------------------
          Carbon hero: flat image band, no radius, no shadow. The headline
          is set at Google Sans regular weight and sized to the viewport, so the
          display voice stays calm rather than shouting. Content sits in normal
          flow on top of the image rather than absolutely anchored, so a long
          translation can never push the kicker out of the box. */}
      <section className="relative overflow-hidden border-b border-hairline bg-hero">
        <Image
          src={IMAGES.hero}
          alt={t('heroPhotoAlt')}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1152px"
          className="object-cover"
        />
        {/* Directional scrim, not a uniform one. Text sits in the left column,
            so the left stays opaque for contrast and the photo is allowed to
            come through on the right. A uniform 50% wash just muddied both. */}
        <div className="absolute inset-0 bg-gradient-to-r from-hero via-hero/92 to-hero/40" />
        {/* On a phone the copy sits over the middle of the frame, so the scrim
            has to come from below as well. */}
        <div className="absolute inset-0 bg-gradient-to-t from-hero/80 via-hero/30 to-transparent lg:hidden" />

        <div className="relative w-full px-6 py-16 sm:px-10 sm:py-24 lg:px-16">
          <p className="mb-5 inline-flex items-center gap-2 bg-accent px-3 py-1 text-caption text-on-accent">
            <Icon name="earth" size={14} /> {t('heroKicker')}
          </p>
          <h1 className="max-w-3xl text-display-md text-hero-ink [text-wrap:balance] sm:text-display-lg">
            {t('heroHeadline')}
          </h1>
          <p className="mt-5 max-w-xl text-body-lg text-hero-ink-muted">{t('heroSub')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/farmer" className="btn btn-primary">
              <Icon name="wheat" size={18} /> {t('heroCtaFarmer')}
            </Link>
            <Link
              href="/buyer"
              className="btn border border-hero-ink-muted text-hero-ink hover:bg-hero-ink hover:text-hero"
            >
              <Icon name="scale" size={18} /> {t('heroCtaBuyer')}
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------ problem ------------------------ */}
      <section className="border-b border-hairline py-10 sm:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <p className="section-label text-support-error">{t('problemKicker')}</p>
            <h2 className="mt-2 text-headline text-ink sm:text-display-md">
              {t('problemTitle')}
            </h2>
            <p className="mt-3 text-body text-ink-muted">{t('problemBody')}</p>

            {/* Three stats side by side reads fine on a laptop but wraps to four
                ragged lines on a phone. Stack them into hairlined rows there. */}
            <dl className="mt-6 grid grid-cols-1 gap-px bg-hairline sm:grid-cols-3">
              {PROBLEM_STATS.map((stat) => (
                <div
                  key={stat.labelKey}
                  className="flex items-baseline gap-4 bg-canvas px-4 py-3 sm:block sm:py-4"
                >
                  <dd className="order-1 shrink-0 text-headline text-ink [font-variant-numeric:tabular-nums] [font-weight:600] sm:order-2 sm:mt-1">
                    {'valueKey' in stat ? t(stat.valueKey) : stat.value}
                  </dd>
                  <dt className="order-2 text-caption leading-snug text-ink-muted sm:order-1">
                    {t(stat.labelKey)}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="order-1 lg:order-2">
            <div className="card">
              {/* This frame is 1280x720 (16:9). Declaring any other aspect makes
                  object-cover crop it, and because the masthead headline is
                  legible in the photo a crop reads as a bug ("UNJAB FACES").
                  Matching the source ratio means no crop at any width. */}
              <Image
                src={IMAGES.problemNews}
                alt={t('problemImageAlt')}
                width={1280}
                height={720}
                sizes="(max-width: 1024px) 100vw, 560px"
                className="aspect-video w-full object-cover"
              />
              <div className="flex items-center gap-3 border-t border-hairline p-4">
                <Image
                  src={IMAGES.problemBurning}
                  alt=""
                  width={96}
                  height={96}
                  className="h-14 w-14 shrink-0 object-cover"
                />
                <p className="text-body-sm leading-snug text-ink-muted">
                  {t('problemStat2')}: <span className="text-support-error">AQI 450+</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------- how it works --------------------- */}
      <section className="border-b border-hairline bg-surface-1 py-10 sm:py-12">
        <p className="section-label">{t('howKicker')}</p>
        <h2 className="mt-2 text-headline text-ink sm:text-display-md">
          {t('howTitle')}
        </h2>

        <ol className="mt-6 grid gap-px bg-hairline sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number} className="bg-canvas">
              <div className="group relative h-40 w-full overflow-hidden lg:h-52">
                <Image
                  src={step.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                />
                <span className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center bg-ink text-body-sm font-semibold text-inverse-ink">
                  {step.number}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-subhead font-normal text-ink">{t(step.titleKey)}</h3>
                <p className="mt-2 text-body-sm text-ink-muted">{t(step.bodyKey)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------- impact ------------------------ */}
      <section className="border-b border-hairline py-10 sm:py-12">
        <p className="section-label">{t('impactKicker')}</p>
        <h2 className="mt-2 mb-6 text-headline text-ink sm:text-display-md">
          {t('impactTitle')}
        </h2>
        <ImpactCounters />
      </section>

      {/* ------------------------ community ------------------------ */}
      <section className="grid items-center gap-8 border-b border-hairline py-10 lg:grid-cols-2 sm:py-12">
        <div className="card group overflow-hidden">
          <Image
            src={IMAGES.community}
            alt="A Punjabi farmer smiling with folded hands"
            width={900}
            height={700}
            sizes="(max-width: 1024px) 100vw, 560px"
            className="h-56 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] sm:h-64"
          />
        </div>
        <div>
          <h2 className="text-headline text-ink">{t('communityTitle')}</h2>
          <p className="mt-3 text-body text-ink-muted">{t('communityBody')}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {[
              { src: IMAGES.farmerSmiling, alt: '' },
              { src: IMAGES.farmerPortrait, alt: '' },
              { src: IMAGES.officials, alt: '' },
              { src: IMAGES.hands, alt: '' },
            ].map((chip) => (
              <Image
                key={chip.src}
                src={chip.src}
                alt={chip.alt}
                width={72}
                height={72}
                className="h-12 w-12 object-cover"
              />
            ))}
            <span className="ml-1 text-body-sm text-ink-muted">
              {t('impactTotalFarmers')} · {t('impactTotalBuyers')}
            </span>
          </div>
        </div>
      </section>

      {/* Carbon CTA banner: the one full-bleed blue panel on the page.
          Left-aligned, not centred — a five-line centred paragraph over a
          narrow measure is the classic ragged-blob banner. */}
      <section className="mt-10 bg-primary px-6 py-10 sm:px-8 sm:py-14">
        <h2 className="max-w-2xl text-headline text-on-primary [text-wrap:balance]">
          {t('communityTitle')}
        </h2>
        <p className="mt-4 max-w-xl text-body text-on-primary opacity-90">{t('communityBody')}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/farmer" className="btn bg-on-primary text-primary hover:bg-inverse-surface-1">
            <Icon name="wheat" size={18} /> {t('heroCtaFarmer')}
          </Link>
          <Link
            href="/buyer"
            className="btn border border-on-primary text-on-primary hover:bg-inverse-surface-1"
          >
            <Icon name="scale" size={18} /> {t('heroCtaBuyer')}
          </Link>
        </div>
      </section>

      {/* The brand tagline lives here rather than in the 48px header, where a
          two-line lockup could not sit level with the mark. */}
      <footer className="mt-10 border-t border-hairline pt-6 text-center text-caption text-ink-muted">
        <p className="text-emphasis text-ink">
          {t('brandName')} — {t('brandTagline')}
        </p>
        <p className="mt-2">{t('footerNote')}</p>
      </footer>
    </div>
  );
}
