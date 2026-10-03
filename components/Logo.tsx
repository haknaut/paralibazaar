/**
 * The ParaliBazaar mark: a wheat stalk whose grain doubles as a leaf —
 * the crop we sell and the clean air we buy with it.
 *
 * Carbon is flat by construction, so the mark is a square IBM Blue tile with
 * a knocked-out stalk rather than the circular green badge it replaced. Drawn
 * inline so it stays crisp, themeable, and needs no asset request.
 */
export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="ParaliBazaar logo"
      className={className}
    >
      <rect width="48" height="48" fill="var(--color-primary)" />
      {/* stem */}
      <path
        d="M24 40V14"
        stroke="var(--color-on-primary)"
        strokeWidth="2.4"
        strokeLinecap="butt"
      />
      {/* grain pairs, alternating left and right like a real ear */}
      <g fill="var(--color-on-primary)">
        <path d="M24 18c-3.6-2.6-6.4-2.2-7.6-.6 2.6 2.6 5.4 3 7.6 1.6Z" />
        <path d="M24 18c3.6-2.6 6.4-2.2 7.6-.6-2.6 2.6-5.4 3-7.6 1.6Z" />
        <path d="M24 25c-3.6-2.6-6.4-2.2-7.6-.6 2.6 2.6 5.4 3 7.6 1.6Z" />
        <path d="M24 25c3.6-2.6 6.4-2.2 7.6-.6-2.6 2.6-5.4 3-7.6 1.6Z" />
        <path d="M24 32c-3.6-2.6-6.4-2.2-7.6-.6 2.6 2.6 5.4 3 7.6 1.6Z" />
        <path d="M24 32c3.6-2.6 6.4-2.2 7.6-.6-2.6 2.6-5.4 3-7.6 1.6Z" />
      </g>
      {/* leaf at the base — the "don't burn" half of the mark */}
      <path
        d="M24 38c-1.4-4.2-5-6.4-9-6.2.4 4.6 4 7.4 9 6.2Z"
        fill="var(--color-on-primary)"
        opacity="0.65"
      />
    </svg>
  );
}
