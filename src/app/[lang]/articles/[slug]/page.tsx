import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { ViewTracker } from '@/components/content/view-tracker';
import { JsonLd } from '@/components/seo/json-ld';
import { ArticleView } from '@/features/articles/components/article-view';
import { isLocale, type Locale } from '@/i18n/config';
import { localizePath } from '@/i18n/routing';
import { getDictionary } from '@/i18n/server';
import { buildMetadata, truncate } from '@/lib/seo/metadata';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { publicImageUrl } from '@/lib/storage/public-url';
import { getArticleBySlug, getSiteProfile } from '@/services/public-content.service';
import { isValidSlug } from '@/utils/slugify';

async function loadArticle(slug: string, locale: Locale) {
  return isValidSlug(slug) ? getArticleBySlug(slug, locale) : null;
}

export async function generateMetadata({ params }: PageProps<'/[lang]/articles/[slug]'>): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const article = await loadArticle(slug, lang);
  if (!article) return { title: getDictionary(lang).articles.notFound, robots: { index: false } };

  const profile = await getSiteProfile(lang);
  const own = `/articles/${article.slug}`;
  const other = article.language === 'en' ? 'pt' : 'en';
  // Each version is indexed once, at its own language's URL; a text shown in
  // the other interface (no translation yet) points its canonical there.
  return buildMetadata({
    title: article.seo_title || article.title,
    description: truncate(article.seo_description || article.excerpt || article.subtitle || article.title),
    path: own,
    locale: article.language,
    alternates: {
      [article.language]: own,
      [other]: article.translation ? `/articles/${article.translation.slug}` : null,
    },
    type: 'article',
    image: publicImageUrl('article-images', article.og_image_path),
    publishedTime: article.published_at,
    modifiedTime: article.updated_at,
    authors: [article.author_name ?? profile?.full_name ?? ''],
    tags: article.tags.map((tag) => tag.name),
  });
}

export default async function ArticlePage({ params }: PageProps<'/[lang]/articles/[slug]'>) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const article = await loadArticle(slug, lang);
  if (!article) notFound();

  // A version in the visitor's language exists: show that one.
  if (article.language !== lang && article.translation?.language === lang) {
    redirect(localizePath(lang, `/articles/${article.translation.slug}`));
  }

  const t = getDictionary(lang);
  const profile = await getSiteProfile(lang);
  const authorName = article.author_name ?? profile?.full_name ?? '';

  return (
    <>
      <ViewTracker id={article.id} kind="article_view" />
      <JsonLd data={articleJsonLd(article, authorName, article.language)} />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t.nav.home, path: '/' },
            { name: t.articles.title, path: '/articles' },
            { name: article.title, path: `/articles/${article.slug}` },
          ],
          lang,
        )}
      />
      <ArticleView article={article} authorName={authorName} />
    </>
  );
}
