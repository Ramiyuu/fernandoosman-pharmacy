import { z } from 'zod';

import { imagePathSchema, optionalUrl, slugInput, uuidSchema } from './common';

const isoDate = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Use the date picker.')
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const projectInputSchema = z
  .object({
    id: uuidSchema.nullable(),
    title: z.string().trim().min(2, 'Add a title.').max(200),
    slug: slugInput,
    summary: z.string().trim().max(600),
    content: z.unknown(),
    status: z.enum(['draft', 'published', 'archived']),
    progress: z.enum(['planned', 'in_progress', 'completed']),
    cover_image_path: imagePathSchema,
    cover_image_alt: z.string().trim().max(300),
    gallery: z
      .array(
        z.object({
          path: z.string().regex(/^projects\/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif)$/, 'Invalid image.'),
          alt: z.string().trim().max(300),
        }),
      )
      .max(12),
    repository_url: optionalUrl,
    live_url: optionalUrl,
    links: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'Add a label.').max(80),
          url: z.string().trim().regex(/^https?:\/\/[^\s<>"]+$/i, 'Enter a full URL starting with https://').max(2048),
        }),
      )
      .max(10),
    technologies: z.array(z.string().trim().min(1).max(40)).max(20),
    tags: z.array(z.string().trim().min(1).max(50)).max(15),
    started_on: isoDate,
    completed_on: isoDate,
    featured: z.boolean(),
    sort_order: z.coerce.number().int().min(-1000).max(1000),
  })
  .refine((value) => !value.started_on || !value.completed_on || value.completed_on >= value.started_on, {
    message: 'The end date must be after the start date.',
    path: ['completed_on'],
  });

export type ProjectInput = z.input<typeof projectInputSchema>;
export type ProjectData = z.output<typeof projectInputSchema>;
