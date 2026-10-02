import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo/metadata';
import { getSitemapEntries } from '@/services/public-content.service';

// Rendered on request (the database is not reachable while Railway builds);
// data comes from the in-memory public cache (src/lib/cache/public-cache.ts).
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  const staticPages = ['/', '/articles', '/topics', '/projects', '/about', '/cv', '/contact', '/privacy'].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.7,
  }));

  return [
    ...staticPages,
    ...entries.articles.map((article) => ({
      url: absoluteUrl(`/articles/${article.slug}`),
      lastModified: article.updated_at,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...entries.topics.map((topic) => ({
      url: absoluteUrl(`/topics/${topic.slug}`),
      lastModified: topic.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...entries.projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: project.updated_at,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
