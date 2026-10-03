'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll reveal. Content below the fold starts lowered and faded, then
 * settles into place the first time it enters the viewport. `delay`
 * staggers siblings (step cards, counter tiles) so a section arrives as a
 * sequence rather than a block. Fires once — re-hiding on scroll-up reads
 * as flicker, not craft.
 *
 * Two triggers, belt and suspenders: an IntersectionObserver for the
 * efficient path, plus a scroll/resize check that reads geometry directly.
 * The observer alone can starve in background tabs and prerender-style
 * environments where no frames are produced — geometry never lies.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    let io: IntersectionObserver | null = null;

    const show = () => {
      if (done) return;
      done = true;
      io?.disconnect();
      window.removeEventListener('scroll', check, { capture: true });
      window.removeEventListener('resize', check);
      setShown(true);
    };

    function check() {
      const box = el!.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.92 && box.bottom > 0) show();
    }

    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) show();
        },
        { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
      );
      io.observe(el);
    }
    window.addEventListener('scroll', check, { capture: true, passive: true });
    window.addEventListener('resize', check);
    check();

    return () => {
      done = true;
      io?.disconnect();
      window.removeEventListener('scroll', check, { capture: true });
      window.removeEventListener('resize', check);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${shown ? 'reveal-in' : 'reveal'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
