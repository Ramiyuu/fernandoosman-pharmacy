import { HTML_LANG } from '@/i18n/config';
import { localizePath } from '@/i18n/routing';
import { siteUrl } from '@/lib/public-env';
import { getPublishedArticles, getSiteSettings } from '@/services/public-content.service';

export const dynamic = 'force-dynamic';

const xml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Every published version, each linked at its own language's URL. */
export async function GET() {
  const [articles, settings] = await Promise.all([getPublishedArticles({}, 1, 50), getSiteSettings('en')]);
  const base = siteUrl();
  const items = articles.items
    .map((a) => {
      const link = `${base}${localizePath(a.language, `/articles/${a.slug}`)}`;
      return `<item><title>${xml(a.title)}</title><link>${xml(link)}</link><guid>${xml(link)}</guid><description>${xml(a.excerpt)}</description><dc:language>${HTML_LANG[a.language]}</dc:language>${a.published_at ? `<pubDate>${new Date(a.published_at).toUTCString()}</pubDate>` : ''}</item>`;
    })
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${xml(settings.site.name)}</title><link>${xml(`${base}/en`)}</link><description>${xml(settings.site.description)}</description>${items}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } },
  );
}
