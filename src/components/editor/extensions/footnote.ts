import { Node } from '@tiptap/core';
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { id: { default: '' }, text: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'sup[data-footnote]' }];
  },
  renderHTML({ node }) {
    return ['sup', { 'data-footnote': node.attrs.id, title: node.attrs.text }, '†'];
  },
});
