'use client';

import { useI18n } from '@/lib/i18n';
import { Icon, type IconName } from './Icon';

/** A shimmering placeholder block. `className` sets the shape. */
export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`shimmer rounded-none ${className}`} aria-hidden="true" />;
}

/** Full-section loading state with a real message, not a bare spinner. */
export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center" role="status" aria-live="polite">
      <div className="animate-pulse-soft text-ink-subtle" aria-hidden="true">
        <Icon name="sync" size={28} />
      </div>
      <p className="text-body-sm text-ink-muted">{label ?? t('loading')}</p>
    </div>
  );
}

/** "Nothing here yet" — always says what to do next. */
export function EmptyState({
  title,
  body,
  icon = 'wheat',
  action,
}: {
  title: string;
  body: string;
  icon?: IconName;
  action?: React.ReactNode;
}) {
  return (
    <div className="card animate-rise flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-ink-subtle" aria-hidden="true">
        <Icon name={icon} size={36} />
      </span>
      <h3 className="text-subhead text-ink">{title}</h3>
      <p className="max-w-sm text-body-sm text-ink-muted">{body}</p>
      {action}
    </div>
  );
}

/** Something broke, but the farmer is not left staring at a blank screen. */
export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="card animate-rise flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="text-support-error" aria-hidden="true">
        <Icon name="warning" size={36} />
      </span>
      <h3 className="text-subhead text-ink">{t('somethingWrong')}</h3>
      <p className="max-w-sm text-body-sm text-ink-muted">{message ?? t('errorGeneric')}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-primary mt-1">
          {t('retry')}
        </button>
      )}
    </div>
  );
}
