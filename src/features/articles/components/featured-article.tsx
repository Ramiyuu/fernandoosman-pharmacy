import Link from 'next/link';
import { ViewTransition } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { getI18n } from '@/i18n/server';
import type { ArticleCard } from '@/types/content';

import { ArticleMeta } from './article-meta';
import { CoverImage } from './cover-image';

export async function FeaturedArticle({ article, fallbackAuthor }: { article: ArticleCard; fallbackAuthor: string }) {
  const { t, href } = await getI18n();
  const url = href(`/articles/${article.slug}`);
  return (
    <article
      data-spotlight
      className="featured-publication grid items-center gap-8 rounded-xl border border-rule bg-azure-50 p-4 sm:p-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:p-8"
    >
      <ViewTransition name={`cover-${article.translation_group}`} share="morph" default="none">
        <CoverImage
          bucket="article-images"
          path={article.cover_image_path}
          alt={article.cover_image_alt}
          seed={article.slug}
          sizes="(min-width: 1024px) 600px, 100vw"
          className="featured-cover aspect-[16/10] rounded-lg border border-rule"
        />
      </ViewTransition>
      <div>
        <p className="text-sm font-medium text-teal-700">
          {article.category ? t.article.featuredCategory(article.category.name) : t.home.featured}
        </p>
        <h3 className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-3xl">
          <Link
            href={url}
            className="hover:underline hover:decoration-teal-500 hover:decoration-2 hover:underline-offset-4"
          >
            {article.title}
          </Link>
        </h3>
        {article.subtitle ? <p className="mt-2 font-serif text-lg text-navy-800 italic">{article.subtitle}</p> : null}
        {article.excerpt ? <p className="mt-4 leading-relaxed text-muted">{article.excerpt}</p> : null}
        <ArticleMeta
          publishedAt={article.published_at}
          readingTime={article.reading_time}
          author={article.author_name ?? fallbackAuthor}
          className="mt-5"
        />
        <Link href={url} className={buttonVariants({ variant: 'dark', className: 'mt-6' })}>
          {t.article.readArticle}
        </Link>
      </div>
    </article>
  );
}
