import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/server';
import { OG_SIZE, renderOgCard } from '@/lib/seo/og-card';
import { getArticleBySlug, getSiteSettings } from '@/services/public-content.service';
import { isValidSlug } from '@/utils/slugify';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Article cover';
// Rendered on request (the database is not reachable while Railway builds);
// data comes from the in-memory public cache (src/lib/cache/public-cache.ts).
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const [article, settings] = await Promise.all([
    isValidSlug(slug) ? getArticleBySlug(slug, locale) : null,
    getSiteSettings(locale),
  ]);
  // The card speaks the article's own language.
  const t = getDictionary(article?.language ?? locale);
  return renderOgCard({
    name: settings.site.name,
    eyebrow: article?.category?.name ?? t.og.article,
    title: article?.title ?? settings.site.name,
    footer: `${settings.site.name}  ·  ${article ? t.og.readingTime(article.reading_time) : t.og.tagline}`,
  });
}
