import type { HeadingEntry } from '@/lib/content/rich-text';
import { cn } from '@/utils/cn';

export function TableOfContents({ headings, className }: { headings: HeadingEntry[]; className?: string }) {
  const items = headings.filter((heading) => heading.level <= 3);
  if (items.length < 3) return null;
  return (
    <nav aria-labelledby="toc-heading" className={cn('text-sm', className)}>
      <p id="toc-heading" className="font-semibold text-ink">
        On this page
      </p>
      <ol className="mt-3 space-y-1.5 border-l border-rule">
        {items.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                '-ml-px block border-l-2 border-transparent py-0.5 pl-3 leading-snug text-muted transition-colors hover:border-teal-500 hover:text-ink',
                heading.level === 3 && 'pl-6',
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
