import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citation: {
      insertCitation: (refs: string) => ReturnType;
    };
  }
}

/**
 * In-text citation such as [1] or [2,3], pointing at the article's numbered
 * reference list. Stored as an inline atom with a `refs` attribute.
 */
export const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      refs: {
        default: '1',
        parseHTML: (element) => (element.getAttribute('data-refs') ?? '1').replace(/[^\d,]/g, ''),
        renderHTML: (attributes) => ({ 'data-refs': attributes.refs }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-citation]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { 'data-citation': '', class: 'editor-citation' }), `[${node.attrs.refs}]`];
  },

  renderText({ node }) {
    return `[${node.attrs.refs}]`;
  },

  addCommands() {
    return {
      insertCitation:
        (refs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { refs } }),
    };
  },
});
