import type { NextConfig } from 'next';

// -----------------------------------------------------------------------------
// Fail fast on dangerous misconfiguration: a service-role key must never be
// exposed through a NEXT_PUBLIC_ variable (those are inlined into the browser
// bundle).
// -----------------------------------------------------------------------------
const leakedSecrets = Object.keys(process.env).filter(
  (key) => key.startsWith('NEXT_PUBLIC_') && /SERVICE_ROLE|SECRET|PRIVATE/i.test(key),
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

function supabaseOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const supabase = supabaseOrigin();
const supabaseHost = supabase ? new URL(supabase).hostname : null;
const supabaseProtocol = supabase ? (new URL(supabase).protocol.replace(':', '') as 'http' | 'https') : 'https';

// Content-Security-Policy. Article content is rendered from a JSON allow-list
// (never raw HTML), so CSP is defence in depth. Next.js injects inline
// bootstrap scripts, hence 'unsafe-inline' for scripts on statically rendered
// pages; 'unsafe-eval' is only needed by React tooling in development.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabase ? ` ${supabase}` : ''}`,
  "font-src 'self' data:",
  // PDF uploads go straight from the browser to Supabase Storage via a signed upload URL.
  `connect-src 'self'${supabase ? ` ${supabase}` : ''}`,
  // Signed PDF URLs may be displayed in an <iframe> on /cv.
  `frame-src 'self'${supabase ? ` ${supabase}` : ''}`,
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
  ...(isHttpsSite ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Enables forbidden() → app/forbidden.tsx (HTTP 403).
    authInterrupts: true,
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: supabaseProtocol, hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
    // Only when Supabase itself runs locally (Supabase CLI on 127.0.0.1:54321).
    dangerouslyAllowLocalIP: supabaseHost === '127.0.0.1' || supabaseHost === 'localhost',
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
