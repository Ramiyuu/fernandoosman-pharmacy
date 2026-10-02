import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type { ArticleCard } from '@/types/content';

import { ArticleMeta } from './article-meta';
import { CoverImage } from './cover-image';

export function FeaturedArticle({ article, fallbackAuthor }: { article: ArticleCard; fallbackAuthor: string }) {
  return (
    <article className="grid items-center gap-8 rounded-xl border border-rule bg-white p-4 sm:p-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:p-8">
      <CoverImage
        bucket="article-images"
        path={article.cover_image_path}
        alt={article.cover_image_alt}
        seed={article.slug}
        sizes="(min-width: 1024px) 600px, 100vw"
        className="aspect-[16/10] rounded-lg border border-rule"
      />
      <div>
        <p className="text-sm font-medium text-teal-700">
          Featured{article.category ? ` ${article.category.name.toLowerCase()}` : ' article'}
        </p>
        <h3 className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-3xl">
          <Link href={`/articles/${article.slug}`} className="hover:underline hover:decoration-teal-500 hover:decoration-2 hover:underline-offset-4">
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
        <Link href={`/articles/${article.slug}`} className={buttonVariants({ variant: 'dark', className: 'mt-6' })}>
          Read article
        </Link>
      </div>
    </article>
  );
}
