import { Fragment } from 'react';

/**
 * ts_headline() marks matches with [[[ and ]]] (see search_content in the
 * migrations). Splitting on those markers lets us highlight with <mark>
 * without ever rendering database output as HTML.
 */
export function SearchHeadline({ text }: { text: string }) {
  const parts = text.split(/(\[\[\[.*?\]\]\])/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('[[[') && part.endsWith(']]]') ? (
          <mark key={index} className="rounded-sm bg-teal-100 px-0.5 text-ink">
            {part.slice(3, -3)}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
