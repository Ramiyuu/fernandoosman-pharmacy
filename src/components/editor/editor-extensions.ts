import Image from '@tiptap/extension-image';
import { Mathematics } from '@tiptap/extension-mathematics';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';

import { safeHref } from '@/utils/url';

import { Callout } from './extensions/callout';
import { Citation } from './extensions/citation';

interface ExtensionOptions {
  placeholder: string;
  onEditMath?: (kind: 'inline' | 'block', latex: string, pos: number) => void;
}

/**
 * The editor schema. It matches the server allow-list in
 * src/lib/content/rich-text.ts; anything outside it is dropped on save.
 */
export function createEditorExtensions({ placeholder, onEditMath }: ExtensionOptions) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto'],
        isAllowedUri: (url) => safeHref(url) !== null,
        HTMLAttributes: { rel: 'noopener noreferrer', target: null },
      },
    }),
    Subscript,
    Superscript,
    Image.configure({ inline: false, allowBase64: false }),
    TableKit.configure({ table: { resizable: false } }),
    Mathematics.configure({
      katexOptions: { throwOnError: false, trust: false, strict: 'ignore' },
      inlineOptions: { onClick: (node, pos) => onEditMath?.('inline', String(node.attrs.latex ?? ''), pos) },
      blockOptions: { onClick: (node, pos) => onEditMath?.('block', String(node.attrs.latex ?? ''), pos) },
    }),
    Callout,
    Citation,
    Placeholder.configure({ placeholder }),
    CharacterCount,
  ];
}
