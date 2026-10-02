import type { Metadata } from 'next';

import { siteUrl } from '@/lib/public-env';

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
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

/** Consistent title/description/canonical/Open Graph/Twitter metadata for every page. */
export function buildMetadata(input: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(input.path);
  const images = input.image ? [{ url: input.image }] : undefined;

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical },
    robots: input.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: input.type ?? 'website',
      url: canonical,
      title: input.title,
      description: input.description,
      siteName: 'Fernando Osman',
      locale: 'en_US',
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
