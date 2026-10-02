import 'server-only';

import { headers } from 'next/headers';

import { siteUrl } from '@/lib/public-env';

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  return first && first.length <= 64 ? first : null;
}

function ipFromHeaders(source: Headers): string {
  return (
    firstForwardedIp(source.get('x-forwarded-for')) ??
    firstForwardedIp(source.get('x-real-ip')) ??
    'unknown'
  );
}

/** Client IP inside Server Actions / Server Components. */
export async function getClientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

/** Client IP inside Route Handlers. */
export function getRequestIp(request: Request): string {
  return ipFromHeaders(request.headers);
}

/**
 * CSRF defence for state-changing Route Handlers (Server Actions already get
 * an equivalent Origin check from Next.js). Requires the Origin header — or,
 * failing that, Sec-Fetch-Site — to prove the request came from this site.
 */
export function isSameOriginRequest(request: Request): boolean {
  const allowedOrigins = new Set([new URL(request.url).origin, new URL(siteUrl()).origin]);

  const origin = request.headers.get('origin');
  if (origin) return allowedOrigins.has(origin);

  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite === 'same-origin';
}
