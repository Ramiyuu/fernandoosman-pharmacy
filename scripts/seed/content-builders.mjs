// Small helpers to author Tiptap/ProseMirror JSON documents for the seed data.
// The output uses exactly the node and mark types accepted by
// src/schemas/rich-content.schema.ts.

export const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value });

const toInline = (part) => (typeof part === 'string' ? text(part) : part);

export const bold = (value) => text(value, [{ type: 'bold' }]);
export const italic = (value) => text(value, [{ type: 'italic' }]);
export const link = (value, href) => text(value, [{ type: 'link', attrs: { href } }]);
export const inlineMath = (latex) => ({ type: 'inlineMath', attrs: { latex } });
export const cite = (...numbers) => ({ type: 'citation', attrs: { refs: numbers.join(',') } });

export const p = (...parts) => ({ type: 'paragraph', content: parts.map(toInline) });
export const h2 = (value) => ({ type: 'heading', attrs: { level: 2 }, content: [text(value)] });
export const h3 = (value) => ({ type: 'heading', attrs: { level: 3 }, content: [text(value)] });

const listItem = (item) => ({
  type: 'listItem',
  content: [p(...(Array.isArray(item) ? item : [item]))],
});
export const ul = (...items) => ({ type: 'bulletList', content: items.map(listItem) });
export const ol = (...items) => ({ type: 'orderedList', attrs: { start: 1 }, content: items.map(listItem) });

export const quote = (...parts) => ({ type: 'blockquote', content: [p(...parts)] });
export const callout = (variant, ...blocks) => ({ type: 'callout', attrs: { variant }, content: blocks });
export const math = (latex) => ({ type: 'blockMath', attrs: { latex } });
export const hr = () => ({ type: 'horizontalRule' });

const cell = (type, value) => ({
  type,
  attrs: { colspan: 1, rowspan: 1, colwidth: null },
  content: [p(...(Array.isArray(value) ? value : [value]))],
});
export const table = (header, rows) => ({
  type: 'table',
  content: [
    { type: 'tableRow', content: header.map((value) => cell('tableHeader', value)) },
    ...rows.map((row) => ({ type: 'tableRow', content: row.map((value) => cell('tableCell', value)) })),
  ],
});

export const doc = (...blocks) => ({ type: 'doc', content: blocks });
