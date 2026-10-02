import { getPublishedArticles, getSiteSettings } from '@/services/public-content.service';
import { siteUrl } from '@/lib/public-env';
export const dynamic = 'force-dynamic';
const xml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
export async function GET() {
  const [articles, settings] = await Promise.all([getPublishedArticles({}, 1, 50), getSiteSettings()]);
  const base = siteUrl();
  const items = articles.items
    .map(
      (a) =>
        `<item><title>${xml(a.title)}</title><link>${xml(`${base}/articles/${a.slug}`)}</link><guid>${xml(`${base}/articles/${a.slug}`)}</guid><description>${xml(a.excerpt)}</description>${a.published_at ? `<pubDate>${new Date(a.published_at).toUTCString()}</pubDate>` : ''}</item>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(settings.site.name)}</title><link>${xml(base)}</link><description>${xml(settings.site.description)}</description>${items}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } },
  );
}
