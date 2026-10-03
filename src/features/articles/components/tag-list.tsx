import Link from 'next/link';

import { getI18n } from '@/i18n/server';
import type { TaxonomyRef } from '@/types/content';
import { cn } from '@/utils/cn';

export async function TagList({ tags, max, className }: { tags: TaxonomyRef[]; max?: number; className?: string }) {
  if (tags.length === 0) return null;
  const { t, href } = await getI18n();
  const visible = max ? tags.slice(0, max) : tags;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label={t.article.tags}>
      {visible.map((tag) => (
        <li key={tag.slug}>
          <Link
            href={href(`/articles?tag=${encodeURIComponent(tag.slug)}`)}
            className="relative z-10 inline-flex rounded-sm bg-mist px-1.5 py-0.5 text-xs text-navy-800 ring-1 ring-rule transition-colors ring-inset hover:bg-navy-100"
          >
            #{tag.name}
          </Link>
        </li>
      ))}
      {max && tags.length > max ? <li className="px-1 text-xs text-muted">+{tags.length - max}</li> : null}
    </ul>
  );
}
