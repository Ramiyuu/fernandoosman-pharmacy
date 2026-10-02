import { z } from 'zod';

import {
  imagePathSchema,
  optionalDoi,
  optionalUrl,
  optionalUuid,
  slugInput,
  uuidSchema,
} from './common';

export const referenceSchema = z.object({
  title: z.string().trim().min(1, 'Every reference needs a title.').max(500),
  authors: z.string().trim().max(1000).default(''),
  journal: z.string().trim().max(300).default(''),
  year: z
    .union([z.coerce.number().int().min(1600).max(2100), z.literal(''), z.null()])
    .optional()
    .transform((value) => (typeof value === 'number' ? value : null)),
  doi: optionalDoi,
  url: optionalUrl,
  pmid: z
    .string()
    .trim()
    .regex(/^\d{0,9}$/, 'PMID must be numeric.')
    .optional()
    .transform((value) => (value ? value : null)),
});

/**
 * Everything the editor can send. `content` is validated separately by the
 * rich-text sanitizer (allow-list) inside the Server Action.
 */
export const articleInputSchema = z.object({
  id: uuidSchema.nullable(),
  title: z.string().trim().max(200, 'Use at most 200 characters.'),
  slug: slugInput,
  subtitle: z.string().trim().max(300, 'Use at most 300 characters.'),
  excerpt: z.string().trim().max(600, 'Use at most 600 characters.'),
  content: z.unknown(),
  category_id: optionalUuid,
  topic_ids: z.array(uuidSchema).max(10).default([]),
  tags: z.array(z.string().trim().min(1).max(50)).max(15, 'Use at most 15 tags.').default([]),
  language: z.enum(['en', 'pt']),
  translation_of_article_id: optionalUuid,
  featured: z.boolean(),
  doi: optionalDoi,
  external_url: optionalUrl,
  seo_title: z.string().trim().max(120, 'Use at most 120 characters.'),
  seo_description: z.string().trim().max(320, 'Use at most 320 characters.'),
  cover_image_path: imagePathSchema,
  cover_image_alt: z.string().trim().max(300),
  references: z.array(referenceSchema).max(100).default([]),
});

export type ArticleInput = z.input<typeof articleInputSchema>;
export type ArticleData = z.output<typeof articleInputSchema>;
export type ReferenceInput = z.input<typeof referenceSchema>;

export const articleStatusChangeSchema = z.object({
  id: uuidSchema,
  status: z.enum(['draft', 'published', 'archived']),
});

/** Requirements before an article can go live. */
export function publishBlockers(data: Pick<ArticleData, 'title' | 'excerpt'> & { contentText: string }): string[] {
  const problems: string[] = [];
  if (data.title.trim().length < 3) problems.push('Add a title.');
  if (data.excerpt.trim().length < 20) problems.push('Write a summary of at least 20 characters.');
  if (data.contentText.trim().length < 50) problems.push('Add some content.');
  return problems;
}

