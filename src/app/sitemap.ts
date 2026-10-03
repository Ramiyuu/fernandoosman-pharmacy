import type { MetadataRoute } from 'next';

import { HTML_LANG, LOCALES, type Locale } from '@/i18n/config';
import { localizedUrl } from '@/lib/seo/metadata';
import { getSitemapEntries } from '@/services/public-content.service';
import type { SitemapEntry } from '@/types/content';

// Rendered on request (the database is not reachable while Railway builds);
// data comes from the in-memory public cache (src/lib/cache/public-cache.ts).
export const dynamic = 'force-dynamic';

const STATIC_PAGES = [
  '/',
  '/articles',
  '/topics',
  '/projects',
  '/about',
  '/certificates',
  '/experience',
  '/cv',
  '/contact',
  '/privacy',
];

const languagesFor = (paths: Partial<Record<Locale, string>>) =>
  Object.fromEntries(
    LOCALES.filter((locale) => paths[locale]).map((locale) => [HTML_LANG[locale], localizedUrl(locale, paths[locale]!)]),
  );

/** One URL per language version; versions of the same text list each other as alternates. */
function versioned(entries: SitemapEntry[], section: 'articles' | 'projects', priority: number): MetadataRoute.Sitemap {
  const groups = new Map<string, Partial<Record<Locale, string>>>();
  for (const entry of entries) {
    const group = groups.get(entry.group) ?? {};
    group[entry.language] = `/${section}/${entry.slug}`;
    groups.set(entry.group, group);
  }
  return entries.map((entry) => ({
    url: localizedUrl(entry.language, `/${section}/${entry.slug}`),
    lastModified: entry.updated_at,
    changeFrequency: 'monthly' as const,
    priority,
    alternates: { languages: languagesFor(groups.get(entry.group) ?? {}) },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  const both = (path: string) => ({ en: path, pt: path });

  return [
    ...STATIC_PAGES.flatMap((path) =>
      LOCALES.map((locale) => ({
        url: localizedUrl(locale, path),
        changeFrequency: 'weekly' as const,
        priority: path === '/' ? 1 : 0.7,
        alternates: { languages: languagesFor(both(path)) },
      })),
    ),
    ...versioned(entries.articles, 'articles', 0.8),
    ...entries.topics.flatMap((topic) =>
      LOCALES.map((locale) => ({
        url: localizedUrl(locale, `/topics/${topic.slug}`),
        lastModified: topic.updated_at,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
        alternates: { languages: languagesFor(both(`/topics/${topic.slug}`)) },
      })),
    ),
    ...versioned(entries.projects, 'projects', 0.6),
  ];
}
