import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo/metadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Not a security measure (those routes are protected server-side); it
        // just keeps private and utility URLs out of search results.
        disallow: ['/admin', '/preview', '/api', '/en/search', '/pt/busca'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
