import { VideoPlayer } from './video-player';
import { safeVideoSource } from '@/lib/content/video';
import { Info, Lightbulb, StickyNote, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { CALLOUT_VARIANTS, type RichTextDoc, type RichTextMark, type RichTextNode } from '@/lib/content/rich-text';
import { isAllowedContentImageUrl } from '@/lib/storage/public-url';
import { cn } from '@/utils/cn';
import { isExternalHref, safeHref } from '@/utils/url';

import { MathBlock, MathInline } from './math';

import 'katex/dist/katex.min.css';

/**
 * Allow-list renderer for stored rich text. Each node type maps to a React
 * element; anything unknown renders nothing. Text is always rendered as text
 * (React escapes it), links and images are re-validated here even though the
 * server already sanitised them on save.
 */

const CALLOUTS = {
  info: { label: 'Info', Icon: Info, className: 'border-azure-100 bg-azure-50', iconClass: 'text-azure-600' },
  note: { label: 'Note', Icon: StickyNote, className: 'border-rule bg-mist', iconClass: 'text-navy-700' },
  warning: {
    label: 'Caution',
    Icon: TriangleAlert,
    className: 'border-warning-50 bg-warning-50',
    iconClass: 'text-warning-700',
  },
  'key-point': {
    label: 'Key point',
    Icon: Lightbulb,
    className: 'border-teal-100 bg-teal-50',
    iconClass: 'text-teal-700',
  },
} as const;

type CalloutKey = keyof typeof CALLOUTS;

const attr = (node: RichTextNode, name: string) => node.attrs?.[name];
const numberAttr = (node: RichTextNode, name: string, fallback: number) => {
  const value = attr(node, name);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};
const stringAttr = (node: RichTextNode, name: string) => {
  const value = attr(node, name);
  return typeof value === 'string' ? value : '';
};

function applyMark(mark: RichTextMark, children: ReactNode, key: string): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong key={key}>{children}</strong>;
    case 'italic':
      return <em key={key}>{children}</em>;
    case 'underline':
      return <u key={key}>{children}</u>;
    case 'strike':
      return <s key={key}>{children}</s>;
    case 'code':
      return <code key={key}>{children}</code>;
    case 'subscript':
      return <sub key={key}>{children}</sub>;
    case 'superscript':
      return <sup key={key}>{children}</sup>;
    case 'link': {
      const href = safeHref(mark.attrs?.href);
      if (!href) return <Fragment key={key}>{children}</Fragment>;
      if (isExternalHref(href)) {
        return (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }
      return (
        <Link key={key} href={href}>
          {children}
        </Link>
      );
    }
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}

function renderText(node: RichTextNode, key: string): ReactNode {
  const marks = node.marks ?? [];
  // Links wrap outermost so formatting stays inside the anchor.
  const ordered = [...marks].sort((a, b) => (a.type === 'link' ? 1 : 0) - (b.type === 'link' ? 1 : 0));
  return ordered.reduce<ReactNode>(
    (children, mark, index) => applyMark(mark, children, `${key}-m${index}`),
    node.text ?? '',
  );
}

function renderChildren(node: RichTextNode, keyPrefix: string): ReactNode {
  return node.content?.map((child, index) => renderNode(child, `${keyPrefix}-${index}`));
}

function renderCitation(node: RichTextNode, key: string): ReactNode {
  const refs = stringAttr(node, 'refs')
    .split(',')
    .filter((value) => /^\d{1,3}$/.test(value));
  if (refs.length === 0) return null;
  return (
    <sup key={key} className="citation ml-0.5 font-sans text-[0.7em]">
      [
      {refs.map((ref, index) => (
        <Fragment key={ref}>
          {index > 0 ? ',' : null}
          <a href={`#ref-${ref}`} className="!no-underline" aria-label={`Reference ${ref}`}>
            {ref}
          </a>
        </Fragment>
      ))}
      ]
    </sup>
  );
}

function renderImage(node: RichTextNode, key: string): ReactNode {
  const src = stringAttr(node, 'src');
  if (!src || !isAllowedContentImageUrl(src)) return null;
  const alt = stringAttr(node, 'alt');
  const caption = stringAttr(node, 'title');
  const width = numberAttr(node, 'width', 0);
  const height = numberAttr(node, 'height', 0);

  return (
    <figure key={key} className="my-8">
      {width > 0 && height > 0 ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(min-width: 768px) 720px, 100vw"
          className="h-auto w-full rounded-lg border border-rule"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- dimensions unknown for legacy content
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-auto w-full rounded-lg border border-rule"
        />
      )}
      {caption ? <figcaption className="mt-2 font-sans text-sm text-muted">{caption}</figcaption> : null}
    </figure>
  );
}

