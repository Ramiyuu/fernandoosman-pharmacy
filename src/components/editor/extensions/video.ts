import { Node, mergeAttributes } from '@tiptap/core';
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return { src: { default: null }, title: { default: 'Video' } };
  },
  parseHTML() {
    return [{ tag: 'div[data-video]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-video': '', class: 'rounded-lg border border-rule bg-mist p-5' }),
      `Video: ${HTMLAttributes.title || HTMLAttributes.src}`,
    ];
  },
});
