import Link from 'next/link';
import { ViewTransition, type CSSProperties } from 'react';

import { HTML_LANG } from '@/i18n/config';
import { getI18n } from '@/i18n/server';
import type { ArticleCard as ArticleCardData } from '@/types/content';
import { cn } from '@/utils/cn';

import { ArticleMeta } from './article-meta';
import { CoverImage } from './cover-image';
import { TagList } from './tag-list';

interface ArticleCardProps {
  article: ArticleCardData;
  fallbackAuthor: string;
  headingLevel?: 'h2' | 'h3';
  /** Position in a grid, for the staggered entrance. */
  index?: number;
  className?: string;
}

/**
 * The whole card is clickable through a stretched title link; tag links sit
 * above it (z-10) so they remain individually focusable and clickable. A card
 * in the other language (no translation yet) carries a language badge.
 */
export async function ArticleCard({ article, fallbackAuthor, headingLevel = 'h3', index = 0, className }: ArticleCardProps) {
  const { locale, t, href } = await getI18n();
  const Heading = headingLevel;
  const foreign = article.language !== locale;
  return (
    <article
      data-spotlight
      data-tilt
      className={cn('publication-card group relative flex flex-col rounded-xl border border-rule bg-white p-3', className)}
      style={{ '--i': index } as CSSProperties}
    >
      <ViewTransition name={`cover-${article.translation_group}`} share="morph" default="none">
        <CoverImage
          bucket="article-images"
          path={article.cover_image_path}
          alt={article.cover_image_alt}
          seed={article.slug}
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="aspect-[16/10] rounded-lg border border-rule"
        />
      </ViewTransition>
      <div className="mt-4 flex flex-1 flex-col px-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {article.category ? <p className="text-sm font-medium text-teal-700">{article.category.name}</p> : null}
          {foreign ? (
            <span className="language-badge" lang={HTML_LANG[locale]}>
              {t.language.names[article.language]}
            </span>
          ) : null}
        </div>
        <Heading
          lang={foreign ? HTML_LANG[article.language] : undefined}
          className="mt-1 text-xl leading-snug font-semibold tracking-tight text-ink"
        >
          <Link
            href={href(`/articles/${article.slug}`)}
            className="decoration-teal-500 decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline"
          >
            {article.title}
          </Link>
        </Heading>
        {article.excerpt ? (
          <p
            lang={foreign ? HTML_LANG[article.language] : undefined}
            className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-muted"
          >
            {article.excerpt}
          </p>
        ) : null}
        <TagList tags={article.tags} max={3} className="mt-3" />
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <ArticleMeta
            publishedAt={article.published_at}
            readingTime={article.reading_time}
            author={article.author_name ?? fallbackAuthor}
          />
          {/* Visual affordance only: the stretched title link already covers the card. */}
          <span aria-hidden="true" className="card-read shrink-0 text-sm font-medium text-azure-700">
            {t.article.read}
          </span>
        </div>
      </div>
    </article>
  );
}
