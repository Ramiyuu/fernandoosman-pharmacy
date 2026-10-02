import { safeVideoSource } from './video';
import { slugify } from '@/utils/slugify';
import { safeHref } from '@/utils/url';

/**
 * Rich text is stored as Tiptap/ProseMirror JSON. Before saving, the server
 * rebuilds the document from scratch keeping only allow-listed node types,
 * marks and attributes (everything else is dropped). The public renderer
 * applies the same allow-list again, so stored content can never inject HTML.
 */

export const NODE_TYPES = [
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'image',
  'video',
  'footnote',
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
  'inlineMath',
  'blockMath',
  'callout',
  'citation',
] as const;

export const MARK_TYPES = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'link',
  'subscript',
  'superscript',
] as const;

export const CALLOUT_VARIANTS = ['info', 'note', 'warning', 'key-point'] as const;

export type NodeType = (typeof NODE_TYPES)[number];
export type MarkType = (typeof MARK_TYPES)[number];
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

type AttrValue = string | number | boolean | null | number[];

export interface RichTextMark {
  type: MarkType;
  attrs?: Record<string, AttrValue>;
}

export interface RichTextNode {
  type: NodeType;
  attrs?: Record<string, AttrValue>;
  content?: RichTextNode[];
  text?: string;
  marks?: RichTextMark[];
}

export interface RichTextDoc {
  type: 'doc';
  content: RichTextNode[];
}

export const EMPTY_DOC: RichTextDoc = { type: 'doc', content: [] };

const LIMITS = {
  depth: 40,
  nodes: 25_000,
  textPerNode: 20_000,
  latex: 2_000,
  attrText: 300,
};

const NODE_SET = new Set<string>(NODE_TYPES);
const MARK_SET = new Set<string>(MARK_TYPES);
const CALLOUT_SET = new Set<string>(CALLOUT_VARIANTS);

export interface SanitizeOptions {
  /** Decides whether an image src may be kept (e.g. only our own storage). */
  isAllowedImageSrc: (src: string) => boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const clampInt = (value: unknown, min: number, max: number): number | null => {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(Math.round(number), min), max);
};

const shortText = (value: unknown, max = LIMITS.attrText): string =>
  typeof value === 'string' ? value.slice(0, max) : '';

function sanitizeMarks(marks: unknown): RichTextMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const result: RichTextMark[] = [];
  const seen = new Set<string>();
  for (const mark of marks) {
    if (!isRecord(mark) || typeof mark.type !== 'string' || !MARK_SET.has(mark.type) || seen.has(mark.type)) continue;
    seen.add(mark.type);
    if (mark.type === 'link') {
      const href = safeHref(isRecord(mark.attrs) ? mark.attrs.href : undefined);
      if (href) result.push({ type: 'link', attrs: { href } });
      continue;
    }
    result.push({ type: mark.type as MarkType });
  }
  return result.length > 0 ? result : undefined;
}

