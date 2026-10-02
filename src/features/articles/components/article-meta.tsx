import { CalendarDays, Clock } from 'lucide-react';

import { cn } from '@/utils/cn';
import { formatDate, languageLabel, toIsoDate } from '@/utils/format';

interface ArticleMetaProps {
  publishedAt: string | null;
  readingTime: number;
  author?: string | null;
  language?: string;
  showLanguage?: boolean;
  className?: string;
}

export function ArticleMeta({ publishedAt, readingTime, author, language, showLanguage, className }: ArticleMetaProps) {
  return (
    <dl className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted', className)}>
      {publishedAt ? (
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Published</dt>
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <dd>
            <time dateTime={toIsoDate(publishedAt)}>{formatDate(publishedAt)}</time>
          </dd>
        </div>
      ) : null}
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Reading time</dt>
        <Clock className="size-3.5" aria-hidden="true" />
        <dd>{readingTime} min read</dd>
      </div>
      {author ? (
        <div>
          <dt className="sr-only">Author</dt>
          <dd>{author}</dd>
        </div>
      ) : null}
      {showLanguage && language ? (
        <div>
          <dt className="sr-only">Language</dt>
          <dd lang={language}>{languageLabel(language)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
