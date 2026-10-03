import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { getI18n } from '@/i18n/server';
import { cn } from '@/utils/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the href for a page number (page 1 should have no ?page param). */
  hrefFor: (page: number) => string;
  className?: string;
}

function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  for (const [index, value] of sorted.entries()) {
    if (index > 0 && value - sorted[index - 1] > 1) result.push('gap');
    result.push(value);
  }
  return result;
}

/** Plain links (crawlable, works without JavaScript). */
export async function Pagination({ page, totalPages, hrefFor, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const { t } = await getI18n();
  const linkClass =
    'inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md px-3 text-sm text-navy-900 transition-colors hover:bg-navy-50';

  return (
    <nav aria-label={t.pagination.label} className={cn('flex items-center justify-center gap-1', className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={linkClass}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>{t.pagination.previous}</span>
        </Link>
      ) : null}
      <ul className="hidden items-center gap-1 sm:flex">
        {pageWindow(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} className="px-2 text-muted" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={t.pagination.page(item)}
                className={cn(linkClass, 'tabular', item === page && 'bg-navy-900 text-white hover:bg-navy-900')}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ul>
      <p className="px-3 text-sm text-muted tabular sm:hidden">
        {t.pagination.pageOf(page, totalPages)}
      </p>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={linkClass}>
          <span>{t.pagination.next}</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}
