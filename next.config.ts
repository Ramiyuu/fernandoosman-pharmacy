import type { NextConfig } from 'next';

// -----------------------------------------------------------------------------
// Fail fast on dangerous misconfiguration: secrets must never be exposed
// through a NEXT_PUBLIC_ variable (those are inlined into the browser bundle).
// -----------------------------------------------------------------------------
const leakedSecrets = Object.keys(process.env).filter(
  (key) => key.startsWith('NEXT_PUBLIC_') && /SECRET|PRIVATE|PASSWORD|DATABASE|R2_|ACCESS_KEY|AUTH/i.test(key),
);
if (leakedSecrets.length > 0) {
  throw new Error(
    `Refusing to build: ${leakedSecrets.join(', ')} would be exposed to the browser. Remove the NEXT_PUBLIC_ prefix.`,
  );
}

const isDev = process.env.NODE_ENV !== 'production';
// HTTPS-only directives (HSTS, upgrade-insecure-requests) are emitted only when
// the canonical site URL is HTTPS, so `next start` on http://localhost keeps working.
const isHttpsSite = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');

// Content-Security-Policy. Everything — pages, images (/media) and uploads — is
// served by this origin; PDFs are opened through a redirect (navigation), which
// CSP does not restrict. Article content is rendered from a JSON allow-list
// (never raw HTML), so CSP is defence in depth. Next.js injects inline
// bootstrap scripts, hence 'unsafe-inline' for scripts on statically rendered
// pages; 'unsafe-eval' is only needed by React tooling in development.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isHttpsSite ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ...(isHttpsSite ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Enables forbidden() → app/forbidden.tsx (HTTP 403).
    authInterrupts: true,
  },
  // pg and Better Auth's database layer are Node-only; keep them out of the bundle.
  serverExternalPackages: ['pg', 'kysely'],
  images: {
    // The optimiser only accepts our own uploaded images.
    localPatterns: [{ pathname: '/media/**', search: '' }],
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Admin, preview and API responses are private and must not be cached by shared caches.
        source: '/(admin|preview|api)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