function renderTable(node: RichTextNode, key: string): ReactNode {
  return (
    <div key={key} className="my-8 overflow-x-auto" role="region" aria-label="Table" tabIndex={0}>
      <table className="w-full border-collapse border-y-2 border-navy-900 font-sans text-[0.9375rem] leading-snug">
        <tbody>
          {node.content?.map((row, rowIndex) => (
            <tr key={`${key}-r${rowIndex}`} className="border-b border-rule last:border-b-0">
              {row.content?.map((cell, cellIndex) => {
                const Tag = cell.type === 'tableHeader' ? 'th' : 'td';
                return (
                  <Tag
                    key={`${key}-r${rowIndex}-c${cellIndex}`}
                    colSpan={numberAttr(cell, 'colspan', 1)}
                    rowSpan={numberAttr(cell, 'rowspan', 1)}
                    scope={Tag === 'th' ? 'col' : undefined}
                    className={cn(
                      'px-3 py-2.5 text-left align-top [&_p]:m-0',
                      Tag === 'th' && 'border-b border-navy-900 font-semibold text-ink',
                    )}
                  >
                    {renderChildren(cell, `${key}-r${rowIndex}-c${cellIndex}`)}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCallout(node: RichTextNode, key: string): ReactNode {
  const variant = stringAttr(node, 'variant');
  const config = CALLOUTS[(CALLOUT_VARIANTS as readonly string[]).includes(variant) ? (variant as CalloutKey) : 'info'];
  const { Icon } = config;
  return (
    <aside
      key={key}
      className={cn('my-8 rounded-lg border px-5 py-4 font-sans text-base leading-relaxed', config.className)}
    >
      <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className={cn('size-4', config.iconClass)} aria-hidden="true" />
        {config.label}
      </p>
      <div className="space-y-3 text-navy-900">{renderChildren(node, key)}</div>
    </aside>
  );
}

function renderNode(node: RichTextNode, key: string): ReactNode {
  switch (node.type) {
    case 'text':
      return <Fragment key={key}>{renderText(node, key)}</Fragment>;
    case 'paragraph':
      return <p key={key}>{renderChildren(node, key)}</p>;
    case 'heading': {
      const level = Math.min(Math.max(numberAttr(node, 'level', 2), 2), 4);
      const Tag = `h${level}` as 'h2' | 'h3' | 'h4';
      const id = stringAttr(node, 'id') || undefined;
      return (
        <Tag key={key} id={id}>
          {renderChildren(node, key)}
        </Tag>
      );
    }
    case 'bulletList':
      return <ul key={key}>{renderChildren(node, key)}</ul>;
    case 'orderedList':
      return (
        <ol key={key} start={numberAttr(node, 'start', 1)}>
          {renderChildren(node, key)}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{renderChildren(node, key)}</li>;
    case 'blockquote':
      return <blockquote key={key}>{renderChildren(node, key)}</blockquote>;
    case 'codeBlock': {
      const language = stringAttr(node, 'language');
      return (
        <pre key={key} data-language={language || undefined}>
          <code>{node.content?.map((child) => child.text ?? '').join('')}</code>
        </pre>
      );
    }
    case 'horizontalRule':
      return <hr key={key} />;
    case 'hardBreak':
      return <br key={key} />;
    case 'footnote':
      return (
        <sup key={key}>
          <a href={`#note-${stringAttr(node, 'id')}`} aria-label={`Footnote: ${stringAttr(node, 'text')}`}>
            †
          </a>
        </sup>
      );
    case 'video': {
      const src = safeVideoSource(stringAttr(node, 'src'));
      return src ? <VideoPlayer key={key} src={src} title={stringAttr(node, 'title') || 'Video'} /> : null;
    }
    case 'image':
      return renderImage(node, key);
    case 'table':
      return renderTable(node, key);
    case 'inlineMath':
      return <MathInline key={key} latex={stringAttr(node, 'latex')} />;
    case 'blockMath':
      return <MathBlock key={key} latex={stringAttr(node, 'latex')} />;
    case 'callout':
      return renderCallout(node, key);
    case 'citation':
      return renderCitation(node, key);
    default:
      return null;
  }
}

export function RichContent({ doc, className }: { doc: RichTextDoc; className?: string }) {
  const notes = new Map<string, string>();
  const collect = (nodes: RichTextNode[]) => {
    for (const node of nodes) {
      if (node.type === 'footnote') notes.set(stringAttr(node, 'id'), stringAttr(node, 'text'));
      if (node.content) collect(node.content);
    }
  };
  collect(doc.content);
  return (
    <div className={cn('article-body', className)}>
      {doc.content.map((node, index) => renderNode(node, `n${index}`))}
      {notes.size ? (
        <section aria-label="Footnotes" className="mt-12 border-t border-rule pt-5">
          <h2>Footnotes</h2>
          <ol>
            {[...notes].map(([id, text]) => (
              <li key={id} id={`note-${id}`} className="scroll-mt-24">
                {text}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
