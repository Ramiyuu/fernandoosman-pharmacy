import katex from 'katex';

/**
 * Server-side KaTeX rendering. `trust: false` disables \href, \url,
 * \includegraphics and \htmlClass-style commands, so the generated markup
 * contains only KaTeX's own spans/MathML — never author-controlled HTML.
 */
function renderLatex(latex: string, displayMode: boolean): string {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    trust: false,
    strict: 'ignore',
    maxSize: 10,
    maxExpand: 200,
    output: 'htmlAndMathml',
  });
}

export function MathInline({ latex }: { latex: string }) {
  return <span className="katex-inline" dangerouslySetInnerHTML={{ __html: renderLatex(latex, false) }} />;
}

export function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      className="my-6 overflow-x-auto rounded-lg bg-mist px-4 py-3 text-center"
      role="math"
      aria-label={latex}
      dangerouslySetInnerHTML={{ __html: renderLatex(latex, true) }}
    />
  );
}
