import { ExternalLink, Languages } from 'lucide-react';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { RichContent } from '@/components/content/rich-content';
import { TopicIcon } from '@/components/icons/topic-icon';
import { annotateHeadings } from '@/lib/content/rich-text';
import { absoluteUrl } from '@/lib/seo/metadata';
import type { ArticleDetail } from '@/types/content';
import { doiUrl } from '@/utils/doi';
import { formatDate, languageLabel, toIsoDate } from '@/utils/format';
import { safeExternalUrl } from '@/utils/url';

import { ArticleCard } from './article-card';
import { ArticleMeta } from './article-meta';
import { AttachmentsList } from './attachments-list';
import { CoverImage } from './cover-image';
import { ReferencesList } from './references-list';
import { ShareLinks } from './share-links';
import { TableOfContents } from './table-of-contents';
import { TagList } from './tag-list';

interface ArticleViewProps {
  article: ArticleDetail;
  authorName: string;
  /** Private preview: shows private attachments and hides sharing. */
  preview?: boolean;
}

export function ArticleView({ article, authorName, preview = false }: ArticleViewProps) {
  const { doc, headings } = annotateHeadings(article.content);
  const externalUrl = safeExternalUrl(article.external_url);
  const lang = article.language === 'pt' ? 'pt-BR' : 'en';
  const wasUpdated =
    article.published_at && new Date(article.updated_at).getTime() - new Date(article.published_at).getTime() > 86_400_000;

  return (
    <article lang={lang}>
      <Container>
        <nav aria-label="Breadcrumb" className="pt-8 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/articles" className="hover:text-ink hover:underline">
                Articles
              </Link>
            </li>
            {article.topics[0] ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={`/topics/${article.topics[0].slug}`} className="hover:text-ink hover:underline">
                    {article.topics[0].name}
                  </Link>
                </li>
              </>
            ) : null}
          </ol>
        </nav>

        <header className="max-w-3xl pt-8 pb-10">
          {article.category ? <p className="text-sm font-medium text-teal-700">{article.category.name}</p> : null}
          <h1 className="mt-2 text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-ink sm:text-5xl">{article.title}</h1>
          {article.subtitle ? <p className="mt-4 font-serif text-xl text-navy-800 italic sm:text-2xl">{article.subtitle}</p> : null}
          <ArticleMeta
            publishedAt={article.published_at}
            readingTime={article.reading_time}
            author={article.author_name ?? authorName}
            language={article.language}
            showLanguage
            className="mt-6"
          />
          {wasUpdated ? (
            <p className="mt-2 text-sm text-muted">
              Updated <time dateTime={toIsoDate(article.updated_at)}>{formatDate(article.updated_at)}</time>
            </p>
          ) : null}

          {article.translation ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-md bg-azure-50 px-3 py-2 text-sm text-azure-800">
              <Languages className="size-4" aria-hidden="true" />
              <span>
                {article.translation.language === 'pt' ? 'Também disponível em ' : 'Also available in '}
                <Link
                  href={`/articles/${article.translation.slug}`}
                  hrefLang={article.translation.language === 'pt' ? 'pt-BR' : 'en'}
                  className="font-medium underline"
                >
                  {languageLabel(article.translation.language)}
                </Link>
              </span>
            </p>
          ) : null}

          {article.doi || externalUrl ? (
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-l-2 border-teal-500 pl-4 text-sm">
              <span className="w-full font-medium text-ink">Study discussed</span>
              {article.doi ? (
                <a href={doiUrl(article.doi)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-azure-700 hover:underline">
                  doi:{article.doi} <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
              {externalUrl ? (
                <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-azure-700 hover:underline">
                  View the original study <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        {article.cover_image_path ? (
          <CoverImage
            bucket="article-images"
            path={article.cover_image_path}
            alt={article.cover_image_alt}
            seed={article.slug}
            sizes="(min-width: 1280px) 1216px, 100vw"
            priority
            className="mb-12 aspect-[21/9] rounded-xl border border-rule"
          />
        ) : null}

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_15rem] xl:gap-20">
          <div className="min-w-0 max-w-prose">
            <RichContent doc={doc} />
            <AttachmentsList files={article.files} preview={preview} />
            <ReferencesList references={article.references} />

            <footer className="mt-12 flex flex-col gap-6 border-t border-rule pt-8">
              {article.topics.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">Topics</span>
                  {article.topics.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={`/topics/${topic.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-rule px-2.5 py-1 text-navy-900 hover:border-navy-700"
                    >
                      <TopicIcon name={topic.icon} className="size-3.5 text-teal-600" />
                      {topic.name}
                    </Link>
                  ))}
                </div>
              ) : null}
              <TagList tags={article.tags} />
              {preview ? null : <ShareLinks url={absoluteUrl(`/articles/${article.slug}`)} title={article.title} />}
            </footer>
          </div>

          <aside className="hidden lg:block">
            <TableOfContents headings={headings} className="sticky top-24" />
          </aside>
        </div>
      </Container>

      {article.related.length > 0 ? (
        <section aria-labelledby="related-heading" className="mt-20 border-t border-rule bg-mist py-14">
          <Container>
            <h2 id="related-heading" className="text-2xl font-semibold tracking-tight text-ink">
              Related reading
            </h2>
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {article.related.map((related) => (
                <ArticleCard key={related.id} article={related} fallbackAuthor={authorName} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </article>
  );
}
