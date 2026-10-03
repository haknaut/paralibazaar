'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Icon, type IconName } from './Icon';

type Toast = {
  id: number;
  title: string;
  body?: string;
  tone: 'success' | 'info' | 'warn';
};

type ToastValue = {
  show: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastValue | null>(null);

// Carbon notification bars are square and use the inverse surface; a warning
// is the one case that earns a semantic fill.
const TONE_STYLES: Record<Toast['tone'], string> = {
  success: 'bg-inverse-canvas text-inverse-ink',
  info: 'bg-inverse-canvas text-inverse-ink',
  warn: 'bg-support-error text-on-primary',
};

const TONE_ICON: Record<Toast['tone'], IconName> = {
  success: 'checkCircle',
  info: 'info',
  warn: 'warning',
};

const TOAST_MS = 5200;

function ToastCard({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  const { t } = useI18n();
  // Two-phase exit: mark leaving, wait for the transition, then unmount. This
  // is what stops a toast from vanishing in a single frame while the user is
  // still reading it.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), TOAST_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onDone(toast.id), 240);
    return () => clearTimeout(timer);
  }, [leaving, onDone, toast.id]);

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 border-l-4 px-4 py-3 ${
        TONE_STYLES[toast.tone]
      } ${
        leaving
          ? 'translate-y-2 opacity-0 transition-all duration-[240ms] ease-[cubic-bezier(0.2,0,1,0.9)]'
          : 'animate-toast'
      }`}
    >
      <span className="mt-0.5 text-current" aria-hidden="true">
        <Icon name={TONE_ICON[toast.tone]} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-emphasis">{toast.title}</p>
        {toast.body && <p className="mt-1 text-caption leading-snug opacity-85">{toast.body}</p>}
      </div>
      <button
        type="button"
        onClick={() => setLeaving(true)}
        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-current opacity-70 hover:opacity-100"
      >
        <Icon name="close" size={16} />
        <span className="sr-only">{t('actionDismiss')}</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    setToasts((current) => [...current, { ...toast, id: nextId.current++ }]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDone={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  // A missing provider must never crash a page — fall back to a no-op.
  return ctx ?? { show: () => undefined };
}
