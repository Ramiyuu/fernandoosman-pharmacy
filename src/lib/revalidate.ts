import 'server-only';

import { revalidatePath } from 'next/cache';

import { clearPublicCache } from '@/lib/cache/public-cache';

/**
 * After any change that can affect public pages, drop the cached public data
 * and Next's router cache so the site reflects the change immediately
 * (listings, counts, sitemap, OG images).
 */
export function revalidatePublicContent(): void {
  clearPublicCache();
  revalidatePath('/', 'layout');
}
