import Link from 'next/link';

/** Branded 404 — a dead end should still look like the site. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="text-display-lg text-ink [font-weight:600]">404</p>
      <h1 className="mt-2 text-headline text-ink">This field is empty.</h1>
      <p className="mt-2 text-body text-ink-muted">
        The page you asked for does not exist or was moved.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        Back to ParaliBazaar
      </Link>
    </div>
  );
}
