import type { ArticleReference } from '@/types/content';
import { doiUrl, pubmedUrl } from '@/utils/doi';
import { safeExternalUrl } from '@/utils/url';

/** Numbered reference list (Vancouver-like). Anchors #ref-N are targets for in-text citations. */
export function ReferencesList({ references }: { references: ArticleReference[] }) {
  if (references.length === 0) return null;
  return (
    <section aria-labelledby="references-heading" className="mt-16 border-t border-rule pt-8">
      <h2 id="references-heading" className="text-xl font-semibold text-ink">
        References
      </h2>
      <ol className="mt-5 space-y-4 text-[0.9375rem] leading-relaxed text-navy-900">
        {references.map((reference, index) => {
          const url = safeExternalUrl(reference.url);
          const pubmed = reference.pmid ? pubmedUrl(reference.pmid) : null;
          return (
            <li key={reference.id ?? index} id={`ref-${index + 1}`} className="grid scroll-mt-24 grid-cols-[2rem_1fr] gap-2">
              <span className="text-muted tabular">{index + 1}.</span>
              <div>
                {reference.authors ? <span>{reference.authors}. </span> : null}
                <span className="font-medium">{reference.title}.</span>{' '}
                {reference.journal ? <em>{reference.journal}</em> : null}
                {reference.year ? <span>{reference.journal ? '. ' : ''}{reference.year}.</span> : null}
                <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {reference.doi ? (
                    <a href={doiUrl(reference.doi)} target="_blank" rel="noopener noreferrer" className="text-azure-700 hover:underline">
                      doi:{reference.doi}
                    </a>
                  ) : null}
                  {pubmed ? (
                    <a href={pubmed} target="_blank" rel="noopener noreferrer" className="text-azure-700 hover:underline">
                      PubMed {reference.pmid}
                    </a>
                  ) : null}
                  {url && !reference.doi ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-azure-700 hover:underline">
                      {new URL(url).hostname}
                    </a>
                  ) : null}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
