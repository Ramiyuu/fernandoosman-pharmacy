import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/server';
import { OG_SIZE, renderOgCard } from '@/lib/seo/og-card';
import { getSiteSettings } from '@/services/public-content.service';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Fernando Osman: pharmacy, clinical research and data';
// Rendered on request (the database is not reachable while Railway builds);
// data comes from the in-memory public cache (src/lib/cache/public-cache.ts).
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const t = getDictionary(locale);
  const settings = await getSiteSettings(locale);
  return renderOgCard({
    name: settings.site.name,
    eyebrow: t.og.eyebrow,
    title: settings.site.description,
    footer: t.og.footer,
  });
}
