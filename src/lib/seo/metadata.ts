import type { Metadata } from 'next';

import { DEFAULT_LOCALE, HTML_LANG, LOCALES, OG_LOCALE, type Locale } from '@/i18n/config';
import { localizePath } from '@/i18n/routing';
import { siteUrl } from '@/lib/public-env';

interface PageMetadataInput {
  title: string;
  description: string;
  /** Internal (English, unprefixed) path of the page, e.g. /articles/x. */
  path: string;
  locale: Locale;
  /**
   * Internal path of this page in each language. Defaults to `path` in both;
   * pass null for a language the page does not exist in (articles and
   * projects whose translation is missing or has another slug).
   */
  alternates?: Partial<Record<Locale, string | null>>;
  type?: 'website' | 'article' | 'profile';
  image?: string | null;
  noIndex?: boolean;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  authors?: string[];
  tags?: string[];
  /** Use the title as-is instead of the "%s | Site" template. */
  absoluteTitle?: boolean;
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Absolute public URL of an internal path in a locale. */
export function localizedUrl(locale: Locale, internalPath: string): string {
  return absoluteUrl(localizePath(locale, internalPath));
}

/**
 * Consistent title/description/canonical/hreflang/Open Graph/Twitter metadata
 * for every public page. The hreflang links also drive the language switcher.
 */
export function buildMetadata(input: PageMetadataInput): Metadata {
  const canonical = localizedUrl(input.locale, input.path);
  const images = input.image ? [{ url: absoluteUrl(input.image) }] : undefined;

  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    const path = input.alternates && locale in input.alternates ? input.alternates[locale] : input.path;
    if (path) languages[HTML_LANG[locale]] = localizedUrl(locale, path);
  }
  const fallback = languages[HTML_LANG[DEFAULT_LOCALE]];
  if (Object.keys(languages).length > 1 && fallback) languages['x-default'] = fallback;

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical, languages },
    robots: input.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: input.type ?? 'website',
      url: canonical,
      title: input.title,
      description: input.description,
      siteName: 'Fernando Osman',
      locale: OG_LOCALE[input.locale],
      alternateLocale: LOCALES.filter((locale) => locale !== input.locale && languages[HTML_LANG[locale]]).map(
        (locale) => OG_LOCALE[locale],
      ),
      ...(images ? { images } : {}),
      ...(input.type === 'article'
        ? {
            publishedTime: input.publishedTime ?? undefined,
            modifiedTime: input.modifiedTime ?? undefined,
            authors: input.authors,
            tags: input.tags,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
  };
}

export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}
