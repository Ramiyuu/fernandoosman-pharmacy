import { CalendarDays, Clock } from 'lucide-react';

import { getI18n } from '@/i18n/server';
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

export async function ArticleMeta({ publishedAt, readingTime, author, language, showLanguage, className }: ArticleMetaProps) {
  const { locale, t } = await getI18n();
  return (
    <dl className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted', className)}>
      {publishedAt ? (
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">{t.article.published}</dt>
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <dd>
            <time dateTime={toIsoDate(publishedAt)}>{formatDate(publishedAt, locale)}</time>
          </dd>
        </div>
      ) : null}
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">{t.article.readingTimeLabel}</dt>
        <Clock className="size-3.5" aria-hidden="true" />
        <dd>{t.article.readingTime(readingTime)}</dd>
      </div>
      {author ? (
        <div>
          <dt className="sr-only">{t.article.author}</dt>
          <dd>{author}</dd>
        </div>
      ) : null}
      {showLanguage && language ? (
        <div>
          <dt className="sr-only">{t.article.language}</dt>
          <dd lang={language === 'pt' ? 'pt-BR' : 'en'}>{languageLabel(language)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
