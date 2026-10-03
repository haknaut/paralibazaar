/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Every asset is a small local JPEG, so skip the runtime image optimiser.
    // This keeps `npm install && npm run dev` working without pulling in sharp.
    unoptimized: true,
  },
  eslint: {
    // Keep `npm run dev` friction-free for the demo; types are checked via `npm run typecheck`.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Bare `import from 'recharts'` pulls the whole chart library into every
    // chunk that touches it; this rewrites it to per-module imports.
    optimizePackageImports: ['recharts'],
  },
};

export default nextConfig;
