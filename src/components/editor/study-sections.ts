import type { JSONContent } from '@tiptap/core';

/** Standard sections of a clinical paper review (References live in their own editor). */
export const STUDY_SECTIONS = [
  'Study Overview',
  'Why this study matters',
  'Research Question',
  'Study Design',
  'Population',
  'Sample Size',
  'Intervention',
  'Comparator',
  'Primary Endpoint',
  'Secondary Endpoint',
  'Results',
  'Understanding the Numbers',
  'Statistical Analysis',
  'Clinical Relevance',
  'Limitations',
  'My Takeaways',
] as const;

export function sectionContent(title: string): JSONContent[] {
  return [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: title }] }, { type: 'paragraph' }];
}

export function studyReviewTemplate(): JSONContent[] {
  return STUDY_SECTIONS.flatMap(sectionContent);
}