function sanitizeAttrs(
  type: NodeType,
  attrs: unknown,
  options: SanitizeOptions,
): Record<string, AttrValue> | null | undefined {
  const source = isRecord(attrs) ? attrs : {};
  switch (type) {
    case 'heading': {
      const level = clampInt(source.level, 2, 4) ?? 2;
      return { level };
    }
    case 'orderedList':
      return { start: clampInt(source.start, 1, 10_000) ?? 1 };
    case 'codeBlock': {
      const language =
        typeof source.language === 'string' && /^[a-z0-9+#.-]{1,20}$/i.test(source.language) ? source.language : null;
      return { language };
    }
    case 'footnote': {
      const id = typeof source.id === 'string' && /^[a-f0-9-]{36}$/.test(source.id) ? source.id : null;
      const text = typeof source.text === 'string' ? source.text.slice(0, 1000).trim() : '';
      return id && text ? { id, text } : null;
    }
    case 'video': {
      const src = safeVideoSource(source.src);
      return src ? { src, title: shortText(source.title) } : null;
    }
    case 'image': {
      const src = typeof source.src === 'string' ? source.src.trim() : '';
      if (!src || !options.isAllowedImageSrc(src)) return null; // drop the node
      return {
        src,
        alt: shortText(source.alt),
        title: shortText(source.title),
        width: clampInt(source.width, 1, 10_000),
        height: clampInt(source.height, 1, 10_000),
      };
    }
    case 'tableCell':
    case 'tableHeader': {
      const colwidth = Array.isArray(source.colwidth)
        ? source.colwidth.map((width) => clampInt(width, 1, 4000)).filter((width): width is number => width !== null)
        : null;
      return {
        colspan: clampInt(source.colspan, 1, 20) ?? 1,
        rowspan: clampInt(source.rowspan, 1, 50) ?? 1,
        colwidth: colwidth && colwidth.length > 0 ? colwidth : null,
      };
    }
    case 'inlineMath':
    case 'blockMath': {
      const latex = typeof source.latex === 'string' ? source.latex.slice(0, LIMITS.latex) : '';
      return latex.trim() ? { latex } : null;
    }
    case 'callout': {
      const variant = typeof source.variant === 'string' && CALLOUT_SET.has(source.variant) ? source.variant : 'info';
      return { variant };
    }
    case 'citation': {
      const refs = typeof source.refs === 'string' ? source.refs.replace(/\s+/g, '') : '';
      return /^\d{1,3}(,\d{1,3}){0,9}$/.test(refs) ? { refs } : null;
    }
    default:
      return undefined;
  }
}

/**
 * Returns a clean copy of `input` containing only allow-listed structures.
 * Invalid input yields an empty document rather than an error.
 */
export function sanitizeRichText(input: unknown, options: SanitizeOptions): RichTextDoc {
  if (!isRecord(input) || input.type !== 'doc' || !Array.isArray(input.content)) return { ...EMPTY_DOC, content: [] };

  let budget = LIMITS.nodes;

  const visit = (node: unknown, depth: number): RichTextNode | null => {
    if (budget <= 0 || depth > LIMITS.depth || !isRecord(node)) return null;
    if (typeof node.type !== 'string' || !NODE_SET.has(node.type) || node.type === 'doc') return null;
    budget -= 1;
    const type = node.type as NodeType;

    if (type === 'text') {
      const text = typeof node.text === 'string' ? node.text.slice(0, LIMITS.textPerNode) : '';
      if (!text) return null;
      const marks = sanitizeMarks(node.marks);
      return marks ? { type, text, marks } : { type, text };
    }

    const attrs = sanitizeAttrs(type, node.attrs, options);
    if (attrs === null) return null;

    const result: RichTextNode = { type };
    if (attrs) result.attrs = attrs;

    if (Array.isArray(node.content)) {
      const children = node.content
        .map((child) => visit(child, depth + 1))
        .filter((child): child is RichTextNode => child !== null);
      if (children.length > 0) result.content = children;
    }

    // Containers that would be meaningless when empty are dropped.
    if (
      ['bulletList', 'orderedList', 'listItem', 'blockquote', 'table', 'tableRow', 'callout'].includes(type) &&
      !result.content
    ) {
      return null;
    }
    return result;
  };

  const content = input.content.map((node) => visit(node, 1)).filter((node): node is RichTextNode => node !== null);
  return { type: 'doc', content };
}

const BLOCK_TYPES = new Set<NodeType>([
  'paragraph',
  'heading',
  'listItem',
  'blockquote',
  'codeBlock',
  'tableCell',
  'tableHeader',
  'blockMath',
  'callout',
]);

/** Plain-text projection used for full-text search and reading time. */
export function richTextToPlainText(doc: RichTextDoc): string {
  const parts: string[] = [];
  const walk = (node: RichTextNode) => {
    if (node.type === 'text' && node.text) parts.push(node.text);
    else if (node.type === 'hardBreak') parts.push('\n');
    else if (node.type === 'inlineMath' || node.type === 'blockMath')
      parts.push(` ${String(node.attrs?.latex ?? '')} `);
    node.content?.forEach(walk);
    if (BLOCK_TYPES.has(node.type)) parts.push('\n');
  };
  doc.content.forEach(walk);
  return parts
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return matches ? matches.length : 0;
}

/** Minutes at ~220 words per minute (technical reading), minimum 1. */
export function estimateReadingTime(text: string, wordsPerMinute = 220): number {
  return Math.max(1, Math.ceil(countWords(text) / wordsPerMinute));
}

export interface HeadingEntry {
  id: string;
  text: string;
  level: number;
}

function nodeText(node: RichTextNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(nodeText).join('');
}

/**
 * Assigns stable, unique ids to headings (used for anchors and the table of
 * contents). Returns a new document plus the list of headings in order.
 */
export function annotateHeadings(doc: RichTextDoc): { doc: RichTextDoc; headings: HeadingEntry[] } {
  const used = new Map<string, number>();
  const headings: HeadingEntry[] = [];

  const visit = (node: RichTextNode): RichTextNode => {
    if (node.type === 'heading') {
      const text = nodeText(node).trim();
      const base = slugify(text, 80) || 'section';
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 2;
      headings.push({ id, text, level });
      return { ...node, attrs: { ...node.attrs, id } };
    }
    return node.content ? { ...node, content: node.content.map(visit) } : node;
  };

  return { doc: { type: 'doc', content: doc.content.map(visit) }, headings };
}

/** Narrows unknown JSON from the database to a document the renderer accepts. */
export function asRichTextDoc(value: unknown): RichTextDoc {
  return isRecord(value) && value.type === 'doc' && Array.isArray(value.content)
    ? (value as unknown as RichTextDoc)
    : { ...EMPTY_DOC, content: [] };
}
