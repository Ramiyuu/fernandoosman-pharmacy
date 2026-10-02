import 'server-only';

import { revalidatePath } from 'next/cache';

/**
 * Public pages are statically generated and revalidated every few minutes.
 * After any change that can affect them, purge the whole public cache so the
 * site reflects the change immediately (listings, counts, sitemap, OG images).
 */
export function revalidatePublicContent(): void {
  revalidatePath('/', 'layout');
}
