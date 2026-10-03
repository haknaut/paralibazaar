'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Every route change remounts through here, so the key replays a short
 * rise-and-fade — tab switches feel like a transition instead of a cut.
 * 240ms is short enough that it never makes navigation feel slower.
 *
 * `usePathname` must sit inside Suspense: without it, the static prerender
 * of `/_not-found` has no navigation context and the build dies with
 * "Invariant: no direct app page entry found for /_not-found".
 */
function Transition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-rise">
      {children}
    </div>
  );
}

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <Transition>{children}</Transition>
    </Suspense>
  );
}
