'use client';

import { usePathname } from 'next/navigation';

/**
 * Every route change remounts through here, so the key replays a short
 * rise-and-fade — tab switches feel like a transition instead of a cut.
 * 240ms is short enough that it never makes navigation feel slower.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-rise">
      {children}
    </div>
  );
}
