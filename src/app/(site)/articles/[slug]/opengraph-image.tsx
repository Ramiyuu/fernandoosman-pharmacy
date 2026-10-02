import { OG_SIZE, renderOgCard } from '@/lib/seo/og-card';
import { getArticleBySlug, getSiteSettings } from '@/services/public-content.service';
import { isValidSlug } from '@/utils/slugify';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Article cover';
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, settings] = await Promise.all([isValidSlug(slug) ? getArticleBySlug(slug) : null, getSiteSettings()]);
  return renderOgCard({
    eyebrow: article?.category?.name ?? 'Article',
    title: article?.title ?? settings.site.name,
    footer: `${settings.site.name}  ·  ${article ? `${article.reading_time} min read` : 'Pharmacy, clinical research and data'}`,
  });
}
